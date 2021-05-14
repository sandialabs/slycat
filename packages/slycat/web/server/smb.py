import tempfile
import threading
import time
import uuid
from smb.SMBConnection import SMBConnection
import socket
import logging
import datetime
import cherrypy
import slycat.mime_type
session_cache = {}
session_cache_lock = threading.Lock()

class Smb(object):
    """
    usage:
    smb = Smb('user', 'password', 'server', 'share_name')
    """
    def __init__(self, username, password, server, share, domain='', port=445):
        # setup data
        self.domain    = str(domain)
        self.username  = str(username)
        self.password  = str(password)
        self.client    = socket.gethostname()
        self.server    = str(server)
        self.server_ip = socket.gethostbyname(server)
        self.share     = str(share)
        self.port      = port
        self.conn      = None
        self.connected = False
        # SMB.SMBConnection logs too much
        smb_logger = logging.getLogger('SMB.SMBConnection')
        smb_logger.setLevel(logging.INFO)

    def connect(self):
        try:
            self.conn = SMBConnection(self.username, self.password,
                                      self.client, self.server,
                                      is_direct_tcp=True)
            self.connected = self.conn.connect(self.server_ip, self.port)
            cherrypy.log.error('Connected to %s smb server' % self.server)
            return self.connected
        except Exception as e:
            cherrypy.log.error('Connect failed. Reason: %s', e)
            return False

    def list_shares(self):
        try:
            shares_list = self.conn.listShares()  # obtain a list of shares
            for share in shares_list:  # iterate through the list of shares
                cherrypy.log.error("  Share=", share.name)
        except Exception as e:
            cherrypy.log.error(str(e))
            cherrypy.log.error('### can not list shares')
    
    def list_path(self, share=None, path='/'):
        if share is None:
            share=self.share
        try:
            for sub_share in sorted(self.conn.listPath(share,path), key=lambda item: item.filename):
                cherrypy.log.error("    File=", sub_share.filename)
                cherrypy.log.error("    Fileinfo= %s" % hex(sub_share.file_attributes))
                cherrypy.log.error("    File isdir= %s" % sub_share.isDirectory)
        except Exception as e:
            cherrypy.log.error(str(e))
            cherrypy.log.error('### can not list shares')

    def list_Attributes(self, share=None, path='/'):
        if share is None:
            cherrypy.log.error('getting %s'%path)
            share=self.share
        try:
            return self.conn.getAttributes(share,path)
        except Exception as e:
            cherrypy.log.error(str(e))
            cherrypy.log.error('### can not list shares')
            return None

    # Handle the 'browse' command.
    def browse(self, share=None, path='/'):
        if share is None:
            share=self.share
        if path is None:
            raise Exception("Missing path.")

        listing = {
            "path": path,
            "names": [],
            "sizes": [],
            "types": [],
            "mtimes": [],
            "mime-types": [],
        }

        for sub_share in sorted(self.conn.listPath(share,path), key=lambda item: item.filename):
            cherrypy.log.error("    File=", sub_share.filename)
            cherrypy.log.error("    Fileinfo= %s" % hex(sub_share.file_attributes))
            cherrypy.log.error("    File isdir= %s" % sub_share.isDirectory)
            ftype = "d" if sub_share.isDirectory else "f"
            if ftype == "d":
                mime_type = "application/x-directory"
            else:
                mime_type = slycat.mime_type.guess_type(sub_share.filename)[0]

            listing["names"].append(sub_share.filename)
            listing["sizes"].append(sub_share.file_size)
            listing["types"].append(ftype)
            listing["mtimes"].append(datetime.datetime.fromtimestamp(sub_share.last_write_time).isoformat())
            listing["mime-types"].append(mime_type)

        return listing

def create_session(username, password, server, share):
    """
    Create a cached smb remote session for the given host.

    Parameters
    ----------
    username : string
      Username for ssh authentication.
    password : string
      Password for ssh authentication.
    server : string
      server that the share is connected to
    share : string
      share name that is being connected to

    Returns
    -------
    smb_id : string
      A unique session identifier.
    """
    _start_session_cleanup_worker()
    smb_id = uuid.uuid4().hex
    try:
        with session_cache_lock:
            cherrypy.log.error("create the seesion and add it to the session_cache")
            session_cache[smb_id] = Smb(username, password, server, share)
        return smb_id
    except Exception as e:
        cherrypy.log.error("Unknown exception for %s@%s: %s %s" % (username, server, type(e), str(e)))
        cherrypy.log.error("slycat.web.server.smb.py create_session",
                                "cherrypy.HTTPError 500 unknown exception for %s@%s: %s %s." % (
                                    username, server, type(e), str(e)))
        raise cherrypy.HTTPError("401 Remote connection failed: %s" % str(e))

def _expire_session(sid):
    """
    Test an existing session to see if it is expired.

    Assumes that the caller already holds session_cache_lock.
    """
    if sid in session_cache:
        now = datetime.datetime.utcnow()
        session = session_cache[sid]
        if now - session.accessed > slycat.web.server.config["slycat-web-server"]["remote-session-timeout"]:
            cherrypy.log.error(
                "Timing-out remote session for %s@%s from %s" % (session.username, session.hostname, session.client))
            try:    
              session_cache[sid].close()
            except Exception as e:
              pass
            del session_cache[sid]

def _session_monitor():
    while True:
        cherrypy.log.error("Remote session cleanup worker running.")
        with session_cache_lock:
            for sid in list(session_cache.keys()):  # We make an explicit copy of the keys because we may be modifying the dict contents
                _expire_session(sid)
        cherrypy.log.error("Remote SMB session cleanup worker finished.")
        time.sleep(datetime.timedelta(minutes=15).total_seconds())

def _start_session_cleanup_worker():
    if _start_session_cleanup_worker.thread is None:
        cherrypy.log.error("Starting remote SMB session cleanup worker.")
        _start_session_cleanup_worker.thread = threading.Thread(name="SMB Monitor", target=_session_monitor)
        _start_session_cleanup_worker.thread.daemon = True
        _start_session_cleanup_worker.thread.start()


_start_session_cleanup_worker.thread = None

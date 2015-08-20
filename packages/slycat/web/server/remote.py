# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Functions for managing cached remote ssh sessions.

Slycat makes extensive use of ssh and the `Slycat Agent` to access remote
resources located on the high performance computing platforms used to generate
ensembles.  This module provides functionality to create cached remote ssh /
agent sessions that can be used to retrieve data from remote hosts.  This
functionality is used in a variety of ways:

* Web clients can browse the filesystem of a remote host.
* Web clients can create a Slycat model using data stored on a remote host.
* Web clients can retrieve images on a remote host (an essential part of the :ref:`parameter-image-model`).
* Web clients can retrieve video compressed from still images on a remote host.

When a remote session is created, a connection to the remote host over ssh is
created, an agent is started (only if the required configuration is present),
and a unique session identifier is returned.  Callers use the session id to
retrieve the cached session and communicate with the remote host / agent.  A
"last access" time for each session is maintained and updated whenever the
cached session is accessed.  If a session times-out (a threshold amount of time
has elapsed since the last access) it is automatically deleted, and subsequent
use of the expired session id will fail.

Each session is bound to the IP address of the client that created it - only
the same client IP address is allowed to access the session.
"""

import cherrypy
import datetime
import hashlib
import json
import os
import paramiko
import slycat.mime_type
import slycat.web.server.authentication
import slycat.web.server.database
import slycat.web.server.streaming
import stat
import sys
import threading
import time
import uuid

def cache_object(pid, key, content_type, content):
  cherrypy.log.error("cache_object %s %s %s" % (pid, key, content_type))
  database = slycat.web.server.database.couchdb.connect()
  project = database.get("project", pid)
  slycat.web.server.authentication.require_project_reader(project)

  lookup = pid + "-" + key
  for cache_object in database.scan("slycat/project-key-cache-objects", startkey=lookup, endkey=lookup):
    database.put_attachment(cache_object, filename="content", content_type=content_type, content=content)
    return

  cache_object = {
    "_id": uuid.uuid4().hex,
    "type": "cache-object",
    "project": pid,
    "key": key,
    "created": datetime.datetime.utcnow().isoformat(),
    "creator": cherrypy.request.login,
  }
  database.save(cache_object)
  database.put_attachment(cache_object, filename="content", content_type=content_type, content=content)

session_cache = {}
session_cache_lock = threading.Lock()

class Session(object):
  """Encapsulates an open session connected to a remote host.

  Examples
  --------

  Calling threads must serialize access to the Session object.  To facilitate this,
  a Session is a context manager - callers should always use a `with statement` when
  accessing a session:

  >>> with slycat.web.server.remote.get_session(sid) as session:
  ...   print session.username

  """
  def __init__(self, client, username, hostname, ssh, sftp, agent=None):
    now = datetime.datetime.utcnow()
    self._client = client
    self._username = username
    self._hostname = hostname
    self._ssh = ssh
    self._sftp = sftp
    self._agent = agent
    self._created = now
    self._accessed = now
    self._lock = threading.Lock()
  def __enter__(self):
    self._lock.__enter__()
    return self
  def __exit__(self, exc_type, exc_value, traceback):
    return self._lock.__exit__(exc_type, exc_value, traceback)
  @property
  def client(self):
    """Return the IP address of the client that created the session."""
    return self._client
  @property
  def username(self):
    """Return the username used to create the session."""
    return self._username
  @property
  def hostname(self):
    """Return the remote hostname accessed by the session."""
    return self._hostname
  @property
  def sftp(self):
    return self._sftp
  @property
  def accessed(self):
    """Return the time the session was last accessed."""
    return self._accessed

  def close(self):
    if self._agent is not None:
      cherrypy.log.error("Instructing remote agent for %s@%s from %s to shutdown." % (self.username, self.hostname, self.client))
      stdin, stdout, stderr = self._agent
      command = {"action":"exit"}
      stdin.write("%s\n" % json.dumps(command))
      stdin.flush()

    self._sftp.close()
    self._ssh.close()

  def submit_batch(self, filename):
    # launch via the agent...
    if self._agent is not None:
      stdin, stdout, stderr = self._agent
      payload = { "action": "submit-batch", "command": filename }

      stdin.write("%s\n" % json.dumps(payload))
      stdin.flush()

      response = json.loads(stdout.readline())
      if not response["ok"]:
        cherrypy.response.headers["x-slycat-message"] = response["message"]
        raise cherrypy.HTTPError(400)

      # parses out the job ID
      jid = [int(s) for s in response["output"].split() if s.isdigit()][0]

      return { "filename": response["filename"], "jid": jid, "errors": response["errors"] }
    else:
      cherrypy.response.headers["x-slycat-message"] = "No Slycat agent present on remote host."
      raise cherrypy.HTTPError(500)

  def checkjob(self, jid):
    # launch via the agent...
    if self._agent is not None:
      stdin, stdout, stderr = self._agent
      payload = { "action": "checkjob", "command": jid }

      stdin.write("%s\n" % json.dumps(payload))
      stdin.flush()

      response = json.loads(stdout.readline())
      if not response["ok"]:
        cherrypy.response.headers["x-slycat-message"] = reponse["message"]
        raise cherrypy.HTTPError(400)

      # parses the useful information from job status
      out = response["output"]
      # arranges items from scontrol show into a flat list
      # items are formatted as: item_name=value
      out = sum([s.strip().split() for s in out.splitlines()], [])
      js = [s.split('=')[1] for s in out if s.split('=')[0] == 'JobState'][0]

      status = {
        "state": js
      }

      return { "jid": response["jid"], "status": status, "errors": response["errors"] }
    else:
      cherrypy.response.headers["x-slycat-message"] = "No Slycat agent present on remote host."
      raise cherrypy.HTTPError(500)

  def get_job_output(self, jid, path):
    # launch via the agent...
    if self._agent is not None:
      stdin, stdout, stderr = self._agent
      payload = { "action": "get-job-output", "command": { "jid": jid, "path": path } }

      stdin.write("%s\n" % json.dumps(payload))
      stdin.flush()

      response = json.loads(stdout.readline())
      if not response["ok"]:
        cherrypy.response.headers["x-slycat-message"] = response["message"]
        raise cherrypy.HTTPError(400)
      return { "jid": response["jid"], "output": response["output"], "errors": response["errors"] }
    else:
      cherrypy.response.headers["x-slycat-message"] = "No Slycat agent present on remote host."
      raise cherrypy.HTTPError(500)

  def launch(self, command):
    # launch via the agent...
    if self._agent is not None:
      stdin, stdout, stderr = self._agent

      payload = { "action": "launch", "command": command }

      stdin.write("%s\n" % json.dumps(payload))
      stdin.flush()

      response = json.loads(stdout.readline())
      if not response["ok"]:
        cherrypy.response.headers["x-slycat-message"] = response["message"]
        raise cherrypy.HTTPError(400)
      return { "command": response["command"], "output": response["output"], "errors": response["errors"] }

    # launch via ssh...
    try:
      stdin, stdout, stderr = self._ssh.exec_command(command)
      response = { "command": command, "output": str(stdout.readlines()) }
      return response
    except paramiko.SSHException as e:
      cherrypy.response.headers["x-slycat-message"] = str(e)
      raise cherrypy.HTTPError(500)
    except Exception as e:
      cherrypy.response.headers["x-slycat-message"] = str(e)
      raise cherrypy.HTTPError(400)


  def browse(self, path, file_reject, file_allow, directory_reject, directory_allow):
    # Use the agent to browse.
    if self._agent is not None:
      stdin, stdout, stderr = self._agent
      command = {"action":"browse", "path":path}
      if file_reject is not None:
        command["file-reject"] = file_reject
      if file_allow is not None:
        command["file-allow"] = file_allow
      if directory_reject is not None:
        command["directory-reject"] = directory_reject
      if directory_allow is not None:
        command["directory-allow"] = directory_allow

      stdin.write("%s\n" % json.dumps(command))
      stdin.flush()
      response = json.loads(stdout.readline())
      if not response["ok"]:
        cherrypy.response.headers["x-slycat-message"] = response["message"]
        raise cherrypy.HTTPError(400)
      return {"path": response["path"], "names": response["names"], "sizes": response["sizes"], "types": response["types"], "mtimes": response["mtimes"], "mime-types": response["mime-types"]}

    # Use sftp to browse.
    try:
      names = []
      sizes = []
      types = []
      mtimes = []
      mime_types = []

      for attribute in sorted(self._sftp.listdir_attr(path), key=lambda x: x.filename):
        filepath = os.path.join(path, attribute.filename)
        filetype = "d" if stat.S_ISDIR(attribute.st_mode) else "f"

        if filetype == "d":
          if directory_reject is not None and directory_reject.search(filepath) is not None:
            if directory_allow is None or directory_allow.search(filepath) is None:
              continue

        if filetype == "f":
          if file_reject is not None and file_reject.search(filepath) is not None:
            if file_allow is None or file_allow.search(filepath) is None:
              continue

        if filetype == "d":
          mime_type = "application/x-directory"
        else:
          mime_type = slycat.mime_type.guess_type(path)[0]

        names.append(attribute.filename)
        sizes.append(attribute.st_size)
        types.append(filetype)
        mtimes.append(datetime.datetime.fromtimestamp(attribute.st_mtime).isoformat())
        mime_types.append(mime_type)

      response = {"path": path, "names": names, "sizes": sizes, "types": types, "mtimes": mtimes, "mime-types": mime_types}
      return response
    except Exception as e:
      cherrypy.response.headers["x-slycat-message"] = str(e)
      raise cherrypy.HTTPError(400)

  def get_file(self, path, **kwargs):
    cache = kwargs.get("cache", None)
    project = kwargs.get("project", None)
    key = kwargs.get("key", None)

    # Sanity-check arguments.
    if cache not in [None, "project"]:
      raise cherrypy.HTTPError("400 Unknown cache type: %s." % cache)
    if cache is not None:
      if project is None:
        raise cherrypy.HTTPError("400 Must specify project id.")
      if key is None:
        raise cherrypy.HTTPError("400 Must specify cache key.")

    # Use the agent to retrieve a file.
    if self._agent is not None:
      stdin, stdout, stderr = self._agent
      stdin.write("%s\n" % json.dumps({"action":"get-file", "path":path}))
      stdin.flush()
      metadata = json.loads(stdout.readline())

      if metadata["message"] == "Path must be absolute.":
        cherrypy.response.headers["x-slycat-message"] = "Remote path %s:%s is not absolute." % (self.hostname, path)
        raise cherrypy.HTTPError("400 Path not absolute.")
      elif metadata["message"] == "Path not found.":
        cherrypy.response.headers["x-slycat-message"] = "The remote file %s:%s does not exist." % (self.hostname, path)
        raise cherrypy.HTTPError("400 File not found.")
      elif metadata["message"] == "Directory unreadable.":
        cherrypy.response.headers["x-slycat-message"] = "Remote path %s:%s is a directory." % (self.hostname, path)
        raise cherrypy.HTTPError("400 Can't read directory.")
      elif metadata["message"] == "Access denied.":
        cherrypy.response.headers["x-slycat-message"] = "You do not have permission to retrieve %s:%s" % (self.hostname, path)
        cherrypy.response.headers["x-slycat-hint"] = "Check the filesystem on %s to verify that your user has access to %s, and don't forget to set appropriate permissions on all the parent directories!" % (self.hostname, path)
        raise cherrypy.HTTPError("400 Access denied.")

      content_type = metadata["content-type"]
      content = stdout.read(metadata["size"])

      if cache == "project":
        cache_object(project, key, content_type, content)

      cherrypy.response.headers["content-type"] = content_type
      return content

    # Use sftp to retrieve a file.
    try:
      if stat.S_ISDIR(self._sftp.stat(path).st_mode):
        cherrypy.response.headers["x-slycat-message"] = "Remote path %s:%s is a directory." % (self.hostname, path)
        raise cherrypy.HTTPError("400 Can't read directory.")

      content_type, encoding = slycat.mime_type.guess_type(path)
      if content_type is None:
        content_type = "application/octet-stream"
      content = self._sftp.file(path).read()

      if cache == "project":
        cache_object(project, key, content_type, content)

      cherrypy.response.headers["content-type"] = content_type
      return content

    except Exception as e:
      cherrypy.log.error("Exception reading remote file %s: %s %s" % (path, type(e), str(e)))

      if str(e) == "Garbage packet received":
        cherrypy.response.headers["x-slycat-message"] = "Remote access failed: %s" % str(e)
        raise cherrypy.HTTPError("500 Remote access failed.")

      if e.strerror == "No such file":
        # Ideally this would be a 404, but we already use 404 to handle an unknown sessions, and clients need to make the distinction.
        cherrypy.response.headers["x-slycat-message"] = "The remote file %s:%s does not exist." % (self.hostname, path)
        raise cherrypy.HTTPError("400 File not found.")

      if e.strerror == "Permission denied":
        # The file exists, but is not available due to access controls
        cherrypy.response.headers["x-slycat-message"] = "You do not have permission to retrieve %s:%s" % (self.hostname, path)
        cherrypy.response.headers["x-slycat-hint"] = "Check the filesystem on %s to verify that your user has access to %s, and don't forget to set appropriate permissions on all the parent directories!" % (self.hostname, path)
        raise cherrypy.HTTPError("400 Access denied.")

      # Catchall
      cherrypy.response.headers["x-slycat-message"] = "Remote access failed: %s" % str(e)
      raise cherrypy.HTTPError("400 Remote access failed.")

  def get_image(self, path, **kwargs):
    content_type = kwargs.get("content-type", None)
    max_size = kwargs.get("max-size", None)
    max_width = kwargs.get("max-width", None)
    max_height = kwargs.get("max-height", None)

    cache = kwargs.get("cache", None)
    project = kwargs.get("project", None)
    key = kwargs.get("key", None)

    # Sanity-check arguments.
    if cache not in [None, "project"]:
      raise cherrypy.HTTPError("400 Unknown cache type: %s." % cache)
    if cache is not None:
      if project is None:
        raise cherrypy.HTTPError("400 Must specify project id.")
      if key is None:
        raise cherrypy.HTTPError("400 Must specify cache key.")

    if not self._agent:
      cherrypy.response.headers["x-slycat-message"] = "No agent for %s." % (self.hostname)
      cherrypy.response.headers["x-slycat-hint"] = "Ask your system administrator to setup slycat-agent on %s" % (self.hostname)
      raise cherrypy.HTTPError("400 Agent required.")

    # Use the agent to retrieve an image.
    stdin, stdout, stderr = self._agent

    command = {"action":"get-image", "path":path}
    if content_type is not None:
      command["content-type"] = content_type
    if max_size is not None:
      command["max-size"] = max_size
    if max_width is not None:
      command["max-width"] = max_width
    if max_height is not None:
      command["max-height"] = max_height

    stdin.write("%s\n" % json.dumps(command))
    stdin.flush()
    metadata = json.loads(stdout.readline())

    if metadata["message"] == "Path must be absolute.":
      cherrypy.response.headers["x-slycat-message"] = "Remote path %s:%s is not absolute." % (self.hostname, path)
      raise cherrypy.HTTPError("400 Path not absolute.")
    elif metadata["message"] == "Path not found.":
      cherrypy.response.headers["x-slycat-message"] = "The remote file %s:%s does not exist." % (self.hostname, path)
      raise cherrypy.HTTPError("400 File not found.")
    elif metadata["message"] == "Directory unreadable.":
      cherrypy.response.headers["x-slycat-message"] = "Remote path %s:%s is a directory." % (self.hostname, path)
      raise cherrypy.HTTPError("400 Can't read directory.")
    elif metadata["message"] == "Access denied.":
      cherrypy.response.headers["x-slycat-message"] = "You do not have permission to retrieve %s:%s" % (self.hostname, path)
      cherrypy.response.headers["x-slycat-hint"] = "Check the filesystem on %s to verify that your user has access to %s, and don't forget to set appropriate permissions on all the parent directories!" % (self.hostname, path)
      raise cherrypy.HTTPError("400 Access denied.")

    content_type = metadata["content-type"]
    content = stdout.read(metadata["size"])

    if cache == "project":
      cache_object(project, key, content_type, content)

    cherrypy.response.headers["content-type"] = content_type
    return content

  def post_video(self, content_type, images):
    if not self._agent:
      cherrypy.response.headers["x-slycat-message"] = "No agent for %s." % (self.hostname)
      cherrypy.response.headers["x-slycat-hint"] = "Ask your system administrator to setup slycat-agent on %s" % (self.hostname)
      raise cherrypy.HTTPError("400 Agent required.")

    # Use the agent to generate a video.
    stdin, stdout, stderr = self._agent

    command = {"action": "create-video", "content-type": content_type, "images": images}
    stdin.write("%s\n" % json.dumps(command))
    stdin.flush()
    response = json.loads(stdout.readline())
    if not response["ok"]:
      cherrypy.response.headers["x-slycat-message"] = response["message"]
      raise cherrypy.HTTPError(400)

    cherrypy.response.status = 202
    return {"sid" : response["sid"]}

  def get_video_status(self, vsid):
    if not self._agent:
      cherrypy.response.headers["x-slycat-message"] = "No agent for %s." % (self.hostname)
      cherrypy.response.headers["x-slycat-hint"] = "Ask your system administrator to setup slycat-agent on %s" % (self.hostname)
      raise cherrypy.HTTPError("400 Agent required.")

    # Get the video status from the agent.
    stdin, stdout, stderr = self._agent

    stdin.write("%s\n" % json.dumps({"action":"video-status", "sid":vsid}))
    stdin.flush()
    metadata = json.loads(stdout.readline())

    cherrypy.response.headers["x-slycat-message"] = metadata["message"]

    if "returncode" in metadata and metadata["returncode"] != 0:
      cherrypy.log.error("\nreturncode: %s\nstderr: %s\n" % (metadata["returncode"], metadata["stderr"]))

    return metadata

  def get_video(self, vsid):
    if not self._agent:
      cherrypy.response.headers["x-slycat-message"] = "No agent for %s." % (self.hostname)
      cherrypy.response.headers["x-slycat-hint"] = "Ask your system administrator to setup slycat-agent on %s" % (self.hostname)
      raise cherrypy.HTTPError("400 Agent required.")

    # Get the video from the agent.
    stdin, stdout, stderr = self._agent

    stdin.write("%s\n" % json.dumps({"action":"get-video", "sid":vsid}))
    stdin.flush()
    metadata = json.loads(stdout.readline())
    sys.stderr.write("\n%s\n" % metadata)
    return slycat.web.server.streaming.serve(stdout, metadata["size"], metadata["content-type"])

def create_session(hostname, username, password, agent):
  """Create a cached remote session for the given host.

  Parameters
  ----------
  hostname : string
    Name of the remote host to connect via ssh.
  username : string
    Username for ssh authentication.
  password : string
    Password for ssh authentication.
  agent: bool
    Used to require / prevent agent startup.

  Returns
  -------
  sid : string
    A unique session identifier.
  """
  _start_session_cleanup_worker()

  client = cherrypy.request.headers.get("x-forwarded-for")
  cherrypy.log.error("Creating remote session for %s@%s from %s" % (username, hostname, client))

  try:
    sid = uuid.uuid4().hex
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(hostname=hostname, username=username, password=password)
    ssh.get_transport().set_keepalive(5)

    # Detect problematic startup scripts.
    stdin, stdout, stderr = ssh.exec_command("/bin/true")
    if stdout.read():
      raise cherrypy.HTTPError("500 Slycat can't connect because you have a startup script (~/.ssh/rc, ~/.bashrc, ~/.cshrc or similar) that writes data to stdout. Startup scripts should only write to stderr, never stdout - see sshd(8).")

    # Start sftp.
    sftp = ssh.open_sftp()

    # Optionally start an agent.
    remote_hosts = cherrypy.request.app.config["slycat-web-server"]["remote-hosts"]
    if agent is None:
      agent = hostname in remote_hosts and "agent" in remote_hosts[hostname]

    if agent:
      if hostname not in remote_hosts:
        raise cherrypy.HTTPError("400 Missing agent configuration.")
      if "agent" not in remote_hosts[hostname]:
        raise cherrypy.HTTPError("400 Missing agent configuration.")
      if "command" not in remote_hosts[hostname]["agent"]:
        raise cherrypy.HTTPError("500 Missing agent configuration.")

      cherrypy.log.error("Starting agent executable for %s@%s with command: %s" % (username, hostname, remote_hosts[hostname]["agent"]["command"]))
      stdin, stdout, stderr = ssh.exec_command(remote_hosts[hostname]["agent"]["command"])
      # Handle catastrophic startup failures (the agent process failed to start).
      try:
        startup = json.loads(stdout.readline())
      except Exception as e:
        raise cherrypy.HTTPError("500 Agent startup failed: %s" % str(e))
      # Handle clean startup failures (the agent process started, but reported an error).
      if not startup["ok"]:
        raise cherrypy.HTTPError("500 Agent startup failed: %s" % startup["message"])
      agent = (stdin, stdout, stderr)
      with session_cache_lock:
        session_cache[sid] = Session(client, username, hostname, ssh, sftp, agent)
    else:
      with session_cache_lock:
        session_cache[sid] = Session(client, username, hostname, ssh, sftp)
    return sid
  except cherrypy.HTTPError as e:
    cherrypy.log.error("Agent startup failed for %s@%s: %s" % (username, hostname, e.status))
    raise
  except paramiko.AuthenticationException as e:
    cherrypy.log.error("Authentication failed for %s@%s: %s" % (username, hostname, str(e)))
    raise cherrypy.HTTPError("403 Remote authentication failed.")
  except Exception as e:
    cherrypy.log.error("Unknown exception for %s@%s: %s %s" % (username, hostname, type(e), str(e)))
    raise cherrypy.HTTPError("500 Remote connection failed: %s" % str(e))

def get_session(sid):
  """Return a cached remote session.

  If the session has timed-out or doesn't exist, raises a 404 exception.

  Parameters
  ----------
  sid : string
    Unique session identifier returned by :func:`slycat.web.server.remote.create_session`.

  Returns
  -------
  session : :class:`slycat.web.server.remote.Session`
    Session object that encapsulates the connection to a remote host.
  """
  client = cherrypy.request.headers.get("x-forwarded-for")

  with session_cache_lock:
    _expire_session(sid)

    if sid in session_cache:
      session = session_cache[sid]
      # Only the originating client can access a session.
      if client != session.client:
        cherrypy.log.error("Client %s attempted to access remote session for %s@%s from %s" % (client, session.username, session.hostname, session.client))
        del session_cache[sid]
        raise cherrypy.HTTPError("404")

    if sid not in session_cache:
      raise cherrypy.HTTPError("404")

    session = session_cache[sid]
    session._accessed = datetime.datetime.utcnow()
    return session

def delete_session(sid):
  """Delete a cached remote session.

  Parameters
  ----------
  sid : string, required
    Unique session identifier returned by :func:`slycat.web.server.remote.create_session`.
  """
  with session_cache_lock:
    if sid in session_cache:
      session = session_cache[sid]
      cherrypy.log.error("Deleting remote session for %s@%s from %s" % (session.username, session.hostname, session.client))
      session_cache[sid].close()
      del session_cache[sid]

def _expire_session(sid):
  """Test an existing session to see if it is expired.

  Assumes that the caller already holds session_cache_lock.
  """
  if sid in session_cache:
    now = datetime.datetime.utcnow()
    session = session_cache[sid]
    if now - session.accessed > slycat.web.server.config["slycat-web-server"]["remote-session-timeout"]:
      cherrypy.log.error("Timing-out remote session for %s@%s from %s" % (session.username, session.hostname, session.client))
      session_cache[sid].close()
      del session_cache[sid]

def _session_monitor():
  while True:
    cherrypy.log.error("Remote session cleanup worker running.")
    with session_cache_lock:
      for sid in list(session_cache.keys()): # We make an explicit copy of the keys because we may be modifying the dict contents
        _expire_session(sid)
    cherrypy.log.error("Remote session cleanup worker finished.")
    time.sleep(datetime.timedelta(minutes=15).total_seconds())

def _start_session_cleanup_worker():
  if _start_session_cleanup_worker.thread is None:
    cherrypy.log.error("Starting remote session cleanup worker.")
    _start_session_cleanup_worker.thread = threading.Thread(name="SSH Monitor", target=_session_monitor)
    _start_session_cleanup_worker.thread.daemon = True
    _start_session_cleanup_worker.thread.start()
_start_session_cleanup_worker.thread = None

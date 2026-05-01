# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC.
# Under the terms of Contract DE-NA0003525 with National Technology and Engineering
# Solutions of Sandia, LLC, the U.S. Government retains certain rights in this software.

"""Utilities for managing upload sessions.

An upload session is used to incrementally upload potentially large data before
it is parsed and stored as model artifacts.

Workflow
--------
1. A session is created, generating a unique session ID and a temporary storage
   location on the filesystem.
2. The client uploads one or more files associated with the session.
3. Each file may be uploaded in one or more parts to avoid request body size
   limits.
4. When the client has finished uploading all parts, it notifies the server and
   provides the expected part counts for each file.
5. The server validates the uploaded parts, reconstructs complete files, and
   passes them to the configured parser plugin.
6. After parsing completes, the client deletes the session, which removes all
   temporary storage.

Sessions may also be deleted before upload completion to cancel the operation.

Session lifetime
----------------
Each session tracks a "last accessed" timestamp. If a session is not accessed
within the configured timeout interval, it is automatically deleted. Any
subsequent attempt to use the expired session ID will fail.

Security model
--------------
Each session is bound to the IP address of the client that created it. Only the
same client IP address may access the session.
"""

import cherrypy
import datetime
import glob
import os
import shutil
import stat
import threading
import time
import uuid

import slycat.web.server.authentication
import slycat.web.server.database


session_cache = {}
session_cache_lock = threading.Lock()
parsing_locks = {}


def root():
    """Return the root directory used for upload session storage.

    The value is lazily initialized from the CherryPy application configuration
    and cached on the function object.

    Returns
    -------
    str
        Filesystem path to the upload storage root.
    """
    if root.path is None:
        root.path = cherrypy.tree.apps[""].config["slycat-web-server"]["upload-store"]
    return root.path


root.path = None


def path(uid, fid=None, pid=None):
    """Construct a filesystem path for upload session storage.

    Parameters
    ----------
    uid : str
        Upload session identifier.
    fid : int or str, optional
        File identifier within the session.
    pid : int or str, optional
        Project identifier within the file.

    Returns
    -------
    str
        Filesystem path for the session, file, or file part.
    """
    result = os.path.join(root(), uid)
    if fid is not None:
        result = os.path.join(result, f"file-{fid}")
    if pid is not None:
        result = os.path.join(result, f"part-{pid}")
    return result


class Session(object):
    """Encapsulate an upload session.

    Notes
    -----
    Calling threads must serialize access to a ``Session`` object. To facilitate
    this, ``Session`` implements the context manager protocol and callers should
    always access sessions via a ``with`` statement.

    Examples
    --------
    >>> with slycat.web.server.upload.get_session(uid) as session:
    ...     print(session.username)
    """

    def __init__(self, uid, client, mid, input, parser, aids, kwargs):
        """Initialize an upload session.

        Parameters
        ----------
        uid : str
            Unique upload session identifier.
        client : str
            Client IP address associated with the session.
        mid : str
            Model identifier receiving uploaded content.
        input : any
            Parser-specific input identifier or descriptor.
        parser : str
            Registered parser name.
        aids : any
            Artifact identifier(s) passed through to the parser.
        kwargs : dict
            Additional parser keyword arguments.
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        self._uid = uid
        self._client = client
        self._mid = mid
        self._input = input
        self._parser = parser
        self._aids = aids
        self._kwargs = kwargs
        self._created = now
        self._accessed = now
        self._received = set()
        self._parsing_thread = None
        self._download_thread = None
        self._lock = threading.Lock()

    def __enter__(self):
        """Acquire the session lock and return the session."""
        self._lock.__enter__()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        """Release the session lock."""
        return self._lock.__exit__(exc_type, exc_value, traceback)

    @property
    def client(self):
        """Return the IP address of the client that created the session."""
        return self._client

    @property
    def mid(self):
        """Return the model ID that will store uploaded session data info."""
        return self._mid

    @property
    def accessed(self):
        """Return the time the session was last accessed."""
        return self._accessed

    def put_remote_upload_file_part(self, sid, fid, pid, file_path):
        """Start a background download of a remote file part into this session.

        Parameters
        ----------
        sid : str
            Remote session identifier.
        fid : int or str
            File identifier.
        pid : int or str
            Project identifier.
        file_path : str
            Remote filesystem path to download.
        """
        try:
            self._download_thread = threading.Thread(
                name="downlading remote file",
                target=Session._download_file_part,
                args=(
                    self,
                    sid,
                    fid,
                    pid,
                    file_path,
                    cherrypy.request.headers.get("x-forwarded-for"),
                ),
            )
            self._download_thread.start()
        except Exception as e:
            cherrypy.log.error(f"e: {e}")

    def _download_file_part(self, sid, fid, pid, file_path, calling_client):
        """Download a remote file part and store it as an uploaded part.

        Parameters
        ----------
        sid : str
            Remote session identifier.
        fid : int or str
            File identifier.
        pid : int or str
            Project identifier.
        file_path : str
            Remote file path.
        calling_client : str
            Client IP address initiating the download.

        Raises
        ------
        cherrypy.HTTPError
            If the requested remote path refers to a directory.
        """
        data = None
        with slycat.web.server.remote.get_session(sid, calling_client) as session:
            filename = f"{session.username}@{session.hostname}:{file_path}"
            if stat.S_ISDIR(session.sftp.stat(file_path).st_mode):
                cherrypy.log.error(
                    "slycat.web.server.handlers.py put_upload_file_part",
                    f"cherrypy.HTTPError 400 cannot load directory {filename}.",
                )
                raise cherrypy.HTTPError(f"400 Cannot load directory {filename}.")
            try:
                data = session.sftp.file(file_path).read()
            except Exception as e:
                cherrypy.log.error(f"e: {e}")

        self.put_upload_file_part(fid, pid, data)

    def put_upload_file_part(self, fid, pid, data):
        """Store an uploaded file part on disk.

        Parameters
        ----------
        fid : int or str
            File identifier.
        pid : int or str
            Project identifier.
        data : bytes
            File part payload.

        Raises
        ------
        cherrypy.HTTPError
            If upload finalization has already started.
        """
        if self._parsing_thread is not None:
            raise cherrypy.HTTPError("409 Upload already finished.")

        storage = path(self._uid, fid, pid)
        storage_dir = os.path.dirname(storage)
        if not os.path.exists(storage_dir):
            os.makedirs(storage_dir)

        with open(storage, "wb") as file:
            file.write(data)

        self._received.add((fid, pid))

    def post_upload_finished(self, uploaded, useProjectData):
        """Validate uploads and begin asynchronous parsing.

        Parameters
        ----------
        uploaded : sequence of int
            For each uploaded file, the number of parts the client claims to
            have uploaded.
        useProjectData : bool
            Whether parameter-image uploads should also populate project data.

        Returns
        -------
        dict or None
            Returns a dictionary describing missing or excess parts when
            validation fails. Otherwise returns ``None`` and sets an HTTP 202
            response status.

        Raises
        ------
        cherrypy.HTTPError
            If parsing has already started or a remote download is still active.
        """
        if self._parsing_thread is not None:
            raise cherrypy.HTTPError("409 Upload already finished.")

        if self._download_thread is not None and self._download_thread.is_alive():
            raise cherrypy.HTTPError("423 server is busy downloading file.")

        expected_parts = {
            (fid, pid) for fid in range(len(uploaded)) for pid in range(uploaded[fid])
        }
        missing = [part for part in expected_parts if part not in self._received]
        excess = [part for part in self._received if part not in expected_parts]
        self.useProjectData = useProjectData

        if missing:
            cherrypy.response.status = "400 Upload incomplete."
            return {"missing": missing}

        if excess:
            cherrypy.response.status = "400 Client confused."
            return {"excess": excess}

        self._parsing_thread = threading.Thread(
            name="Upload parsing",
            target=Session._parse_uploads,
            args=[self],
        )
        self._parsing_thread.start()

        cherrypy.response.status = "202 Upload session finished."

    def _parse_uploads(self):
        """Reconstruct uploaded files and invoke the configured parser.

        This method runs in a background thread. It assembles uploaded file parts
        in numeric order, reconstructs each full file as text or binary data,
        and then invokes the configured parser.

        Notes
        -----
        Parsing is serialized per model ID using ``parsing_locks`` so that
        multiple uploads targeting the same model do not parse concurrently.
        """
        cherrypy.log.error("Upload parsing started.")

        if self._mid not in parsing_locks:
            parsing_locks[self._mid] = threading.Lock()

        with parsing_locks[self._mid]:
            database = slycat.web.server.database.couchdb.connect()
            model = database.get("model", self._mid)

            def numeric_order(item_path):
                """Sort file and part paths by trailing numeric suffix."""
                return int(item_path.split("-")[-1])

            files = []
            storage = path(self._uid)

            for file_dir in sorted(
                glob.glob(os.path.join(storage, "file-*")),
                key=numeric_order,
            ):
                is_binary_file = False
                file_parts = []

                for file_part in sorted(
                    glob.glob(os.path.join(file_dir, "part-*")),
                    key=numeric_order,
                ):
                    if not is_binary_file:
                        try:
                            with open(file_part, "r") as f:
                                file_parts.append(f.read())

                        # not a text file, open as binary
                        except UnicodeDecodeError:
                            is_binary_file = True

                    if is_binary_file is True:
                        with open(file_part, "rb") as f:
                            file_parts.append(f.read())

                reconstructed_file = (
                    b"".join(file_parts) if is_binary_file else "".join(file_parts)
                )
                files.append(reconstructed_file)

            try:
                parser = slycat.web.server.plugin.manager.parsers[self._parser]["parse"]

                # Backward-compatible handling of artifact identifiers.
                # New convention:
                #   self._aids[0] -> filename added to the model and HDF5
                #   self._aids[1] -> filename pushed to the project_data object
                if len(self._aids) > 1:
                    if (
                        isinstance(self._aids[1], str)
                        and self._aids[1].endswith((".hdf5", ".h5"))
                    ):
                        parser(
                            database,
                            model,
                            self._input,
                            files,
                            self._aids,
                            **self._kwargs,
                        )
                    elif isinstance(self._aids[0], list):
                        parser(
                            database,
                            model,
                            self._input,
                            files,
                            self._aids[0],
                            **self._kwargs,
                        )
                else:
                    parser(
                        database,
                        model,
                        self._input,
                        files,
                        self._aids,
                        **self._kwargs,
                    )

                if (
                    model["model-type"] == "parameter-image"
                    and self.useProjectData is True
                    and ".h5" not in self._aids[1]
                    and ".hdf5" not in self._aids[1]
                ):
                    slycat.web.server.handlers.create_project_data(
                        self._mid,
                        self._aids,
                        files,
                    )
            except Exception as e:
                cherrypy.log.error(f"Exception parsing posted files: {e}")
                import traceback

                cherrypy.log.error(traceback.format_exc())

        cherrypy.log.error("Upload parsing finished.")

    def close(self):
        """Close the session and remove its temporary filesystem storage.

        Raises
        ------
        cherrypy.HTTPError
            If parsing is still in progress.
        """
        if self._parsing_thread is not None and self._parsing_thread.is_alive():
            raise cherrypy.HTTPError("409 Parsing in progress.")

        storage = path(self._uid)
        cherrypy.log.error(f"Destroying temporary upload storage {storage}")
        if os.path.exists(storage):
            shutil.rmtree(storage)


def create_session(mid, input, parser, aids, kwargs):
    """Create and cache an upload session for a model.

    Parameters
    ----------
    mid : str
        ID of the model that will store data uploaded during the session.
    input : any
        Parser-specific input identifier or descriptor.
    parser : str
        Registered parser name.
    aids : any
        Artifact identifier(s) passed through to the parser.
    kwargs : dict
        Additional parser keyword arguments.

    Returns
    -------
    str
        Unique upload session identifier.

    Notes
    -----
    The caller must have write access to the owning project.
    """
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    project = database.get("project", model["project"])
    slycat.web.server.authentication.require_project_writer(project)

    _start_session_cleanup_worker()

    client = cherrypy.request.headers.get("x-forwarded-for")
    cherrypy.log.error(f"Creating upload session for {client}")

    uid = uuid.uuid4().hex
    with session_cache_lock:
        session_cache[uid] = Session(uid, client, mid, input, parser, aids, kwargs)
    return uid


def get_session(uid):
    """Return a cached upload session.

    If the session has timed out or does not exist, a 404 error is raised.

    Parameters
    ----------
    uid : str
        Unique session identifier returned by :func:`create_session`.

    Returns
    -------
    Session
        Session object encapsulating the upload state.

    Raises
    ------
    cherrypy.HTTPError
        If the session does not exist, has expired, or is accessed from a
        different client IP address.
    """
    client = cherrypy.request.headers.get("x-forwarded-for")

    with session_cache_lock:
        _expire_session(uid)

        session = session_cache.get(uid)
        if session is None:
            cherrypy.log.error(
                "slycat.web.server.upload.py get_session",
                "cherrypy.HTTPError 404 uid is not in session_cache",
            )
            raise cherrypy.HTTPError("404")

        if client != session.client:
            cherrypy.log.error(
                f"Client {client} attempted to access upload session from {session.client}"
            )
            del session_cache[uid]
            cherrypy.log.error(
                "slycat.web.server.upload.py get_session",
                "cherrypy.HTTPError 404 client %s attempted to access upload session from %s"
                % (client, session.client),
            )
            raise cherrypy.HTTPError("404")

        session._accessed = datetime.datetime.now(datetime.timezone.utc)
        return session


def delete_session(uid):
    """Delete a cached upload session.

    Parameters
    ----------
    uid : str
        Unique session identifier returned by :func:`create_session`.
    """
    with session_cache_lock:
        if uid in session_cache:
            session = session_cache[uid]
            cherrypy.log.error(f"Deleting upload session for {session.client}")
            session.close()
            del session_cache[uid]


def _expire_session(uid):
    """Expire a session if it has timed out.

    Notes
    -----
    This function assumes the caller already holds ``session_cache_lock``.

    Parameters
    ----------
    uid : str
        Upload session identifier.
    """
    session = session_cache.get(uid)
    if session is None:
        return

    now = datetime.datetime.now(datetime.timezone.utc)
    timeout = slycat.web.server.config["slycat-web-server"]["upload-session-timeout"]
    if now - session.accessed > timeout:
        cherrypy.log.error(f"Timing-out upload session from {session.client}")
        session.close()
        del session_cache[uid]


def _session_monitor():
    """Background worker that removes orphaned storage and expired sessions."""
    while True:
        # Remove orphaned file storage. This can happen if the server is
        # restarted while an upload session is active.
        for storage in glob.glob(os.path.join(root(), "*")):
            if os.path.basename(storage) not in session_cache:
                cherrypy.log.error(f"Removing orphaned upload session storage {storage}")
                shutil.rmtree(storage)

        # Remove expired upload sessions.
        with session_cache_lock:
            # Make an explicit copy of the keys because the dictionary may be
            # modified during iteration.
            for uid in session_cache.keys():
                _expire_session(uid)

        time.sleep(datetime.timedelta(minutes=15).total_seconds())


def _start_session_cleanup_worker():
    """Start the upload session cleanup worker if it is not already running."""
    if _start_session_cleanup_worker.thread is None:
        _start_session_cleanup_worker.thread = threading.Thread(
            name="Upload Monitor",
            target=_session_monitor,
        )
        _start_session_cleanup_worker.thread.daemon = True
        _start_session_cleanup_worker.thread.start()


_start_session_cleanup_worker.thread = None
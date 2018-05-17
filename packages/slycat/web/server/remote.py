# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

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

import datetime
import json
import os
import stat
import sys
import threading
import time
import uuid
import cherrypy
import paramiko

import slycat.email
import slycat.mime_type
import slycat.web.server.authentication
import slycat.web.server.database
import slycat.web.server.streaming
import slycat.web.server


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
            cherrypy.log.error(
                "Instructing remote agent for %s@%s from %s to shutdown." % (self.username, self.hostname, self.client))
            stdin, stdout, stderr = self._agent
            command = {"action": "exit"}
            stdin.write("%s\n" % json.dumps(command))
            stdin.flush()

        self._sftp.close()
        self._ssh.close()

    def submit_batch(self, filename):
        """
        Submits a command to the slycat-agent to start an input batch file on a cluster running SLURM.

        Parameters
        ----------
        filename : string
          Name of the batch file

        Returns
        -------
        response : dict
          A dictionary with the following keys: filename, jid, errors
        """
        if self._agent is not None:
            stdin, stdout, stderr = self._agent
            payload = {"action": "submit-batch", "command": filename}

            stdin.write("%s\n" % json.dumps(payload))
            stdin.flush()

            response = json.loads(stdout.readline())
            if not response["ok"]:
                cherrypy.response.headers["x-slycat-message"] = response["message"]
                slycat.email.send_error("slycat.web.server.remote.py submit_batch",
                                        "cherrypy.HTTPError 400 %s" % response["message"])
                raise cherrypy.HTTPError(400)

            # parses out the job ID
            jid = [int(s) for s in response["output"].split() if s.isdigit()][0]

            return {"filename": response["filename"], "jid": jid, "errors": response["errors"]}
        else:
            cherrypy.response.headers["x-slycat-message"] = "No Slycat agent present on remote host."
            slycat.email.send_error("slycat.web.server.remote.py submit_batch",
                                    "cherrypy.HTTPError 500 no Slycat agent present on remote host.")
            raise cherrypy.HTTPError(500)

    def checkjob(self, jid):
        """
        Submits a command to the slycat-agent to check the status of a submitted job to a cluster running SLURM.

        Parameters
        ----------
        jid : int
          Job ID

        Returns
        -------
        response : dict
          A dictionary with the following keys: jid, status, errors
        """
        if self._agent is not None:
            stdin, stdout, stderr = self._agent
            payload = {"action": "checkjob", "command": jid}

            stdin.write("%s\n" % json.dumps(payload))
            stdin.flush()

            response = json.loads(stdout.readline())
            if not response["ok"]:
                cherrypy.response.headers["x-slycat-message"] = response["message"]
                slycat.email.send_error("slycat.web.server.remote.py checkjob",
                                        "cherrypy.HTTPError 400 %s" % response["message"])
                raise cherrypy.HTTPError(400)

            # parses the useful information from job status
            cherrypy.log.error("response state:%s" % response["output"])
            status = {
                "state": response["output"]
            }

            return {"jid": response["jid"], "status": status, "errors": response["errors"]}
        else:
            cherrypy.response.headers["x-slycat-message"] = "No Slycat agent present on remote host."
            slycat.email.send_error("slycat.web.server.remote.py checkjob",
                                    "cherrypy.HTTPError 500 no Slycat agent present on remote host.")
            raise cherrypy.HTTPError(500)

    def cancel_job(self, jid):
        """
        Submits a command to the slycat-agent to cancel a running job on a cluster running SLURM.

        Parameters
        ----------
        jid : int
          Job ID

        Returns
        -------
        response : dict
          A dictionary with the following keys: jid, output, errors
        """
        if self._agent is not None:
            stdin, stdout, stderr = self._agent
            payload = {"action": "cancel-job", "command": jid}

            stdin.write("%s\n" % json.dumps(payload))
            stdin.flush()

            response = json.loads(stdout.readline())
            if not response["ok"]:
                cherrypy.response.headers["x-slycat-message"] = response["message"]
                slycat.email.send_error("slycat.web.server.remote.py cancel_job",
                                        "cherrypy.HTTPError 400 %s" % response["message"])
                raise cherrypy.HTTPError(400)

            return {"jid": response["jid"], "output": response["output"], "errors": response["errors"]}
        else:
            cherrypy.response.headers["x-slycat-message"] = "No Slycat agent present on remote host."
            slycat.email.send_error("slycat.web.server.remote.py cancel_job",
                                    "cherrypy.HTTPError 500 no Slycat agent present on remote host.")
            raise cherrypy.HTTPError(500)

    def get_job_output(self, jid, path):
        """
        Submits a command to the slycat-agent to fetch the content of the a job's output file from a cluster running SLURM.

        Note that the expected format for the output file is slurm-[jid].out.

        Parameters
        ----------
        jid : int
          Job ID

        Returns
        -------
        response : dict
          A dictionary with the following keys: jid, output, errors
        """
        if self._agent is not None:
            stdin, stdout, stderr = self._agent
            payload = {"action": "get-job-output", "command": {"jid": jid, "path": path}}

            stdin.write("%s\n" % json.dumps(payload))
            stdin.flush()

            response = json.loads(stdout.readline())
            if not response["ok"]:
                cherrypy.response.headers["x-slycat-message"] = response["message"]
                slycat.email.send_error("slycat.web.server.remote.py get_job_output",
                                        "cherrypy.HTTPError 400 %s" % response["message"])
                raise cherrypy.HTTPError(400)
            return {"jid": response["jid"], "output": response["output"], "errors": response["errors"]}
        else:
            cherrypy.response.headers["x-slycat-message"] = "No Slycat agent present on remote host."
            slycat.email.send_error("slycat.web.server.remote.py get_job_output",
                                    "cherrypy.HTTPError 500 no Slycat agent present on remote host.")
            raise cherrypy.HTTPError(500)

    def get_user_config(self):
        """
        Submits a command to the slycat-agent to fetch the content of a user's .slycatrc file in their home directory.

        Returns
        -------
        response : dict
          A dictionary with the configuration values
        """
        if self._agent is not None:
            stdin, stdout, stderr = self._agent
            payload = {"action": "get-user-config"}

            stdin.write("%s\n" % json.dumps(payload))
            stdin.flush()

            response = json.loads(stdout.readline())
            if not response["ok"]:
                cherrypy.response.headers["x-slycat-message"] = response["message"]
                slycat.email.send_error("slycat.web.server.remote.py get_user_config",
                                        "cherrypy.HTTPError 400 %s" % response["message"])
                raise cherrypy.HTTPError(400)
            return {"config": response["config"], "errors": response["errors"]}
        else:
            cherrypy.response.headers["x-slycat-message"] = "No Slycat agent present on remote host."
            slycat.email.send_error("slycat.web.server.remote.py get_user_config",
                                    "cherrypy.HTTPError 500 no Slycat agent present on remote host.")
            raise cherrypy.HTTPError(500)

    def set_user_config(self, config):
        """
        Submits a command to the slycat-agent to set the content of a user's .slycatrc file in their home directory.

        Returns
        -------
        response : dict
        """
        if self._agent is not None:
            stdin, stdout, stderr = self._agent
            payload = {"action": "set-user-config", "command": {"config": config}}

            stdin.write("%s\n" % json.dumps(payload))
            stdin.flush()

            response = json.loads(stdout.readline())
            if not response["ok"]:
                cherrypy.response.headers["x-slycat-message"] = response["message"]
                slycat.email.send_error("slycat.web.server.remote.py set_user_config",
                                        "cherrypy.HTTPError 400 %s" % response["message"])
                raise cherrypy.HTTPError(400)
            return {"errors": response["errors"]}
        else:
            cherrypy.response.headers["x-slycat-message"] = "No Slycat agent present on remote host."
            slycat.email.send_error("slycat.web.server.remote.py set_user_config",
                                    "cherrypy.HTTPError 500 no Slycat agent present on remote host.")
            raise cherrypy.HTTPError(500)

    def run_agent_function(self, wckey, nnodes, partition, ntasks_per_node, time_hours, time_minutes, time_seconds, fn,
                           fn_params, uid):
        """
        Submits a command to the slycat-agent to run a predefined function on a cluster running SLURM.

        Parameters
        ----------
        wckey : string
          Workload characterization key
        nnodes : int
          Number of nodes requested for the job
        partition : string
          Name of the partition where the job will be run
        ntasks_per_node : int
          Number of tasks to run on a node
        ntasks : int
          Number of tasks allocated for the job
        ncpu_per_task : int
          Number of CPUs per task requested for the job
        time_hours : int
          Number of hours requested for the job
        time_minutes : int
          Number of minutes requested for the job
        time_seconds : int
          Number of seconds requested for the job
        fn : string
          Name for the Slycat agent function
        fn_params : dict
          Additional params for the agent function

        Returns
        -------
        response : dict
          A dictionary with the following keys: jid, errors
        """
        # verifies the fn is allowed to be run...
        restricted_fns = {
            "jaccard-distance": "jaccard",
            "jaccard2-distance": "jaccard2",
            "one-norm-distance": "one-norm",
            "correlation-distance": "correlation",
            "cosine-distance": "cosine",
            "hamming-distance": "hamming",
            "timeseries-model": "timeseries-model"
        }
        # check for an agent in none available die
        if self._agent is None:
            cherrypy.response.headers["x-slycat-message"] = "No Slycat agent present on remote host."
            slycat.email.send_error("slycat.web.server.remote.py run_agent_function",
                                    "cherrypy.HTTPError 500 no Slycat agent present on remote host.")
            raise cherrypy.HTTPError(500)

        # check if we can run the function
        if fn not in restricted_fns:
            cherrypy.response.headers["x-slycat-message"] = "Function %s is not available for the agent" % fn
            slycat.email.send_error("slycat.web.server.remote.py run_agent_function",
                                    "cherrypy.HTTPError 500 function %s is not available for the agent." % fn)
            raise cherrypy.HTTPError(500)

        # get the name of our slycat module on the hpc
        if "module-name" in slycat.web.server.config["slycat-web-server"]:
            module_name = slycat.web.server.config["slycat-web-server"]["module-name"]
        else:
            module_name = "slycat"

        # setup necessary for using IPython parallel with the agent function
        ipython_parallel_setup_arr = []

        def create_distance_matrix(fn_id, params):
            function_id = restricted_fns[fn_id]
            path = "/".join(params["input"].split("/")[:-1])

            arr = list(ipython_parallel_setup_arr)

            for image_columns_name in params["image_columns_names"]:
                # uncomment this line for production
                arr.append(
                    "python $SLYCAT_HOME/agent/slycat-agent-create-image-distance-matrix.py"
                    " --distance-measure %s --distance-column \"%s\" \"%s\" "
                    "~/slycat_%s_%s_%s_distance_matrix.csv  --profile ${profile}" % (
                        function_id, image_columns_name, params["input"], image_columns_name, uid, function_id))
                # uncomment this line for local development
                # arr.append("python slycat-agent-create-image-distance-matrix.py --distance-measure %s --distance-column \"%s\" \"%s\" ~/slycat_%s_%s_%s_distance_matrix.csv --profile ${profile}" % (f, c, params["input"], c, uid, f))

            return arr

        def compute_timeseries(fn_id, params, working_dir):
            arr = list(ipython_parallel_setup_arr)

            hdf5_dir = working_dir + "hdf5/"
            pickle_dir = working_dir + "pickle/"

            if params["timeseries_type"] == "csv":
                # uncomment this line for production
                arr.append(
                    "python $SLYCAT_HOME/agent/slycat-timeseries-to-hdf5.py --output-directory"
                    " \"%s\" --id-column=\"%s\" --inputs-file \"%s\" --inputs-file-delimiter=%s --force" % (
                        hdf5_dir, params["id_column"], params["inputs_file"], params["inputs_file_delimiter"]))
                # uncomment this line for local development
                # arr.append("python slycat-timeseries-to-hdf5.py --output-directory \"%s\" --id-column=\"%s\" --inputs-file \"%s\" --inputs-file-delimiter=%s --force" % (params["output_directory"], params["id_column"], params["inputs_file"], params["inputs_file_delimiter"]))
            elif params["timeseries_type"] == "xyce":
                # uncomment this line for production
                arr.append(
                    "python $SLYCAT_HOME/agent/slycat-xyce-timeseries-to-hdf5.py "
                    "--id-column=\"%s\" --timeseries-file=\"%s\" --force \"%s\" \"%s\"" % (
                        params["id_column"], params["xyce_timeseries_file"], params["input_directory"], hdf5_dir))
                # uncomment this line for locat development
                # arr.append("python slycat-xyce-timeseries-to-hdf5.py --id-column=\"%s\" --timeseries-file=\"%s\" --force \"%s\" \"%s\"" % (params["id_column"], params["xyce_timeseries_file"], params["input_directory"], params["output_directory"]))

            # check if we have a pre-set hdf5 directory
            if "hdf5_directory" in params and params["hdf5_directory"] != "":
                hdf5_dir = params["hdf5_directory"]

            if params["timeseries_name"] != "":
                # uncomment this line for production
                arr.append(
                    "python $SLYCAT_HOME/agent/slycat-agent-compute-timeseries.py "
                    "\"%s\" --timeseries-name=\"%s\" --cluster-sample-count %s --cluster-sample-type %s"
                    " --cluster-type %s --cluster-metric %s --workdir \"%s\" --hash %s --profile ${profile}" % (
                        hdf5_dir, params["timeseries_name"], params["cluster_sample_count"],
                        params["cluster_sample_type"],
                        params["cluster_type"], params["cluster_metric"], pickle_dir, uid))
                # uncomment this line for local development
                # arr.append("python slycat-agent-compute-timeseries.py \"%s\" --timeseries-name=\"%s\" --cluster-sample-count %s --cluster-sample-type %s --cluster-type %s --cluster-metric %s --workdir \"%s\" --hash %s --profile ${profile}" % (params["output_directory"], params["timeseries_name"], params["cluster_sample_count"], params["cluster_sample_type"], params["cluster_type"], params["cluster_metric"], params["workdir"], uid))
            else:
                # uncomment this line for production
                arr.append(
                    "python $SLYCAT_HOME/agent/slycat-agent-compute-timeseries.py "
                    "\"%s\" --cluster-sample-count %s --cluster-sample-type %s --cluster-type %s"
                    " --cluster-metric %s --workdir \"%s\" --hash %s --profile ${profile}" % (
                        hdf5_dir, params["cluster_sample_count"], params["cluster_sample_type"], params["cluster_type"],
                        params["cluster_metric"], pickle_dir, uid))
                # uncomment this line for local development
                # arr.append("python slycat-agent-compute-timeseries.py \"%s\" --cluster-sample-count %s --cluster-sample-type %s --cluster-type %s --cluster-metric %s --workdir \"%s\" --hash %s --profile ${profile}" % (params["output_directory"], params["cluster_sample_count"], params["cluster_sample_type"], params["cluster_type"], params["cluster_metric"], params["workdir"], uid))

            return arr

        def agent_functions(fn_id, params, working_dir=None):
            # agent_function is a placeholder for the future:
            # it will contain the logic for different type of agent functions
            # depending on the function identifier.
            if fn_id == "timeseries-model":
                return compute_timeseries(fn_id, params, working_dir)
            else:
                return create_distance_matrix(fn_id, params)

        stdin, stdout, stderr = self._agent
        hash_dir_name = uuid.uuid4().hex
        # everything up to the hashed working directory
        if fn_params["workdir"][-1] == '/':
            work_dir = fn_params["workdir"] + "slycat/" + hash_dir_name + "/"
        else:
            work_dir = fn_params["workdir"] + "/slycat/" + hash_dir_name + "/"
        payload = {
            "action": "run-function",
            "command": {
                "module_name": module_name,
                "wckey": wckey,
                "nnodes": nnodes,
                "partition": partition,
                "ntasks_per_node": ntasks_per_node,
                "time_hours": time_hours,
                "time_minutes": time_minutes,
                "time_seconds": time_seconds,
                "fn": agent_functions(fn, fn_params, working_dir=work_dir),
                "uid": uid,
                "working_dir": work_dir
            }
        }
        cherrypy.log.error("writing msg: %s" % json.dumps(payload))
        stdin.write("%s\n" % json.dumps(payload))
        stdin.flush()

        response = json.loads(stdout.readline())
        cherrypy.log.error("response msg: %s" % response)
        if not response["ok"]:
            cherrypy.response.headers["x-slycat-message"] = response["message"]
            cherrypy.log.error("agent response was not OK msg: %s" % response["message"])
            slycat.email.send_error("slycat.web.server.remote.py run_agent_function",
                                    "cherrypy.HTTPError 400 %s" % response["message"])
            raise cherrypy.HTTPError(status=400, message="run_agent_function response was not ok")

        # parses out the job ID
        arr = [int(s) for s in response["output"].split() if s.isdigit()]
        if len(arr) > 0:
            jid = arr[0]
        else:
            jid = -1

        return {"jid": jid, "working_dir": response["working_dir"], "errors": response["errors"]}

    def run_remote_command(self, command):
        """
        run a remote command from an HPC source running a slycat
        agent. the command could be things such as starting an hpc
        script or batch job or something as simple as moving files.
        the only requirement is that the script is in our list of 
        trusted scripts.
        
        this_func()->calls agent_command_func()->which runs_shell_command()
        -> which launches_script()-> sends_response_to_agent()->sends_response_to_server()
        ->sends_status_response_to_client()
        
        :param self: 
        :param command: json form of a command to be run
        {
            "scripts": //pre defined scripts that are registerd with the server
            [{
                "script_name":"script_name", // key for the script lookup 
                "parameters": [{key:value},...] // params that are fed to the script
            },...]
            "hpc": // these are the hpc commands that may be add for thing such as slurm
            {
                "is_hpc_job":bol, // determins if this should be run as an hpc job
                "parameters":[{key:value},...] // things such as number of nodes
            }
        }
        :return: {"msg":"message from the agent", "error": boolean}
        """
        # check for an agent if none available die
        if self._agent is None:
            cherrypy.response.headers["x-slycat-message"] = "No Slycat agent present on remote host."
            slycat.email.send_error("slycat.web.server.remote.py run_agent_function",
                                    "cherrypy.HTTPError 500 no Slycat agent present on remote host.")
            raise cherrypy.HTTPError(404, "no Slycat agent present on remote host.")

        # get the name of our slycat module on the hpc
        command["module-name"] = None
        if "module-name" in slycat.web.server.config["slycat-web-server"]:
            command["module-name"] = slycat.web.server.config["slycat-web-server"]["module-name"]
        stdin, stdout, stderr = self._agent
        payload = {
            "action": "run-remote-command",
            "command": command
        }
        cherrypy.log.error("writing msg: %s" % json.dumps(payload))
        stdin.write("%s\n" % json.dumps(payload))
        stdin.flush()
        response = json.loads(stdout.readline())
        cherrypy.log.error("response msg: %s" % response)
        if not response["ok"]:
            cherrypy.response.headers["x-slycat-message"] = response["message"]
            cherrypy.log.error("agent response was not OK msg: %s" % response["message"])
            slycat.email.send_error("slycat.web.server.remote.py run_agent_function",
                                    "cherrypy.HTTPError 400 %s" % response["message"])
            raise cherrypy.HTTPError(status=400,
                                     message="run_agent_function response was not ok: %s" % response["message"])

        return {
            "message": response["message"],
            "error": not response["ok"],
            "command": response["command"],
            "available_scripts": response["available_scripts"],
            "output": response["errors"],
            "errors": response["output"],
            "jid": response["jid"],
            "log_file_path": response["log_file_path"]
        }

    def get_remote_job_status(self, jid):
        """
        check of the status of a job running on an agent with a hostanemd session
        :param jid: job id
        :return: 
        """
        command = {"jid": jid}
        # check for an agent if none available die
        if self._agent is None:
            cherrypy.response.headers["x-slycat-message"] = "No Slycat agent present on remote host."
            slycat.email.send_error("slycat.web.server.remote.py run_agent_function",
                                    "cherrypy.HTTPError 500 no Slycat agent present on remote host.")
            raise cherrypy.HTTPError(404, "no Slycat agent present on remote host.")

        # get the name of our slycat module on the hpc
        command["module-name"] = None
        if "module-name" in slycat.web.server.config["slycat-web-server"]:
            command["module-name"] = slycat.web.server.config["slycat-web-server"]["module-name"]
        stdin, stdout, stderr = self._agent
        payload = {
            "action": "check-agent-job",
            "command": command
        }
        cherrypy.log.error("writing msg: %s" % json.dumps(payload))
        stdin.write("%s\n" % json.dumps(payload))
        stdin.flush()
        response = json.loads(stdout.readline())
        cherrypy.log.error("response msg: %s" % response)
        if not response["ok"]:
            cherrypy.response.headers["x-slycat-message"] = response["message"]
            cherrypy.log.error("agent response was not OK msg: %s" % response["message"])
            slycat.email.send_error("slycat.web.server.remote.py run_agent_function",
                                    "cherrypy.HTTPError 400 %s" % response["message"])
            raise cherrypy.HTTPError(status=400,
                                     message="run_agent_function response was not ok: %s" % response["message"])
        return response

    def launch(self, command):
        """
        Submits a single command to a remote location via the slycat-agent or SSH.

        Parameters
        ----------
        command : string
          Command

        Returns
        -------
        response : dict
          A dictionary with the following keys: command, output, errors
        """
        if self._agent is not None:
            stdin, stdout, stderr = self._agent

            payload = {"action": "launch", "command": command}

            stdin.write("%s\n" % json.dumps(payload))
            stdin.flush()

            response = json.loads(stdout.readline())
            if not response["ok"]:
                cherrypy.response.headers["x-slycat-message"] = response["message"]
                slycat.email.send_error("slycat.web.server.remote.py launch",
                                        "cherrypy.HTTPError 400 %s" % response["message"])
                raise cherrypy.HTTPError(400)
            return {"command": response["command"], "output": response["output"], "errors": response["errors"]}

        # launch via ssh...
        try:
            stdin, stdout, stderr = self._ssh.exec_command(command)
            response = {"command": command, "output": str(stdout.readlines())}
            return response
        except paramiko.SSHException as e:
            cherrypy.response.headers["x-slycat-message"] = str(e)
            slycat.email.send_error("slycat.web.server.remote.py launch", "cherrypy.HTTPError 500 %s" % str(e))
            raise cherrypy.HTTPError(500)
        except Exception as e:
            cherrypy.response.headers["x-slycat-message"] = str(e)
            slycat.email.send_error("slycat.web.server.remote.py launch", "cherrypy.HTTPError 400 %s" % str(e))
            raise cherrypy.HTTPError(400)

    def browse(self, path, file_reject, file_allow, directory_reject, directory_allow):
        # Use the agent to browse.
        if self._agent is not None:
            stdin, stdout, stderr = self._agent
            command = {"action": "browse", "path": path}
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
            return {"path": response["path"], "names": response["names"], "sizes": response["sizes"],
                    "types": response["types"], "mtimes": response["mtimes"], "mime-types": response["mime-types"]}

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

            response = {"path": path, "names": names, "sizes": sizes, "types": types, "mtimes": mtimes,
                        "mime-types": mime_types}
            return response
        except Exception as e:
            cherrypy.response.headers["x-slycat-message"] = str(e)
            slycat.email.send_error("slycat.web.server.remote.py browse", "cherrypy.HTTPError 400 %s" % str(e))
            raise cherrypy.HTTPError(400)

    def get_file(self, path, **kwargs):
        cache = kwargs.get("cache", None)
        project = kwargs.get("project", None)
        key = kwargs.get("key", None)

        # Sanity-check arguments.
        if cache not in [None, "project"]:
            slycat.email.send_error("slycat.web.server.remote.py get_file",
                                    "cherrypy.HTTPError 400 unknown cache type: %s." % cache)
            raise cherrypy.HTTPError("400 Unknown cache type: %s." % cache)
        if cache is not None:
            if project is None:
                slycat.email.send_error("slycat.web.server.remote.py get_file",
                                        "cherrypy.HTTPError 400 must specify project ID.")
                raise cherrypy.HTTPError("400 Must specify project id.")
            if key is None:
                slycat.email.send_error("slycat.web.server.remote.py get_file",
                                        "cherrypy.HTTPError 400 must specify cache key.")
                raise cherrypy.HTTPError("400 Must specify cache key.")

        # Use the agent to retrieve a file.
        if self._agent is not None:
            stdin, stdout, stderr = self._agent
            stdin.write("%s\n" % json.dumps({"action": "get-file", "path": path}))
            stdin.flush()
            metadata = json.loads(stdout.readline())

            if metadata["message"] == "Path must be absolute.":
                cherrypy.response.headers["x-slycat-message"] = "Remote path %s:%s is not absolute." % (
                    self.hostname, path)
                slycat.email.send_error("slycat.web.server.remote.py get_file",
                                        "cherrypy.HTTPError 400 remote path %s:%s is not absolute." % (
                                            self.hostname, path))
                raise cherrypy.HTTPError("400 Path not absolute.")
            elif metadata["message"] == "No read permission.":
                cherrypy.response.headers["x-slycat-message"] = "You do not have permission to retrieve %s:%s" % (
                    self.hostname, path)
                cherrypy.response.headers[
                    "x-slycat-hint"] = "Check the filesystem on %s to verify that your user has" \
                                       " access to %s, and don't forget to set appropriate permissions" \
                                       " on all the parent directories!" % (
                                           self.hostname, path)
                slycat.email.send_error("slycat.web.server.remote.py get_file",
                                        "cherrypy.HTTPError 400 you do not have permission to "
                                        "retrieve %s:%s. Check the filesystem on %s to verify that"
                                        " your user has access to %s, and don't forget to set appropriate "
                                        "permissions on all the parent directories." % (
                                            self.hostname, path, self.hostname, path))
                raise cherrypy.HTTPError("400 Access denied.")
            elif metadata["message"] == "Path not found.":
                cherrypy.response.headers["x-slycat-message"] = "The remote file %s:%s does not exist." % (
                    self.hostname, path)
                slycat.email.send_error("slycat.web.server.remote.py get_file",
                                        "cherrypy.HTTPError 400 the remote file %s:%s does not exist." % (
                                            self.hostname, path))
                raise cherrypy.HTTPError("400 File not found.")
            elif metadata["message"] == "Directory unreadable.":
                cherrypy.response.headers["x-slycat-message"] = "Remote path %s:%s is a directory." % (
                    self.hostname, path)
                slycat.email.send_error("slycat.web.server.remote.py get_file",
                                        "cherrypy.HTTPError 400 can't read directory %s:%s." % (self.hostname, path))
                raise cherrypy.HTTPError("400 Can't read directory.")
            elif metadata["message"] == "Access denied.":
                cherrypy.response.headers["x-slycat-message"] = "You do not have permission to retrieve %s:%s" % (
                    self.hostname, path)
                cherrypy.response.headers[
                    "x-slycat-hint"] = "Check the filesystem on %s to verify that your user has access" \
                                       " to %s, and don't forget to set appropriate permissions on all" \
                                       " the parent directories!" % (
                                           self.hostname, path)
                slycat.email.send_error("slycat.web.server.remote.py get_file",
                                        "cherrypy.HTTPError 400 you do not have permission to"
                                        " retrieve %s:%s. Check the filesystem on %s to verify "
                                        "that your user has access to %s, and don't forget to set"
                                        " appropriate permissions on all the parent directories." % (
                                            self.hostname, path, self.hostname, path))
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
                cherrypy.response.headers["x-slycat-message"] = "Remote path %s:%s is a directory." % (
                    self.hostname, path)
                slycat.email.send_error("slycat.web.server.remote.py get_file",
                                        "cherrypy.HTTPError 400 can't read directory %s:%s." % (self.hostname, path))
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
                slycat.email.send_error("slycat.web.server.remote.py get_file",
                                        "cherrypy.HTTPError 500 remote access failed: %s" % str(e))
                raise cherrypy.HTTPError("500 Remote access failed.")

            if e.strerror == "No such file":
                # Ideally this would be a 404, but we already use
                # 404 to handle an unknown sessions, and clients need to make the distinction.
                cherrypy.response.headers["x-slycat-message"] = "The remote file %s:%s does not exist." % (
                    self.hostname, path)
                slycat.email.send_error("slycat.web.server.remote.py get_file",
                                        "cherrypy.HTTPError 400 the remote file %s:%s does not exist." % (
                                            self.hostname, path))
                raise cherrypy.HTTPError("400 File not found.")

            if e.strerror == "Permission denied":
                # The file exists, but is not available due to access controls
                cherrypy.response.headers["x-slycat-message"] = "You do not have permission to retrieve %s:%s" % (
                    self.hostname, path)
                cherrypy.response.headers[
                    "x-slycat-hint"] = "Check the filesystem on %s to verify that your user has access " \
                                       "to %s, and don't forget to set appropriate permissions on all " \
                                       "the parent directories!" % (
                                           self.hostname, path)
                slycat.email.send_error("slycat.web.server.remote.py get_file",
                                        "cherrypy.HTTPError 400 you do not have permission to "
                                        "retrieve %s:%s. Check the filesystem on %s to verify that your "
                                        "user has access to %s, and don't forget to set appropriate permissions"
                                        " on all the parent directories." % (
                                            self.hostname, path, self.hostname, path))
                raise cherrypy.HTTPError("400 Access denied.")

            # Catchall
            cherrypy.response.headers["x-slycat-message"] = "Remote access failed: %s" % str(e)
            slycat.email.send_error("slycat.web.server.remote.py get_file",
                                    "cherrypy.HTTPError 400 remote access failed: %s" % str(e))
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
            slycat.email.send_error("slycat.web.server.remote.py get_image",
                                    "cherrypy.HTTPError 400 unknown cache type: %s.")
            raise cherrypy.HTTPError("400 Unknown cache type: %s." % cache)
        if cache is not None:
            if project is None:
                slycat.email.send_error("slycat.web.server.remote.py get_image",
                                        "cherrypy.HTTPError 400 must specify project id.")
                raise cherrypy.HTTPError("400 Must specify project id.")
            if key is None:
                slycat.email.send_error("slycat.web.server.remote.py get_image",
                                        "cherrypy.HTTPError 400 must specify cache key.")
                raise cherrypy.HTTPError("400 Must specify cache key.")

        if not self._agent:
            cherrypy.response.headers["x-slycat-message"] = "No agent for %s." % (self.hostname)
            cherrypy.response.headers["x-slycat-hint"] = "Ask your system administrator to setup slycat-agent on %s" % (
                self.hostname)
            slycat.email.send_error("slycat.web.server.remote.py get_image",
                                    "cherrypy.HTTPError 400 no agent for %s." % (self.hostname))
            raise cherrypy.HTTPError("400 Agent required.")

        # Use the agent to retrieve an image.
        stdin, stdout, stderr = self._agent

        command = {"action": "get-image", "path": path}
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
            slycat.email.send_error("slycat.web.server.remote.py get_image",
                                    "cherrypy.HTTPError 400 remote path %s:%s is not absolute." % (self.hostname, path))
            raise cherrypy.HTTPError("400 Path not absolute.")
        elif metadata["message"] == "Path not found.":
            cherrypy.response.headers["x-slycat-message"] = "The remote file %s:%s does not exist." % (
                self.hostname, path)
            slycat.email.send_error("slycat.web.server.remote.py get_image",
                                    "cherrypy.HTTPError 400 the remote file %s:%s does not exist." % (
                                        self.hostname, path))
            raise cherrypy.HTTPError("400 File not found.")
        elif metadata["message"] == "Directory unreadable.":
            cherrypy.response.headers["x-slycat-message"] = "Remote path %s:%s is a directory." % (self.hostname, path)
            slycat.email.send_error("slycat.web.server.remote.py get_image",
                                    "cherrypy.HTTPError 400 can't read directory for the remote path %s:%s." % (
                                        self.hostname, path))
            raise cherrypy.HTTPError("400 Can't read directory.")
        elif metadata["message"] == "Access denied.":
            cherrypy.response.headers["x-slycat-message"] = "You do not have permission to retrieve %s:%s" % (
                self.hostname, path)
            cherrypy.response.headers[
                "x-slycat-hint"] = "Check the filesystem on %s to verify that your user has access " \
                                   "to %s, and don't forget to set appropriate permissions on all " \
                                   "the parent directories!" % (
                                       self.hostname, path)
            slycat.email.send_error("slycat.web.server.remote.py get_image",
                                    "cherrypy.HTTPError 400 you do not have permission to "
                                    "retrieve %s:%s. Check the filesystem on %s:%s to verify that "
                                    "your user has access to %s, and don't forget to set appropriate "
                                    "permissions on all the parent directories." % (
                                        self.hostname, path, self.hostname, path, path))
            raise cherrypy.HTTPError("400 Access denied.")

        content_type = metadata["content-type"]
        content = stdout.read(metadata["size"])

        if cache == "project":
            cache_object(project, key, content_type, content)

        cherrypy.response.headers["content-type"] = content_type
        return content

    def get_video_status(self, vsid):
        if not self._agent:
            cherrypy.response.headers["x-slycat-message"] = "No agent for %s." % (self.hostname)
            cherrypy.response.headers["x-slycat-hint"] = "Ask your system administrator to setup slycat-agent on %s" % (
                self.hostname)
            slycat.email.send_error("slycat.web.server.remote.py get_video_status",
                                    "cherrypy.HTTPError 400 no agent for %s." % (self.hostname))
            raise cherrypy.HTTPError("400 Agent required.")

        # Get the video status from the agent.
        stdin, stdout, stderr = self._agent

        stdin.write("%s\n" % json.dumps({"action": "video-status", "sid": vsid}))
        stdin.flush()
        metadata = json.loads(stdout.readline())

        cherrypy.response.headers["x-slycat-message"] = metadata["message"]

        if "returncode" in metadata and metadata["returncode"] != 0:
            cherrypy.log.error("\nreturncode: %s\nstderr: %s\n" % (metadata["returncode"], metadata["stderr"]))

        return metadata

    def get_video(self, vsid):
        if not self._agent:
            cherrypy.response.headers["x-slycat-message"] = "No agent for %s." % (self.hostname)
            cherrypy.response.headers["x-slycat-hint"] = "Ask your system administrator to setup slycat-agent on %s" % (
                self.hostname)
            slycat.email.send_error("slycat.web.server.remote.py get_video",
                                    "cherrypy.HTTPError 400 no agent for %s." % (self.hostname))
            raise cherrypy.HTTPError("400 Agent required.")

        # Get the video from the agent.
        stdin, stdout, stderr = self._agent

        stdin.write("%s\n" % json.dumps({"action": "get-video", "sid": vsid}))
        stdin.flush()
        metadata = json.loads(stdout.readline())
        sys.stderr.write("\n%s\n" % metadata)
        return slycat.web.server.streaming.serve(stdout, metadata["size"], metadata["content-type"])


def create_session(hostname, username, password, agent):
    """
    Create a cached remote session for the given host.

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
    sid = uuid.uuid4().hex
    try:
        ssh = slycat.web.server.ssh_connect(hostname=hostname, username=username, password=password)
        # Detect problematic startup scripts.
        stdin, stdout, stderr = ssh.exec_command("/bin/true")
        if stdout.read():
            slycat.email.send_error("slycat.web.server.remote.py create_session",
                                    "cherrypy.HTTPError 500 Slycat can't connect because you "
                                    "have a startup script (~/.ssh/rc, ~/.bashrc, ~/.cshrc or similar)"
                                    " that writes data to stdout. Startup scripts should only write to "
                                    "stderr, never stdout - see sshd(8).")
            raise cherrypy.HTTPError(
                "500 Slycat can't connect because you have a startup script "
                "(~/.ssh/rc, ~/.bashrc, ~/.cshrc or similar) that writes data to stdout. "
                "Startup scripts should only write to stderr, never stdout - see sshd(8).")

        cherrypy.log.error("Created remote session for %s@%s from %s" % (username, hostname, client))
        # Start sftp.
        sftp = ssh.open_sftp()

        # Optionally start an agent.
        remote_hosts = cherrypy.request.app.config["slycat-web-server"]["remote-hosts"]
        if agent is None:
            agent = hostname in remote_hosts and "agent" in remote_hosts[hostname]

        if agent:
            if hostname not in remote_hosts:
                slycat.email.send_error("slycat.web.server.remote.py create_session",
                                        "cherrypy.HTTPError 400 host %s not in allowed remote hosts." % hostname)
                raise cherrypy.HTTPError("400 Missing agent configuration.")
            if "agent" not in remote_hosts[hostname]:
                slycat.email.send_error("slycat.web.server.remote.py create_session",
                                        "cherrypy.HTTPError 400 missing agent configuration for host %s." % hostname)
                raise cherrypy.HTTPError("400 Missing agent configuration.")
            if "command" not in remote_hosts[hostname]["agent"]:
                slycat.email.send_error("slycat.web.server.remote.py create_session",
                                        "cherrypy.HTTPError 500 missing agent configuration"
                                        " for host %s: missing command keyword." % hostname)
                raise cherrypy.HTTPError("500 Missing agent configuration.")

            cherrypy.log.error("Starting agent executable for %s@%s with command: %s" % (
                username, hostname, remote_hosts[hostname]["agent"]["command"]))
            stdin, stdout, stderr = ssh.exec_command(remote_hosts[hostname]["agent"]["command"])
            cherrypy.log.error("Started agent")
            # Handle catastrophic startup failures (the agent process failed to start).
            try:
                startup = json.loads(stdout.readline())
            except Exception as e:
                cherrypy.log.error("500 agent startup failed for host %s: %s." % (hostname, str(e)))
                slycat.email.send_error("slycat.web.server.remote.py create_session",
                                        "cherrypy.HTTPError 500 agent startup failed for host %s: %s." % (
                                            hostname, str(e)))
                raise cherrypy.HTTPError("500 Agent startup failed: %s" % str(e))
            # Handle clean startup failures (the agent process started, but reported an error).
            if not startup["ok"]:
                cherrypy.log.error("500 agent startup failed for host %s: %s." % (hostname, startup["message"]))
                slycat.email.send_error("slycat.web.server.remote.py create_session",
                                        "cherrypy.HTTPError 500 agent startup failed for host %s: %s." % (
                                            hostname, startup["message"]))
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
        slycat.email.send_error("slycat.web.server.remote.py create_session",
                                "Agent startup failed for %s@%s: %s" % (username, hostname, e.status))
        raise
    except paramiko.AuthenticationException as e:
        cherrypy.log.error("Authentication failed for %s@%s: %s" % (username, hostname, str(e)))
        slycat.email.send_error("slycat.web.server.remote.py create_session",
                                "cherrypy.HTTPError 403 authentication failed for %s@%s: %s." % (
                                    username, hostname, str(e)))
        raise cherrypy.HTTPError("403 Remote authentication failed.")
    except Exception as e:
        cherrypy.log.error("Unknown exception for %s@%s: %s %s" % (username, hostname, type(e), str(e)))
        slycat.email.send_error("slycat.web.server.remote.py create_session",
                                "cherrypy.HTTPError 500 unknown exception for %s@%s: %s %s." % (
                                    username, hostname, type(e), str(e)))
        raise cherrypy.HTTPError("500 Remote connection failed: %s" % str(e))


def get_session(sid):
    """
    Return a cached remote session.

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
                cherrypy.log.error("Client %s attempted to access remote session for %s@%s from %s" % (
                    client, session.username, session.hostname, session.client))
                del session_cache[sid]
                slycat.email.send_error("slycat.web.server.remote.py get_session",
                                        "cherrypy.HTTPError 404: client %s attempted to "
                                        "access remote session for %s@%s from %s" % (
                                            client, session.username, session.hostname, session.client))
                raise cherrypy.HTTPError("404")

        if sid not in session_cache:
            raise cherrypy.HTTPError("404 not a session")

        session = session_cache[sid]
        session._accessed = datetime.datetime.utcnow()
        return session


def get_session_server(client, sid):
    """
    Return a cached remote session.

    If the session has timed-out or doesn't exist, raises a 404 exception.

    Parameters
    ----------
    sid : string
      Unique session identifier returned by :func:`slycat.web.server.remote.create_session`.

    Returns
    -------
    session : :class:`slycat.web.server.remote.Session`
      Session object that encapsulates the connection to a remote host.
      :param client:
    """
    with session_cache_lock:
        _expire_session(sid)

        if sid in session_cache:
            session = session_cache[sid]
            # Only the originating client can access a session.
            if client != session.username:
                cherrypy.log.error("Client %s attempted to access remote session for %s@%s from %s" % (
                    client, session.username, session.hostname, session.client))
                del session_cache[sid]
                slycat.email.send_error("slycat.web.server.remote.py get_session",
                                        "cherrypy.HTTPError 404: client %s attempted to "
                                        "access remote session for %s@%s from %s" % (
                                            client, session.username, session.hostname, session.client))
                raise cherrypy.HTTPError("404")

        if sid not in session_cache:
            raise cherrypy.HTTPError("404 not a session")

        session = session_cache[sid]
        session._accessed = datetime.datetime.utcnow()
        return session


def check_session(sid):
    """
    Return a true if session is active

    If the session has timed-out or doesn't exist, returns false

    Parameters
    ----------
    sid : string
      Unique session identifier returned by :func:`slycat.web.server.remote.create_session`.

    Returns
    -------
    boolean :
    """
    client = cherrypy.request.headers.get("x-forwarded-for")

    with session_cache_lock:
        _expire_session(sid)
        response = True
        if sid in session_cache:
            session = session_cache[sid]
            # Only the originating client can access a session.
            if client != session.client:
                response = False

        if sid not in session_cache:
            response = False
        if response:
            session = session_cache[sid]
            session._accessed = datetime.datetime.utcnow()
        return response


def delete_session(sid):
    """
    Delete a cached remote session.

    Parameters
    ----------
    sid : string, required
      Unique session identifier returned by :func:`slycat.web.server.remote.create_session`.
    """
    with session_cache_lock:
        if sid in session_cache:
            session = session_cache[sid]
            cherrypy.log.error(
                "Deleting remote session for %s@%s from %s" % (session.username, session.hostname, session.client))
            session_cache[sid].close()
            del session_cache[sid]


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
            session_cache[sid].close()
            del session_cache[sid]


def _session_monitor():
    while True:
        cherrypy.log.error("Remote session cleanup worker running.")
        with session_cache_lock:
            for sid in list(
                    session_cache.keys()):  # We make an explicit copy of the keys because we may be modifying the dict contents
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

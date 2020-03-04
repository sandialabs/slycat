# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
    """Called during startup when the plugin is loaded."""
    import cherrypy
    import datetime
    import time
    import os
    import json
    import slycat.web.server
    import threading
    import sys
    import traceback
    import numpy
    import re
    import couchdb
    try:
        import cpickle as pickle
    except ImportError:
        import pickle

    def media_columns(database, model, verb, type, command, **kwargs):
        """
        Identify columns in the input data that contain media URIs (image or video).
        :param kwargs:
        :param command:
        :param type:
        :param verb:
        :param model:
          model ID in the data base
        :param database:
          our connection to couch db
        """
        expression = re.compile("file://")
        search = numpy.vectorize(lambda x: bool(expression.search(x)))

        columns = []
        metadata = slycat.web.server.get_model_arrayset_metadata(database, model, "inputs", "0")["arrays"][0]
        for index, attribute in enumerate(metadata["attributes"]):
            if attribute["type"] != "string":
                continue
            column = slycat.web.server.get_model_arrayset_data(database, model, "inputs", "0/%s/..." % index)
            if not numpy.any(search(column)):
                continue
            columns.append(index)

        cherrypy.response.headers["content-type"] = "application/json"
        return json.dumps(columns)

    def finish(model_id):
        """
        Update the model in the databse as successfully completed.

        :param model_id: uid of the model
        """
        database = slycat.web.server.database.couchdb.connect()
        model = database.get("model", model_id)
        slycat.web.server.update_model(database, model, state="finished", result="succeeded",
                                       finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

    def fail_model(mid, message):
        """
        Update the model as failed.
    
        :param mid:     model ID
        :param message: reason for the model failure
        """
        database = slycat.web.server.database.couchdb.connect()
        model = database.get("model", mid)
        slycat.web.server.update_model(database, model, state="finished", result="failed",
                                       finished=datetime.datetime.utcnow().isoformat(), message=message)

    def get_remote_file_server(hostname, model, filename):
        """
        Utility function to fetch remote files.
        :param hostname:
        :param username:
        :param filename: Full filename for the requested file
        :return: tuple with session ID and file content
        """
        sid = get_sid(hostname, model)
        with slycat.web.server.remote.get_session(sid) as session:
          return session.get_file(filename)

    def get_sid(hostname, model):
        """

        :param hostname:
        :param model:
        :return:
        """
        sid = None
        try:
            database = slycat.web.server.database.couchdb.connect()
            sessions = [session for session in database.scan("slycat/sessions") if
                        session["creator"] == model["creator"]]
            if len(sessions) > 1:
                cherrypy.log.error("to many user sessions %s" % str(sessions))
                raise Exception("to many user sessions")
            for index, host_session in enumerate(sessions[0]["sessions"]):
                if host_session["hostname"] == hostname:
                    sid = host_session["sid"]
                    if(not slycat.web.server.remote.check_session(sid)):
                        cherrypy.log.error("error session %s SID:%s Keys %s" % (slycat.web.server.remote.check_session(sid), sid, list(slycat.web.server.remote.session_cache.keys())))
                        slycat.web.server.remote.delete_session(sid)
                        del session["sessions"][index]
                        database.save(session)
                        raise cherrypy.HTTPError("404")
                    break
        except Exception as e:
            cherrypy.log.error(traceback.format_exc())
            cherrypy.log.error("Timeseries model compute exception type: %s" % sys.exc_info()[0])
            cherrypy.log.error("Timeseries model compute exception value: %s" % sys.exc_info()[1])
            cherrypy.log.error("Timeseries model compute exception traceback: %s" % sys.exc_info()[2])
            cherrypy.log.error("could not retrieve host session for remotes %s" % e)
            raise cherrypy.HTTPError("404")
        if sid is None:
            raise cherrypy.HTTPError("400 session is None value")
        return sid

    def compute(model_id, stop_event):
        """
        Computes the Time Series model. It fetches the necessary files from a
        remote server that were computed by the slycat-agent-compute-timeseries.py
        script.
    
        :param model_id: uid for the model in the database
        :param sid:      session ID
        :param uid:      user ID
        :param workdir:
        :param hostname:
        :param username:
        """
        try:
            #cherrypy.log.error("in thread")
            # workdir += "/slycat/pickle"  # route to the slycat directory
            database = slycat.web.server.database.couchdb.connect()
            model = database.get("model", model_id)
            model["model_compute_time"] = datetime.datetime.utcnow().isoformat()
            cherrypy.log.error("Computing 1model_id: %s" % model_id)
            slycat.web.server.update_model(database, model, state="waiting")
            # slycat.web.server.put_model_parameter(database, model, "computing", False)
            cherrypy.log.error("Computing model_id: %s" % model_id)

            model = database.get("model", model_id)
            uid = slycat.web.server.get_model_parameter(database, model, "pickle_uid")
            workdir_raw = slycat.web.server.get_model_parameter(database, model, "working_directory")
            workdir = workdir_raw + "pickle"
            hostname = slycat.web.server.get_model_parameter(database, model, "hostname")
            username = slycat.web.server.get_model_parameter(database, model, "username")

            # get an active session
            sid = get_sid(hostname, model)
            # load inputs
            inputs = get_remote_file_server(hostname, model,
                                            "%s/slycat_timeseries_%s/arrayset_inputs.pickle" % (workdir, uid))
            inputs = pickle.loads(inputs)
            cherrypy.log.error("Computing thread inputs: %s" % inputs)
            database = slycat.web.server.database.couchdb.connect()
            model = database.get("model", model_id)
            cherrypy.log.error("putting false for computing")
            slycat.web.server.put_model_parameter(database, model, "computing", False)
            cherrypy.log.error("finished Pulling timeseries computed data")
            stop_event.set()
            return
            # done -- destroy the thread
            slycat.web.server.put_model_arrayset(database, model, inputs["aid"])

            # load attributes
            attributes = inputs["attributes"]
            slycat.web.server.put_model_array(database, model, inputs["aid"], 0, attributes, inputs["dimensions"])

            # load attribute data
            data = get_remote_file_server(hostname, model,
                                          "%s/slycat_timeseries_%s/inputs_attributes_data.pickle" % (workdir, uid))
            attributes_data = pickle.loads(data)

            # push attribute arraysets
            # TODO this can become multi processored
            for attribute in range(len(attributes)):
                model = database.get("model", model["_id"])
                slycat.web.server.put_model_arrayset_data(database, model, inputs["aid"], "0/%s/..." % attribute,
                                                          [attributes_data[attribute]])
            # load clusters data
            clusters = json.loads(
                slycat.web.server.get_remote_file_server(hostname, model,
                                                  "%s/slycat_timeseries_%s/file_clusters.json" % (workdir, uid)))
            clusters_file = json.JSONDecoder().decode(clusters["file"])
            timeseries_count = json.JSONDecoder().decode(clusters["timeseries_count"])

            slycat.web.server.post_model_file(model["_id"], True, sid,
                                              "%s/slycat_timeseries_%s/file_clusters.out" % (workdir, uid),
                                              clusters["aid"], clusters["parser"], client=model["creator"])
            # TODO this can become multi processored
            cherrypy.log.error("Pulling timeseries computed data")
            for file_name in clusters_file:
                file_cluster_data = get_remote_file_server(hostname, model,
                                                            "%s/slycat_timeseries_%s/file_cluster_%s.json" % (
                                                                workdir, uid, file_name))
                file_cluster_attr = json.loads(file_cluster_data)
                slycat.web.server.post_model_file(model["_id"], True, sid,
                                                  "%s/slycat_timeseries_%s/file_cluster_%s.out" % (
                                                      workdir, uid, file_name),
                                                  file_cluster_attr["aid"], file_cluster_attr["parser"], client=model["creator"])
                database = slycat.web.server.database.couchdb.connect()
                model = database.get("model", model["_id"])
                slycat.web.server.put_model_arrayset(database, model, "preview-%s" % file_name)

                waveform_dimensions_data = get_remote_file_server(hostname, model,
                                                                        "%s/slycat_timeseries_%s/waveform_%s_dimensions"
                                                                        ".pickle" % (
                                                                            workdir, uid, file_name))
                waveform_dimensions_array = pickle.loads(waveform_dimensions_data)
                waveform_attributes_data = get_remote_file_server(hostname, model,
                                                                        "%s/slycat_timeseries_%s/waveform_%s_attributes"
                                                                        ".pickle" % (
                                                                            workdir, uid, file_name))
                waveform_attributes_array = pickle.loads(waveform_attributes_data)
                waveform_times_data = get_remote_file_server(hostname, model,
                                                                  "%s/slycat_timeseries_%s/waveform_%s_times"
                                                                  ".pickle" % (
                                                                      workdir, uid, file_name))
                waveform_times_array = pickle.loads(waveform_times_data)
                waveform_values_data = get_remote_file_server(hostname, model,
                                                                    "%s/slycat_timeseries_%s/waveform_%s_values"
                                                                    ".pickle" % (
                                                                        workdir, uid, file_name))
                waveform_values_array = pickle.loads(waveform_values_data)

                # TODO this can become multi processored
                for index in range(int(timeseries_count)):
                    try:
                        model = database.get("model", model["_id"])
                        slycat.web.server.put_model_array(database, model, "preview-%s" % file_name, index,
                                                          waveform_attributes_array[index],
                                                          waveform_dimensions_array[index])
                        model = database.get("model", model["_id"])
                        slycat.web.server.put_model_arrayset_data(database, model, "preview-%s" % file_name,
                                                                  "%s/0/...;%s/1/..." % (index, index),
                                                                  [waveform_times_array[index],
                                                                    waveform_values_array[index]])
                    except:
                        cherrypy.log.error("failed on index: %s" % index)
                        pass
            database = slycat.web.server.database.couchdb.connect()
            model = database.get("model", model_id)
            slycat.web.server.put_model_parameter(database, model, "computing", False)
            cherrypy.log.error("finished Pulling timeseries computed data")
            # TODO add finished to the model state
            # TODO add remove dir command by uncommenting below
            # payload = {
            #     "action": "run_remote_command",
            #     "command": ("rm -rf %s" % workdir_raw)
            # }
        except cherrypy._cperror.HTTPError as e:
            database = slycat.web.server.database.couchdb.connect()
            model = database.get("model", model_id)
            slycat.web.server.put_model_parameter(database, model, "computing", False)
            cherrypy.log.error(traceback.format_exc())
            cherrypy.log.error("Timeseries cperror model compute exception type: %s" % sys.exc_info()[0])
            cherrypy.log.error("Timeseries model compute exception value: %s" % sys.exc_info()[1])
            cherrypy.log.error("Timeseries model compute exception traceback: %s" % sys.exc_info()[2])
            stop_event.set()
        except:
            database = slycat.web.server.database.couchdb.connect()
            model = database.get("model", model_id)
            slycat.web.server.put_model_parameter(database, model, "computing", False)
            cherrypy.log.error(traceback.format_exc())
            cherrypy.log.error("Timeseries model compute exception type: %s" % sys.exc_info()[0])
            cherrypy.log.error("Timeseries model compute exception value: %s" % sys.exc_info()[1])
            cherrypy.log.error("Timeseries model compute exception traceback: %s" % sys.exc_info()[2])
            stop_event.set()

    def get_job_status(hostname, jid):
        """
        returns the job status of a running timeseries job from the cluster called from a thread
        :param tries: number of tries left to use this function
        :param mid: model id
        :param sid: session id for ssh
        :param jid: job id for hpc
        :param stop_event: thread stop event
        :return:
        """
        try:
            response = slycat.web.server.handlers.get_checkjob(hostname, jid)
        except Exception as e:
            cherrypy.log.error("Something went wrong while checking on job %s status %s check ssh session" % (jid,str(e)))
            return {"status": {"state": "ERROR"}}
        return response

    def update_remote_job(mid, jid, hostname):
        """
        Routine that checks on the status of remote
        jobs running on a SLURM infrastructure.

        :param mid:          model ID
        :param sid:          session ID
        :param jid:          job ID
        :param request_from:
        :param stop_event:   event stopping the thread when the job completes
        :param callback:     callback methods when the job successfully completes
        """

        # get the status of the job
        cherrypy.log.error("[Timeseries] Getting job status")
        state = get_job_status(hostname, jid)["status"]["state"]
        if state == 'ERROR':
            raise cherrypy.HTTPError("409 error connecting to check on the job")
        cherrypy.log.error("[Timeseries] checkjob %s returned with status %s" % (jid, state))

        if state in ["RUNNING", "PENDING"]:
            database = slycat.web.server.database.couchdb.connect()
            model = database.get("model", mid)
            if "job_running_time" not in model:
                model["job_running_time"] = datetime.datetime.utcnow().isoformat()
                slycat.web.server.update_model(database, model)

        if state in ["CANCELLED", "REMOVED", "VACATED"]:
            fail_model(mid, "Job %s was cancelled. Exit code %s" % (jid, state))

        if state == "COMPLETED":
            database = slycat.web.server.database.couchdb.connect()
            model = database.get("model", mid)
            if "job_running_time" not in model:
                model["job_running_time"] = datetime.datetime.utcnow().isoformat()
                slycat.web.server.update_model(database, model)
            if "job_completed_time" not in model:
                model["job_completed_time"] = datetime.datetime.utcnow().isoformat()
                slycat.web.server.update_model(database, model)
            """
            Callback for a successful remote job completion. It computes the model
            and successfully completes it.
            """
            cherrypy.log.error("calling compute")
                # now start thread to prevent timing out on large files
            stop_event = threading.Event()
            thread = threading.Thread(target=compute, args=(model["_id"], stop_event))
            thread.start()
            # compute(model["_id"])
            # finish(model["_id"])
            slycat.web.server.put_model_parameter(database, model, "computing", False)

        if state == ["FAILED", "UNKNOWN", "NOTQUEUED"]:
            tries = tries - 1
            cherrypy.log.error("Something went wrong with job %s, trying again..." % jid)


    # TODO verb, type and command might be obsolete
    def checkjob(database, model, verb, type, command, **kwargs):
        """
        Starts a routine to continuously check the status of a remote job.

        :param database:
        :param model:
        :param kwargs: arguments contain hostname, username, jid,
                       function name and parameters, UID
        """
        sid = None
        try:
            database = slycat.web.server.database.couchdb.connect()
            session = database.get("session", cherrypy.request.cookie["slycatauth"].value)
            for host_session in session["sessions"]:
                if host_session["hostname"] == kwargs["hostname"]:
                    sid = host_session["sid"]
                    break
        except Exception as e:
            cherrypy.log.error("could not retrieve host session for remotes %s" % e)
        jid = kwargs["jid"]
        fn = kwargs["fn"]
        fn_params = kwargs["fn_params"]
        uid = kwargs["uid"]
        model_params = [("working_directory", kwargs["working_directory"]), ("username", kwargs["username"]),
                        ("hostname", kwargs["hostname"]), ("sid", sid), ("pickle_uid", uid)]
        for _ in model_params:
            pushed = False
            tries = 10
            while not pushed:
                with slycat.web.server.database.couchdb.db_lock:
                    try:
                        database = slycat.web.server.database.couchdb.connect()
                        model = database.get("model", model["_id"])
                        slycat.web.server.put_model_parameter(database, model, _[0], _[1], input=False)
                        pushed = True
                    except couchdb.http.ResourceConflict:
                        pushed = False
                        cherrypy.log.error("resource conflict eception in param push")
                        time.sleep(1)
                    if tries == 0:
                        raise Exception("failed to update model with params")

        # give some time for the job to be remotely started before starting its
        # checks.
        time.sleep(5)

        database = slycat.web.server.database.couchdb.connect()
        model = database.get("model", model["_id"])
        model["job_submit_time"] = datetime.datetime.utcnow().isoformat()
        slycat.web.server.update_model(database, model)

        update_remote_job(model["_id"], jid, kwargs["hostname"])

    def pull_data(database, model, verb, type, command, **kwargs):
        """
        check if a data pull is allowed
        :param mid: model id
        :return:
        """
        database = slycat.web.server.database.couchdb.connect()
        model = database.get("model", model["_id"])
        try:
            cherrypy.log.error("computing model value:" + str(slycat.web.server.get_model_parameter(database, model, "computing")))
        except KeyError:
            cherrypy.log.error("adding computing artifact")
            slycat.web.server.put_model_parameter(database, model, "computing", False)
            model = database.get("model", model["_id"])
        if model["state"] == "finished":
            raise cherrypy.HTTPError("409 model is in the finished state already")
        if not slycat.web.server.get_model_parameter(database, model, "computing"):
            slycat.web.server.put_model_parameter(database, model, "computing", True)
            cherrypy.log.error("calling update remote job")
            update_remote_job(model["_id"], model["artifact:jid"], model["artifact:hostname"])
            cherrypy.log.error("returning")
            cherrypy.response.headers["content-type"] = "application/json"
            return json.dumps({'status': 'computing'})
        else:
            raise cherrypy.HTTPError("409 compute is currently still running.")

    # Register our new model type
    context.register_model("timeseries", finish)

    # Register custom commands for use by wizards
    context.register_model_command("GET", "timeseries", "pull_data", pull_data)
    context.register_model_command("POST", "timeseries", "checkjob", checkjob)
    context.register_model_command("GET", "timeseries", "media-columns", media_columns)

    # Register a wizard for creating instances of the new model
    context.register_wizard("timeseries", "New Timeseries Model", require={"action": "create", "context": "project"})

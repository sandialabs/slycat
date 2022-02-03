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
    import statistics
    import io
    import tarfile
    try:
        import cpickle as pickle
    except ImportError:
        import pickle
    thread_pool={}

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
                                       finished=datetime.datetime.utcnow().isoformat(), progress=100, message="timeseries model finished uploading all data")

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

    def get_remote_file_server(hostname, model, filename, total_file_delta_time = [], calling_client=None):
        """
        Utility function to fetch remote files.
        :param hostname:
        :param username:
        :param filename: Full filename for the requested file
        :return: tuple with session ID and file content
        """
        sid = get_sid(hostname, model)
        with slycat.web.server.remote.get_session(sid, calling_client) as session:
          import time
          start = time.time()
          file = session.get_file(filename)
          end = time.time()
          delta_time = (end - start)
          total_file_delta_time.append(delta_time)
          return file

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

    def helpGetFile(filename, use_tar, hostname, model, total_file_delta_time,calling_client, input_tar):
        """
        help determin how to get a file either through
        extracting from a tar file or from grabbing the file remotely
        
        Arguments:
            filename {[type]} -- file path
            use_tar {[type]} -- flag for if it should use the tar
            hostname {[type]} -- name of the host system
            model {[type]} -- model from the DB
            total_file_delta_time {[type]} -- array of file load times
            calling_client {[type]} -- ip of the calling client
            input_tar {[type]} -- tar file to read from 
        
        Returns:
            file -- in memory file
        """
        if use_tar:
            return input_tar.extractfile(filename).read()
        else:
            return get_remote_file_server(hostname, model,
                                          filename,
                                          total_file_delta_time,
                                          calling_client)

    def compute(model_id, stop_event, calling_client):
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
            total_file_delta_time = []
            #cherrypy.log.error("in thread")
            # workdir += "/slycat/pickle"  # route to the slycat directory
            start_time = time.time()
            database = slycat.web.server.database.couchdb.connect()
            model = database.get("model", model_id)
            model["model_compute_time"] = datetime.datetime.utcnow().isoformat()
            with slycat.web.server.get_model_lock(model["_id"]):
                database.save(model)
            slycat.web.server.update_model(database, model, state="waiting", message="starting data pull Timeseries")
            model = database.get("model", model_id)
            uid = slycat.web.server.get_model_parameter(database, model, "pickle_uid")
            workdir_raw = slycat.web.server.get_model_parameter(database, model, "working_directory")
            workdir = workdir_raw + "pickle"
            hostname = slycat.web.server.get_model_parameter(database, model, "hostname")
            username = slycat.web.server.get_model_parameter(database, model, "username")

            # get an active session
            sid = get_sid(hostname, model)
            # load inputs
            slycat.web.server.update_model(database, model, progress=50, message="loading inputs")
            use_tar = True
            # keep this blank unless we need it
            pickle_path = ''
            input_tar=None
            try:
                myfiles_tar_gz = get_remote_file_server(hostname, model,
                                                "%s/slycat_timeseries_%s/slycat-timeseries.tar.gz" % (workdir, uid),
                                                total_file_delta_time,
                                                calling_client)
                myfiles_tar_gz = io.BytesIO(myfiles_tar_gz)
                input_tar = tarfile.open(fileobj=myfiles_tar_gz, mode="r:gz")
            except:
                  # looks like the file is too large lets just grab one file at a time
                  use_tar = False
                  pickle_path = "%s/slycat_timeseries_%s/" % (workdir, uid)
            inputs = helpGetFile("%sarrayset_inputs.pickle" % (pickle_path),
                                    use_tar, hostname, model, total_file_delta_time,calling_client, input_tar)
            inputs = pickle.loads(inputs)

            # Decoding potential byte strings
            class MyEncoder(json.JSONEncoder):
                def default(self, obj):
                    if isinstance(obj, numpy.integer):
                        return int(obj)
                    elif isinstance(obj, numpy.floating):
                        return float(obj)
                    elif isinstance(obj, numpy.ndarray):
                        return obj.tolist()
                    elif type(obj) is bytes:
                        return str(obj.decode())
                    else:
                        return super(MyEncoder, self).default(obj)

            inputs = json.loads(json.dumps(inputs, cls=MyEncoder))

            slycat.web.server.put_model_arrayset(database, model, inputs["aid"])
            # load attributes
            slycat.web.server.update_model(database, model, progress=55, message="loading attributes")
            attributes = inputs["attributes"]
            slycat.web.server.put_model_array(database, model, inputs["aid"], 0, attributes, inputs["dimensions"])
            # load attribute data
            data = helpGetFile("%sinputs_attributes_data.pickle" % (pickle_path),
                                use_tar, hostname, model, total_file_delta_time,calling_client, input_tar)
            attributes_data = pickle.loads(data)

            # push attribute arraysets
            # TODO this can become multi processored
            for attribute in range(len(attributes)):
                model = database.get("model", model["_id"])
                slycat.web.server.put_model_arrayset_data(database, model, inputs["aid"], "0/%s/..." % attribute,
                                                          [attributes_data[attribute]])
            # load clusters data
            slycat.web.server.update_model(database, model, progress=60, message="loading cluster data")
            clusters = helpGetFile("%sfile_clusters.json" % (pickle_path),
                                    use_tar, hostname, model, total_file_delta_time,calling_client, input_tar)
            clusters = json.loads(clusters)
            clusters_file = json.JSONDecoder().decode(clusters["file"])
            timeseries_count = json.JSONDecoder().decode(clusters["timeseries_count"])
            slycat.web.server.post_model_file(model["_id"], True, sid,
                                              "%s/slycat_timeseries_%s/file_clusters.out" % (workdir, uid),
                                              clusters["aid"], clusters["parser"], client=calling_client)
            # TODO this can become multi processored
            cherrypy.log.error("Pulling timeseries computed data")
            slycat.web.server.update_model(database, model, progress=65, message="Pulling timeseries computed data for %s cluster files" % len(clusters_file))
            progress = 65
            progress_part = 30/len(clusters_file)
            for file_name in clusters_file:
                progress = progress + progress_part
                slycat.web.server.update_model(database, model, progress=progress, message="loading %s cluster file" % file_name)
                file_cluster_data = helpGetFile("%sfile_cluster_%s.json" % (pickle_path, file_name),
                                    use_tar, hostname, model, total_file_delta_time,calling_client, input_tar)
                file_cluster_attr = json.loads(file_cluster_data)
                slycat.web.server.post_model_file(model["_id"], True, sid,
                                                  "%s/slycat_timeseries_%s/file_cluster_%s.out" % (
                                                      workdir, uid, file_name),
                                                  file_cluster_attr["aid"], file_cluster_attr["parser"], client=calling_client)
                database = slycat.web.server.database.couchdb.connect()
                model = database.get("model", model["_id"])
                slycat.web.server.put_model_arrayset(database, model, "preview-%s" % file_name)

                waveform_dimensions_data = helpGetFile("%swaveform_%s_dimensions.pickle" % (pickle_path, file_name),
                                    use_tar, hostname, model, total_file_delta_time,calling_client, input_tar)
                waveform_dimensions_array = pickle.loads(waveform_dimensions_data)

                waveform_attributes_data = helpGetFile("%swaveform_%s_attributes.pickle" % (pickle_path, file_name),
                                    use_tar, hostname, model, total_file_delta_time,calling_client, input_tar)
                waveform_attributes_array = pickle.loads(waveform_attributes_data)

                waveform_times_data = helpGetFile("%swaveform_%s_times.pickle" % (pickle_path, file_name),
                                    use_tar, hostname, model, total_file_delta_time,calling_client, input_tar)
                waveform_times_array = pickle.loads(waveform_times_data)

                waveform_values_data = helpGetFile("%swaveform_%s_values.pickle" % (pickle_path, file_name),
                                    use_tar, hostname, model, total_file_delta_time,calling_client, input_tar)
                waveform_values_array = pickle.loads(waveform_values_data)

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
            if input_tar:
                input_tar.close()
            database = slycat.web.server.database.couchdb.connect()
            model = database.get("model", model_id)
            slycat.web.server.update_model(database, model, message="finished loading all data")
            slycat.web.server.put_model_parameter(database, model, "computing", False)
            cherrypy.log.error("finished Pulling timeseries computed data")
            finish_time = time.time()
            file_stats = {
              "min": min(total_file_delta_time),
              "max": max(total_file_delta_time),
              "mean": statistics.mean(total_file_delta_time),
              "median": statistics.median(total_file_delta_time),
              "number_of_files_pulled":len(total_file_delta_time),
              "total_time_Pulling_data": sum(total_file_delta_time),
              "total_time": (finish_time - start_time)
            }
            cherrypy.log.error("File Stats %s" % str(file_stats))
            total_file_delta_time = []
            finish(model["_id"])
            stop_event.set()

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

        file = get_remote_file_server(hostname, model, "/home/%s/slurm-%s.out" % (username, model["artifact:jid"]), 
                                total_file_delta_time, 
                                calling_client)

        pulling_time = finish_time - start_time
        compute_start_time = file.decode('utf-8').split('[START]')
        compute_finish_time = file.decode('utf-8').split('[FINISH]')
        compute_run_time = file.decode('utf-8').split('[RUN TIME]')

        database = slycat.web.server.database.couchdb.connect()
        model = database.get("model", model_id)
        model["model_delta_time"] = str(compute_run_time[1].split('\n')[0])
        model["pulling_time"] = pulling_time
        with slycat.web.server.get_model_lock(model["_id"]):
            database.save(model)

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

    def update_remote_job(mid, jid, hostname, calling_client):
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
        database = slycat.web.server.database.couchdb.connect()
        model = database.get("model", mid)
        if state == 'ERROR':
            slycat.web.server.update_model(database, model, progress=0, message="Error")
            slycat.web.server.put_model_parameter(database, model, "computing", False)
            raise cherrypy.HTTPError("409 error connecting to check on the job")
        cherrypy.log.error("[Timeseries] checkjob %s returned with status %s" % (jid, state))

        if state in ["RUNNING", "PENDING"]:
            if state == "RUNNING":
                slycat.web.server.update_model(database, model, progress=10, message="Job is in pending state")
            else:
                slycat.web.server.update_model(database, model, progress=5, message="Job is in pending state")
            slycat.web.server.put_model_parameter(database, model, "computing", False)
            if "job_running_time" not in model and state == "RUNNING":
                model = database.get("model", model["_id"])
                model["job_running_time"] = datetime.datetime.utcnow().isoformat()
                with slycat.web.server.get_model_lock(model["_id"]):
                    database.save(model)

        if state in ["CANCELLED", "REMOVED", "VACATED"]:
            slycat.web.server.put_model_parameter(database, model, "computing", False)
            fail_model(mid, "Job %s was cancelled. Exit code %s" % (jid, state))

        if state == "COMPLETED":
            slycat.web.server.update_model(database, model, progress=50, message="Job is in Completed state")
            if "job_running_time" not in model:
                model = database.get("model", model["_id"])
                model["job_running_time"] = datetime.datetime.utcnow().isoformat()
                with slycat.web.server.get_model_lock(model["_id"]):
                    database.save(model)
            if "job_completed_time" not in model:
                model = database.get("model", model["_id"])
                model["job_completed_time"] = datetime.datetime.utcnow().isoformat()
                with slycat.web.server.get_model_lock(model["_id"]):
                    database.save(model)
            """
            Callback for a successful remote job completion. It computes the model
            and successfully completes it.
            """
            cherrypy.log.error("calling compute")
                # now start thread to prevent timing out on large files

            stop_event = threading.Event()
            # compute(model["_id"], stop_event, calling_client)
            thread = threading.Thread(target=compute, args=(model["_id"], stop_event, calling_client))
            thread_pool[model["_id"]] = thread
            thread_pool[model["_id"]].start()

        if state == ["FAILED", "UNKNOWN", "NOTQUEUED"]:
            cherrypy.log.error("Something went wrong with job %s job state:" % (jid, state))
            slycat.web.server.update_model(database, model, message="Job %s had returned a bad or unknown state from the hpc system" % jid)
            slycat.web.server.put_model_parameter(database, model, "computing", False)

    def update_model_info(database, model, verb, type, command, **kwargs):
        """
        Starts a routine to continuously check the status of a remote job.
        :param database:
        :param model:
        :param kwargs: arguments contain hostname, username, jid,
                       function name and parameters, UID
        """
        slycat.web.server.update_model(database, model, progress=1, message="Job has been sent to slurm")
        model_params = {
          "working_directory": kwargs["working_directory"],
          "username": kwargs["username"],
          "hostname": kwargs["hostname"],
          "pickle_uid": kwargs["uid"],
          "jid": kwargs["jid"],
          "fn": kwargs["fn"],
          "fn_params": kwargs["fn_params"],
          "job_submit_time": datetime.datetime.utcnow().isoformat()
          }
        for key, value in model_params.items():
            slycat.web.server.put_model_parameter(database, model, key, value, input=False)

    def pull_data(database, model, verb, type, command, **kwargs):
        """
        check if a data pull is allowed
        :param mid: model id
        :return:
        """
        calling_client = cherrypy.request.headers.get("x-forwarded-for")
        database = slycat.web.server.database.couchdb.connect()
        model = database.get("model", model["_id"])
        try:
            cherrypy.log.error("computing model value:" + str(slycat.web.server.get_model_parameter(database, model, "computing")))
            if model["_id"] in thread_pool:
                if thread_pool[model["_id"]].is_alive():
                    cherrypy.log.error("computing thread is alive for model %s"%str(model["_id"]))
                else:
                    cherrypy.log.error("computing thread is dead for model %s setting compute to false"%str(model["_id"]))
                    del thread_pool[model["_id"]]
                    slycat.web.server.put_model_parameter(database, model, "computing", False)
            else:
                slycat.web.server.put_model_parameter(database, model, "computing", False)
        except KeyError:
            slycat.web.server.put_model_parameter(database, model, "computing", False)
            model = database.get("model", model["_id"])
        if model["state"] == "finished":
            raise cherrypy.HTTPError("409 model is in the finished state already")
        if not slycat.web.server.get_model_parameter(database, model, "computing"):
            slycat.web.server.put_model_parameter(database, model, "computing", True)
            update_remote_job(model["_id"], model["artifact:jid"], model["artifact:hostname"], calling_client)
            cherrypy.response.headers["content-type"] = "application/json"
            return json.dumps({'status': 'computing'})
        else:
            raise cherrypy.HTTPError("409 compute is currently still running.")

    # Register our new model type
    context.register_model("timeseries", finish)

    # Register custom commands for use by wizards
    context.register_model_command("GET", "timeseries", "pull_data", pull_data)
    context.register_model_command("POST", "timeseries", "update-model-info", update_model_info)
    context.register_model_command("GET", "timeseries", "media-columns", media_columns)

    # Register a wizard for creating instances of the new model
    # Alex disabling creation of new timeseries models on myslycat.com because we need a cluster for it to work.
    # context.register_wizard("timeseries", "New Timeseries Model", require={"action": "create", "context": "project"})

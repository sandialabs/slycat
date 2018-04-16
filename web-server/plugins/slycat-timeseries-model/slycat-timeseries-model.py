# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
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
        """Called to finish the model.  This function must return immediately, so any real work would be done in a separate thread."""
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

    def page_html(database, model):
        """
        Add the HTML representation of the model to the context object.
    
        :param database:
        :param model:
        :return: HTML render for the model
        """
        import pystache

        context = dict()
        context["_id"] = model["_id"]
        context["cluster-type"] = model["artifact:cluster-type"] if "artifact:cluster-type" in model else "null"
        context["cluster-bin-type"] = model[
            "artifact:cluster-bin-type"] if "artifact:cluster-bin-type" in model else "null"
        context["cluster-bin-count"] = model[
            "artifact:cluster-bin-count"] if "artifact:cluster-bin-count" in model else "null"
        return pystache.render(open(os.path.join(os.path.dirname(__file__), "ui.html"), "r").read(), context)

    # def get_remote_file(sid, hostname, username, password, filename):
    #     """
    #     Utility function to fetch remote files.
    #
    #     :param sid:      session ID
    #     :param hostname:
    #     :param username:
    #     :param password:
    #     :param filename: Full path for the requested file
    #     :return: tuple with session ID and file content
    #     """
    #     try:
    #         data = slycat.web.server.get_remote_file(sid, filename)
    #     except:
    #         sid = slycat.web.server.create_session(hostname, username, password)
    #         data = slycat.web.server.get_remote_file(sid, filename)
    #     return sid, data

    def get_remote_file_server(client, sid, filename):
        """
        Utility function to fetch remote files.

        :param client:
        :param sid:      session ID
        :param hostname:
        :param username:
        :param password:
        :param filename: Full path for the requested file
        :return: tuple with session ID and file content
        """
        return slycat.web.server.get_remote_file_server(client, sid, filename)

    def get_sid(hostname, model):
        """

        :param hostname:
        :param model:
        :return:
        """
        sid = None
        cherrypy.log.error(str(hostname))
        try:
            cherrypy.log.error("getting db")
            database = slycat.web.server.database.couchdb.connect()
            cherrypy.log.error("getting session for %s" % model["creator"])
            sessions = [session for session in database.scan("slycat/sessions") if
                        session["creator"] == model["creator"]]
            if len(sessions) > 1:
                cherrypy.log.error("to many user sessions %s" % str(sessions))
                raise Exception("to many user sessions")
            for host_session in sessions[0]["sessions"]:  # our session should be in index 0 or else something
                # went wrong
                cherrypy.log.error("hostname %s" % str(host_session))
                if host_session["hostname"] == hostname:
                    sid = host_session["sid"]
                    break
        except Exception as e:
            cherrypy.log.error("[Timeseries] session exception type: %s" % sys.exc_info()[0])
            cherrypy.log.error("[Timeseries] session exception value: %s" % sys.exc_info()[1])
            cherrypy.log.error("[Timeseries] session exception traceback: %s" % sys.exc_info()[2])
            cherrypy.log.error(
                "[Timeseries] could not retrieve host session for remotes %s in timeseries compute function "
                "did you create this time series?")
            raise Exception(
                "[Timeseries] exeception message %s" % e.message)
        if sid is None:
            database = slycat.web.server.database.couchdb.connect()
            model = database.get("model", model["_id"])
            slycat.web.server.update_model(database, model,
                                           message="data was computed, but can't be pulled over because the server "
                                                   "needs an active ssh session to the host in order to get your data")
            raise Exception(
                "data was computed, but can't be pulled over because the server needs an active ssh session to the "
                "host in order to get your data")
        cherrypy.log.error("got sid")
        return sid

    def compute(model_id, password):
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
        :param password:
        """
        cherrypy.log.error("in thread")
        # workdir += "/slycat/pickle"  # route to the slycat directory
        database = slycat.web.server.database.couchdb.connect()
        model = database.get("model", model_id)
        slycat.web.server.put_model_parameter(database, model, "computing", True)
        computing = True

        database = slycat.web.server.database.couchdb.connect()
        model = database.get("model", model_id)
        model["model_compute_time"] = datetime.datetime.utcnow().isoformat()
        slycat.web.server.update_model(database, model, state="waiting")
        tries = 10
        while computing:
            tries = tries - 1
            if tries <= 0:
                database = slycat.web.server.database.couchdb.connect()
                model = database.get("model", model_id)
                slycat.web.server.put_model_parameter(database, model, "computing", False)
                computing = False
                fail_model(model_id, "Exceeded max number of tries to pull data over to the server.")
                cherrypy.log.error("[TIMESERIES] Exceeded max number of tries to pull data.")
                raise Exception("Exceeded max number of tries to pull data over to the server.")
            try:
                uid = slycat.web.server.get_model_parameter(database, model, "pickle_uid")
                workdir_raw = slycat.web.server.get_model_parameter(database, model, "working_directory")
                workdir = workdir_raw + "pickle"
                hostname = slycat.web.server.get_model_parameter(database, model, "hostname")
                username = slycat.web.server.get_model_parameter(database, model, "username")

                # get an active session
                sid = get_sid(hostname, model)

                cherrypy.log.error("sid:%s uid:%s work_dir:%s host:%s user:%s" % (
                    sid, uid, workdir, hostname, username))
                inputs = get_remote_file_server(model["creator"], sid,
                                                "%s/slycat_timeseries_%s/arrayset_inputs.pickle" % (workdir, uid))
                cherrypy.log.error("got inputs")
                inputs = pickle.loads(inputs)

                slycat.web.server.put_model_arrayset(database, model, inputs["aid"])
                attributes = inputs["attributes"]
                slycat.web.server.put_model_array(database, model, inputs["aid"], 0, attributes, inputs["dimensions"])

                data = get_remote_file_server(model["creator"], sid,
                                              "%s/slycat_timeseries_%s/inputs_attributes_data.pickle" % (workdir, uid))
                attributes_data = pickle.loads(data)

                # TODO this can become multi processored
                for attribute in range(len(attributes)):
                    slycat.web.server.put_model_arrayset_data(database, model, inputs["aid"], "0/%s/..." % attribute,
                                                              [attributes_data[attribute]])

                clusters = json.loads(
                    slycat.web.server.get_remote_file_server(model["creator"], sid,
                                                      "%s/slycat_timeseries_%s/file_clusters.json" % (workdir, uid)))
                clusters_file = json.JSONDecoder().decode(clusters["file"])
                timeseries_count = json.JSONDecoder().decode(clusters["timeseries_count"])

                slycat.web.server.post_model_file(model["_id"], True, sid,
                                                  "%s/slycat_timeseries_%s/file_clusters.out" % (workdir, uid),
                                                  clusters["aid"], clusters["parser"], client=model["creator"])
                # TODO this can become multi processored
                cherrypy.log.error("Pulling timeseries computed data")
                for file_name in clusters_file:
                    file_cluster_data = get_remote_file_server(model["creator"], sid,
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

                    waveform_dimensions_data = get_remote_file_server(model["creator"], sid,
                                                                           "%s/slycat_timeseries_%s/waveform_%s_dimensions"
                                                                           ".pickle" % (
                                                                               workdir, uid, file_name))
                    waveform_dimensions_array = pickle.loads(waveform_dimensions_data)
                    waveform_attributes_data = get_remote_file_server(model["creator"], sid,
                                                                           "%s/slycat_timeseries_%s/waveform_%s_attributes"
                                                                           ".pickle" % (
                                                                               workdir, uid, file_name))
                    waveform_attributes_array = pickle.loads(waveform_attributes_data)
                    waveform_times_data = get_remote_file_server(model["creator"], sid,
                                                                      "%s/slycat_timeseries_%s/waveform_%s_times"
                                                                      ".pickle" % (
                                                                          workdir, uid, file_name))
                    waveform_times_array = pickle.loads(waveform_times_data)
                    waveform_values_data = get_remote_file_server(model["creator"], sid,
                                                                       "%s/slycat_timeseries_%s/waveform_%s_values"
                                                                       ".pickle" % (
                                                                           workdir, uid, file_name))
                    waveform_values_array = pickle.loads(waveform_values_data)

                    # cherrypy.log.error("timeseries_count=%s" % timeseries_count)

                    # TODO this can become multi processored
                    for index in range(int(timeseries_count)):
                        try:
                            slycat.web.server.put_model_array(database, model, "preview-%s" % file_name, index,
                                                              waveform_attributes_array[index],
                                                              waveform_dimensions_array[index])
                            slycat.web.server.put_model_arrayset_data(database, model, "preview-%s" % file_name,
                                                                      "%s/0/...;%s/1/..." % (index, index),
                                                                      [waveform_times_array[index],
                                                                       waveform_values_array[index]])
                        except:
                            cherrypy.log.error("failed on index: %s" % index)
                            pass
                database = slycat.web.server.database.couchdb.connect()
                model = database.get("model", model_id)
                model["computing"] = False
                slycat.web.server.update_model(database, model)
                computing = False
                cherrypy.log.error("finnished Pulling timeseries computed data")
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
                cherrypy.log.error("Timeseries model compute exception type: %s" % sys.exc_info()[0])
                cherrypy.log.error("Timeseries model compute exception value: %s" % sys.exc_info()[1])
                cherrypy.log.error("Timeseries model compute exception traceback: %s" % sys.exc_info()[2])
                raise Exception(e.message)
            except Exception as e:
                database = slycat.web.server.database.couchdb.connect()
                model = database.get("model", model_id)
                slycat.web.server.put_model_parameter(database, model, "computing", False)
                cherrypy.log.error("Timeseries model compute exception type: %s" % sys.exc_info()[0])
                cherrypy.log.error("Timeseries model compute exception value: %s" % sys.exc_info()[1])
                cherrypy.log.error("Timeseries model compute exception traceback: %s" % sys.exc_info()[2])
                # fail_model(model_id, "Timeseries model compute exception: %s" % sys.exc_info()[0])
                raise Exception(e.message)

        database = slycat.web.server.database.couchdb.connect()
        model = database.get("model", model_id)
        slycat.web.server.delete_model_parameter(database, model, "computing")

    def get_job_status(tries, mid, sid, jid, stop_event):
        """
        returns the job status of a running timeseries job from the cluster called from a thread
        :param tries: number of tries left to use this function
        :param mid: model id
        :param sid: session id for ssh
        :param jid: job id for hpc
        :param stop_event: thread stop event
        :return:
        """
        if tries <= 0:
            cherrypy.log.error("[TIMESERIES] Check job tries exceeded max number.")
            fail_model(mid, "Check job tries exceeded max number")
            stop_event.set()
            raise Exception("An error occurred while checking on a remote job: %s" % jid)
        try:
            response = slycat.web.server.checkjob(sid, jid)
        except Exception as e:
            tries = tries - 1
            if tries == 0:
                fail_model(mid,
                           "Something went wrong while checking on job %s status: check for the generated files "
                           "when the job completes." % jid)
                cherrypy.log.error("[TIMESERIES] An error occurred while checking on a remote job error_message: %s"
                                   % e.message)
                stop_event.set()
                raise Exception("An error occurred while checking on a remote job: %s" % jid)
            cherrypy.log.error("Something went wrong while checking on job %s status, trying again..." % jid)
            response = {"status": {"state": "ERROR"}}
            time.sleep(15)
        return response

    # TODO this function needs to be migrated to the implementation of the computation interface
    def checkjob_thread(mid, sid, jid, request_from, stop_event, callback):
        """
        Routine running on a separate thread which checks on the status of remote
        jobs running on a SLURM infrastructure.

        :param mid:          model ID
        :param sid:          session ID
        :param jid:          job ID
        :param request_from:
        :param stop_event:   event stopping the thread when the job completes
        :param callback:     callback methods when the job successfully completes
        """
        cherrypy.request.headers["x-forwarded-for"] = request_from

        tries = 100
        running = True

        while running:
            # get the status of the job
            state = get_job_status(tries, mid, sid, jid, stop_event)["status"]["state"]
            cherrypy.log.error("[Timeseries] checkjob %s returned with status %s" % (jid, state))

            if state in ["RUNNING", "PENDING"]:
                database = slycat.web.server.database.couchdb.connect()
                model = database.get("model", mid)
                if "job_running_time" not in model:
                    model["job_running_time"] = datetime.datetime.utcnow().isoformat()
                    slycat.web.server.update_model(database, model)

            if state in ["CANCELLED", "REMOVED", "VACATED", "REMOVED"]:
                fail_model(mid, "Job %s was cancelled. Exit code %s" % (jid, state))
                stop_event.set()
                break

            if state == "COMPLETED":
                database = slycat.web.server.database.couchdb.connect()
                model = database.get("model", mid)
                if "job_running_time" not in model:
                    model["job_running_time"] = datetime.datetime.utcnow().isoformat()
                    slycat.web.server.update_model(database, model)
                if "job_completed_time" not in model:
                    model["job_completed_time"] = datetime.datetime.utcnow().isoformat()
                    slycat.web.server.update_model(database, model)

                callback()
                stop_event.set()
                break

            if state == ["FAILED", "UNKNOWN", "NOTQUEUED"]:
                tries = tries - 1
                cherrypy.log.error("Something went wrong with job %s, trying again..." % jid)

            # waits 10 seconds in between each status check
            time.sleep(10)

    # TODO verb, type and command might be obsolete
    def checkjob(database, model, verb, type, command, **kwargs):
        """
        Starts a routine to continuously check the status of a remote job.

        :param database:
        :param model:
        :param kwargs: arguments contain hostname, username, password, jid,
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
            cherrypy.log.error("could not retrieve host session for remotes %s going to create one" % e)
        if sid is None:
            sid = slycat.web.server.create_session(kwargs["hostname"], kwargs["username"], kwargs["password"])
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

        def callback():
            """
            Callback for a successful remote job completion. It computes the model
            and successfully completes it.
            """
            compute(model["_id"], kwargs["password"])
            finish(model["_id"])

        # give some time for the job to be remotely started before starting its
        # checks.
        time.sleep(5)

        database = slycat.web.server.database.couchdb.connect()
        model = database.get("model", model["_id"])
        model["job_submit_time"] = datetime.datetime.utcnow().isoformat()
        slycat.web.server.update_model(database, model)

        stop_event = threading.Event()
        t = threading.Thread(target=checkjob_thread, args=(
            model["_id"], sid, jid, cherrypy.request.headers.get("x-forwarded-for"), stop_event, callback))
        t.start()

    def pull_data(database, model, verb, type, command, **kwargs):
        """
        check if a data pull is allowed, if so
        :param mid: model id
        :return:
        """

        def pull(mid):
            """
            thread for pulling data back to the server
            :param mid: model id
            :return:
            """
            # giving compute a none password as we should already have a session at this point
            cherrypy.log.error("calling compute")
            compute(mid, password=None)
            finish(mid)

        database = slycat.web.server.database.couchdb.connect()
        model = database.get("model", model["_id"])
        try:
            cherrypy.log.error(
                "computing model value:" + str(slycat.web.server.get_model_parameter(database, model, "computing")))
        except KeyError:
            cherrypy.log.error("adding computing artifact")
            slycat.web.server.put_model_parameter(database, model, "computing", False)
        if model["state"] == "finished":
            raise cherrypy.HTTPError("409 model is in the finished state already")
        if not slycat.web.server.get_model_parameter(database, model, "computing"):
            t = threading.Thread(target=pull, args=([model["_id"]]))
            t.start()
        else:
            raise cherrypy.HTTPError("409 compute is currently still running.")

    # Register our new model type
    context.register_model("timeseries", finish)

    context.register_page("timeseries", page_html)

    context.register_page_bundle("timeseries", "text/css", [
        os.path.join(os.path.dirname(__file__), "css/jquery-ui/jquery-ui.css"),
        os.path.join(os.path.dirname(__file__), "css/jquery-ui/jquery.ui.theme.css"),
        os.path.join(os.path.dirname(__file__), "css/jquery-ui/jquery.ui.resizable.css"),
        os.path.join(os.path.dirname(__file__), "css/slickGrid/slick.grid.css"),
        os.path.join(os.path.dirname(__file__), "css/slickGrid/slick-default-theme.css"),
        os.path.join(os.path.dirname(__file__), "css/slickGrid/slick.headerbuttons.css"),
        os.path.join(os.path.dirname(__file__), "css/slickGrid/slick-slycat-theme.css"),
        os.path.join(os.path.dirname(__file__), "css/ui.css"),
    ])
    context.register_page_bundle("timeseries", "text/javascript", [
        os.path.join(os.path.dirname(__file__), "js/jquery-ui-1.10.4.custom.min.js"),
        os.path.join(os.path.dirname(__file__), "js/jquery.layout-latest.min.js"),
        os.path.join(os.path.dirname(__file__), "js/jquery.knob.js"),
        os.path.join(os.path.dirname(__file__), "js/d3.min.js"),
        os.path.join(os.path.dirname(__file__), "js/chunker.js"),
        os.path.join(os.path.dirname(__file__), "js/color-switcher.js"),
        os.path.join(os.path.dirname(__file__), "js/timeseries-cluster.js"),
        os.path.join(os.path.dirname(__file__), "js/timeseries-dendrogram.js"),
        os.path.join(os.path.dirname(__file__), "js/timeseries-waveformplot.js"),
        os.path.join(os.path.dirname(__file__), "js/timeseries-table.js"),
        os.path.join(os.path.dirname(__file__), "js/timeseries-legend.js"),
        os.path.join(os.path.dirname(__file__), "js/timeseries-controls.js"),
        os.path.join(os.path.dirname(__file__), "js/slickGrid/jquery.event.drag-2.2.js"),
        os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.core.js"),
        os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.grid.js"),
        os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.rowselectionmodel.js"),
        os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.headerbuttons.js"),
        os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.autotooltips.js"),
        # For development and debugging, loading some js dynamically inside model.
        # os.path.join(os.path.dirname(__file__), "js/ui.js"),
    ])
    context.register_page_resource("timeseries", "images", os.path.join(os.path.dirname(__file__), "images"))

    # Register jquery-ui images
    images = [
        # for stickies
        'ui-bg_flat_0_aaaaaa_40x100.png',
        'ui-icons_222222_256x240.png',
        'ui-bg_highlight-soft_75_cccccc_1x100.png',
        'ui-bg_flat_75_ffffff_40x100.png',
        'ui-bg_glass_75_e6e6e6_1x400.png',
    ]
    for image in images:
        context.register_page_resource("timeseries", image, os.path.join(os.path.dirname(__file__), "images", image))

    devs = [
        # "js/parameter-image-dendrogram.js",
        # "js/parameter-image-scatterplot.js",
        "js/ui.js",
    ]
    for dev in devs:
        context.register_page_resource("timeseries", dev, os.path.join(os.path.dirname(__file__), dev))

    # Register custom commands for use by wizards
    context.register_model_command("GET", "timeseries", "pull_data", pull_data)
    context.register_model_command("POST", "timeseries", "checkjob", checkjob)
    context.register_model_command("GET", "timeseries", "media-columns", media_columns)

    # Register a wizard for creating instances of the new model
    context.register_wizard("timeseries", "New Timeseries Model", require={"action": "create", "context": "project"})
    context.register_wizard_resource("timeseries", "ui.js", os.path.join(os.path.dirname(__file__), "wizard-ui.js"))
    context.register_wizard_resource("timeseries", "ui.html", os.path.join(os.path.dirname(__file__), "wizard-ui.html"))

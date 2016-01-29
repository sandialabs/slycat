def register_slycat_plugin(context):
  """Called during startup when the plugin is loaded."""
  import cherrypy
  import datetime
  import time
  import os
  import json
  import slycat.web.server
  import threading
  try:
    import cpickle as pickle
  except:
    import pickle

  def finish(database, model):
    """Called to finish the model.  This function must return immediately, so any real work would be done in a separate thread."""
    slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def page_html(database, model):
    """Add the HTML representation of the model to the context object."""
    import json
    import pystache

    context = dict()
    # context["formatted-model"] = json.dumps(model, indent=2, sort_keys=True)
    # context["name"] = model["name"];
    # context["full-project"] = database.get("project", model["project"]);
    context["_id"] = model["_id"];
    context["cluster-type"] = model["artifact:cluster-type"] if "artifact:cluster-type" in model else "null"
    context["cluster-bin-type"] = model["artifact:cluster-bin-type"] if "artifact:cluster-bin-type" in model else "null"
    context["cluster-bin-count"] = model["artifact:cluster-bin-count"] if "artifact:cluster-bin-count" in model else "null"
    return pystache.render(open(os.path.join(os.path.dirname(__file__), "ui.html"), "r").read(), context)

  def compute(database, model, sid, uid, username):
    inputs = json.loads(slycat.web.server.get_remote_file(sid, "/home/%s/slycat_timeseries_%s/arrayset_inputs.json" % (username, uid)))
    cherrypy.log.error("***** inputs")
    cherrypy.log.error("%s" % inputs)

    slycat.web.server.put_model_arrayset(database, model, "inputs")
    attributes = inputs["attributes"]
    slycat.web.server.put_model_array(database, model, "inputs", 0, attributes, inputs["dimensions"])

    inputs_attributes_data = slycat.web.server.get_remote_file(sid, "/home/%s/slycat_timeseries_%s/inputs_attributes_data.pickle" % (username, uid))
    inputs_attributes_data = pickle.loads(inputs_attributes_data)

    for attribute in range(len(attributes)):
      data = inputs_attributes_data["%s" % attribute]
      cherrypy.log.error("***** data")
      cherrypy.log.error("%s" % [data])
      slycat.web.server.put_model_arrayset_data(database, model, "inputs", "0/%s/..." % attribute, [data])

    clusters = json.loads(slycat.web.server.get_remote_file(sid, "/home/%s/slycat_timeseries_%s/file_clusters.json" % (username, uid)))
    clusters_file = json.JSONDecoder().decode(clusters["file"])

    clusters_files_content = {}
    for f in clusters_file:
      clusters_files_content["cluster-%s" % f] = json.loads(slycat.web.server.get_remote_file(sid, "/home/%s/slycat_timeseries_%s/file_cluster_%s.json" % (username, uid, f)))

    cherrypy.log.error("***** clusters file content")
    cherrypy.log.error("%s" % clusters_files_content)

  def fail_model(mid, message):
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    slycat.web.server.update_model(database, model, state="finished", result="failed", finished=datetime.datetime.utcnow().isoformat(), message=message)

  def checkjob_thread(mid, sid, jid, request_from, stop_event, callback):
    cherrypy.request.headers["x-forwarded-for"] = request_from

    while True:
      try:
        response = slycat.web.server.checkjob(sid, jid)
      except Exception as e:
        fail_model(mid, "Something went wrong while checking on job %s status: check for the generated files when the job completes." % jid)
        slycat.email.send_error("slycat-timeseries-model.py checkjob_thread", "An error occurred while checking on a remote job: %s" % e.message)
        raise Exception("An error occurred while checking on a remote job: %s" % e.message)
        stop_event.set()

      state = response["status"]["state"]
      cherrypy.log.error("checkjob %s returned with status %s" % (jid, state))

      if state == "CANCELLED":
        fail_model(mid, "Job %s was cancelled." % jid)
        stop_event.set()
        break

      if state == "FAILED":
        fail_model(mid, "Job %s has failed." % jid)
        stop_event.set()
        break

      if state == "COMPLETED":
        callback()
        stop_event.set()
        break

      time.sleep(5)


  def checkjob(database, model, verb, type, command, **kwargs):
    sid = slycat.web.server.create_session(kwargs["hostname"], kwargs["username"], kwargs["password"])
    jid = kwargs["jid"]
    fn = kwargs["fn"]
    uid = kwargs["uid"]
    username = kwargs["username"]

    def callback():
      compute(database, model, sid, uid, username)
      finish(database, model)

    stop_event = threading.Event()
    t = threading.Thread(target=checkjob_thread, args=(model["_id"], sid, jid, cherrypy.request.headers.get("x-forwarded-for"), stop_event, callback))
    t.start()

  # Register our new model type
  context.register_model("timeseries", finish)

  context.register_page("timeseries", page_html)

  context.register_page_bundle("timeseries", "text/css", [
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
    os.path.join(os.path.dirname(__file__), "js/slickGrid/jquery.event.drag-2.2.js"),
    os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.core.js"),
    os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.grid.js"),
    os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.rowselectionmodel.js"),
    os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.headerbuttons.js"),
    os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.autotooltips.js"),
    #For development and debugging, loading some js dynamically inside model.
    #os.path.join(os.path.dirname(__file__), "js/ui.js"),
    ])
  context.register_page_resource("timeseries", "images", os.path.join(os.path.dirname(__file__), "images"))

  devs = [
    # "js/parameter-image-dendrogram.js",
    # "js/parameter-image-scatterplot.js",
    "js/ui.js",
  ]
  for dev in devs:
    context.register_page_resource("timeseries", dev, os.path.join(os.path.dirname(__file__), dev))

  # Register custom commands for use by wizards
  context.register_model_command("POST", "timeseries", "checkjob", checkjob)

  # Register a wizard for creating instances of the new model
  context.register_wizard("timeseries", "New Timeseries Model", require={"action":"create", "context":"project"})
  context.register_wizard_resource("timeseries", "ui.js", os.path.join(os.path.dirname(__file__), "wizard-ui.js"))
  context.register_wizard_resource("timeseries", "ui.html", os.path.join(os.path.dirname(__file__), "wizard-ui.html"))

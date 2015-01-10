def register_slycat_plugin(context):
  import os

  # Register the linear-regression-demo model.
  def compute(mid):
    import cherrypy
    import datetime
    import numpy
    import scipy.stats
    import slycat.web.server.database.couchdb

    try:
      database = slycat.web.server.database.couchdb.connect()
      model = database.get("model", mid)

      # Get required inputs ...
      data_table = slycat.web.server.model.load_hdf5_artifact(model, "data-table")
      input_column = slycat.web.server.get_model_parameter(database, model, "x-column")
      output_column = slycat.web.server.get_model_parameter(database, model, "y-column")

      if input_column is None:
        raise Exception("Linear regression model requires an input column.")
      if output_column is None:
        raise Exception("Linear regression model requires an output column.")

      # Extract a column of x values and a column of y values.
      with slycat.web.server.database.hdf5.open(data_table) as file:
        array = slycat.hdf5.ArraySet(file)[0]
        x = array.get_data(input_column)[...]
        slycat.web.server.update_model(database, model, progress=0.25)
        y = array.get_data(output_column)[...]
        slycat.web.server.update_model(database, model, progress=0.50)

      # Remove rows containing NaNs.
      xy = numpy.column_stack((x, y))
      good = numpy.invert(numpy.any(numpy.isnan(xy), axis=1))
      xy = xy[good]

      # Compute the linear regression.
      slycat.web.server.update_model(database, model, message="Computing linear regression.")
      slope, intercept, r, p, error = scipy.stats.linregress(xy)
      regression = dict(slope=slope, intercept=intercept, r=r, p=p, error=error)
      slycat.web.server.update_model(database, model, progress=0.75)

      # Store the results.
      slycat.web.server.update_model(database, model, message="Storing results.")
      slycat.web.server.put_model_parameter(database, model, "regression", regression)
      slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

    except:
      import traceback
      cherrypy.log.error("%s" % traceback.format_exc())

      database = slycat.web.server.database.couchdb.connect()
      model = database.get("model", mid)
      slycat.web.server.update_model(database, model, state="finished", result="failed", finished=datetime.datetime.utcnow().isoformat(), message=traceback.format_exc())

  def finish_model(database, model):
    """Called to finish the model.  This function must return immediately, so the actual work is done in a separate thread."""
    import threading
    thread = threading.Thread(name="Compute Linear Regression Demo Model", target=compute, kwargs={"mid" : model["_id"]})
    thread.start()

  def model_html(database, model):
    return open(os.path.join(os.path.dirname(__file__), "ui.html"), "r").read()

  context.register_model("linear-regression-demo", finish_model, model_html)
  context.register_model_bundle("linear-regression-demo", "text/javascript", [
    os.path.join(os.path.dirname(__file__), "d3.min.js"),
    os.path.join(os.path.dirname(__file__), "ui.js"),
    ])

  # Register a wizard for creating instances of the bookmark-demo model.
  context.register_wizard("linear-regression-demo", "Linear Regression Demo Model", require={"project":True})
  context.register_wizard_resource("linear-regression-demo", "ui.js", os.path.join(os.path.dirname(__file__), "wizard-ui.js"))
  context.register_wizard_resource("linear-regression-demo", "ui.html", os.path.join(os.path.dirname(__file__), "wizard-ui.html"))

# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
  import os

  # Register the linear-regression-demo model.
  def compute(mid):
    import cherrypy
    import datetime
    import numpy
    import scipy.stats
    import slycat.web.server.database.couchdb
    import slycat.email

    try:
      database = slycat.web.server.database.couchdb.connect()
      model = database.get("model", mid)

      # Get required inputs ...
      input_column = slycat.web.server.get_model_parameter(database, model, "x-column")
      output_column = slycat.web.server.get_model_parameter(database, model, "y-column")

      if input_column is None:
        slycat.email.send_error("slycat-linear-regression-demo.py compute", "Linear regression model requires an input column.")
        raise Exception("Linear regression model requires an input column.")
      if output_column is None:
        slycat.email.send_error("slycat-linear-regression-demo.py compute", "Linear regression model requires an output column.")
        raise Exception("Linear regression model requires an output column.")

      # Extract a column of x values and a column of y values.
      x = next(slycat.web.server.get_model_arrayset_data(database, model, "data-table", "0/%s/..." % input_column))
      slycat.web.server.update_model(database, model, progress=0.25)
      y = next(slycat.web.server.get_model_arrayset_data(database, model, "data-table", "0/%s/..." % output_column))
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

  def page_html(database, model):
    return open(os.path.join(os.path.dirname(__file__), "ui.html"), "r").read()

  context.register_model("linear-regression-demo", finish_model)

  context.register_page("linear-regression-demo", page_html)

  context.register_page_bundle("linear-regression-demo", "text/javascript", [
    os.path.join(os.path.dirname(__file__), "d3.min.js"),
    os.path.join(os.path.dirname(__file__), "ui.js"),
    ])

  # Register a wizard for creating instances of the bookmark-demo model.
  context.register_wizard("linear-regression-demo", "New Linear Regression Demo Model", require={"action":"create", "context":"project"})
  context.register_wizard_resource("linear-regression-demo", "ui.js", os.path.join(os.path.dirname(__file__), "wizard-ui.js"))
  context.register_wizard_resource("linear-regression-demo", "ui.html", os.path.join(os.path.dirname(__file__), "wizard-ui.html"))

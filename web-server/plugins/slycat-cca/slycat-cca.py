# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
  """Called during startup when the plugin is loaded."""
  import cherrypy
  import datetime
  import os
  import numpy
  import slycat.cca
  import slycat.web.server
  import slycat.web.server.database.couchdb
  
  import threading
  import traceback
  import time

  def compute(mid):
    try:
      database = slycat.web.server.database.couchdb.connect()
      model = database.get("model", mid)
      start = time.time()
      # Get required inputs ...
      metadata = slycat.web.server.get_model_arrayset_metadata(database, model, "data-table")
      input_columns = slycat.web.server.get_model_parameter(database, model, "input-columns")
      output_columns = slycat.web.server.get_model_parameter(database, model, "output-columns")
      scale_inputs = slycat.web.server.get_model_parameter(database, model, "scale-inputs")

      # double check the number of inputs and outputs
      if len(input_columns) < 1:
        cherrypy.log.error("slycat-cca.py compute", "CCA model requires at least one input column.")
        raise Exception("CCA model requires at least one input column.")
      if len(output_columns) < 1:
        cherrypy.log.error("slycat-cca.py compute", "CCA model requires at least one output column.")
        raise Exception("CCA model requires at least one output column.")

      # Transform the input data table to a form usable with our cca() function ...
      row_count = metadata[0]["shape"][0]
      indices = numpy.arange(row_count, dtype="int32")
      input_attributes = "|".join([str(column) for column in input_columns])
      X = numpy.column_stack(list(slycat.web.server.get_model_arrayset_data(database, model, "data-table", "0/%s/..." % input_attributes)))
      slycat.web.server.update_model(database, model, progress=0.25)

      output_attributes = "|".join([str(column) for column in output_columns])
      Y = numpy.column_stack(list(slycat.web.server.get_model_arrayset_data(database, model, "data-table", "0/%s/..." % output_attributes)))
      slycat.web.server.update_model(database, model, progress=0.50)

      # Remove rows containing NaNs ...
      good = numpy.invert(numpy.any(numpy.isnan(numpy.hstack((X, Y))), axis=1))
      indices = indices[good]
      X = X[good]
      Y = Y[good]

      # Compute the CCA ...
      slycat.web.server.update_model(database, model, message="Computing CCA.")
      x, y, x_loadings, y_loadings, r, wilks = slycat.cca.cca(X, Y, scale_inputs=scale_inputs)
      slycat.web.server.update_model(database, model, progress=0.75)

      slycat.web.server.update_model(database, model, message="Storing results.")
      component_count = x.shape[1]
      sample_count = x.shape[0]

      # Store canonical variable indices (scatterplot indices) as a |sample| vector of indices ...
      slycat.web.server.put_model_arrayset(database, model, "canonical-indices")
      slycat.web.server.put_model_array(database, model, "canonical-indices", 0, [dict(name="index", type="int32")],[dict(name="sample", end=sample_count)])
      slycat.web.server.put_model_arrayset_data(database, model, "canonical-indices", "0/0/...", [indices])

      # Store canonical variables (scatterplot data) as a component x sample matrix of x/y attributes ...
      slycat.web.server.put_model_arrayset(database, model, "canonical-variables")
      slycat.web.server.put_model_array(database, model, "canonical-variables", 0, [dict(name="input", type="float64"), dict(name="output", type="float64")], [dict(name="component", end=component_count), dict(name="sample", end=sample_count)])
      slycat.web.server.put_model_arrayset_data(database, model, "canonical-variables", "0/0/...;0/1/...", [x.T, y.T])
      slycat.web.server.update_model(database, model, progress=0.80)

      # Store structure correlations (barplot data) as a component x variable matrix of correlation attributes ...
      slycat.web.server.put_model_arrayset(database, model, "input-structure-correlation")
      slycat.web.server.put_model_array(database, model, "input-structure-correlation", 0, [dict(name="correlation", type="float64")], [dict(name="component", end=component_count), dict(name="input", end=len(input_columns))])
      slycat.web.server.put_model_arrayset_data(database, model, "input-structure-correlation", "0/0/...", [x_loadings.T])
      slycat.web.server.update_model(database, model, progress=0.85)

      slycat.web.server.put_model_arrayset(database, model, "output-structure-correlation")
      slycat.web.server.put_model_array(database, model, "output-structure-correlation", 0, [dict(name="correlation", type="float64")], [dict(name="component", end=component_count), dict(name="output", end=len(output_columns))])
      slycat.web.server.put_model_arrayset_data(database, model, "output-structure-correlation", "0/0/...", [y_loadings.T])
      slycat.web.server.update_model(database, model, progress=0.90)

      # Store statistics as a vector of component r2/p attributes
      slycat.web.server.put_model_arrayset(database, model, "cca-statistics")
      slycat.web.server.put_model_array(database, model, "cca-statistics", 0, [dict(name="r2", type="float64"), dict(name="p", type="float64")], [dict(name="component", end=component_count)])
      slycat.web.server.put_model_arrayset_data(database, model, "cca-statistics", "0/0/...;0/1/...", [r, wilks])

      slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")
      end  = time.time()
      model["analysis_computation_time"] = (end - start)
      database.save(model)
    except:
      cherrypy.log.error("%s" % traceback.format_exc())

      database = slycat.web.server.database.couchdb.connect()
      model = database.get("model", mid)
      slycat.web.server.update_model(database, model, state="finished", result="failed", finished=datetime.datetime.utcnow().isoformat(), message=traceback.format_exc())

  def finish(database, model):
    """Called to finish the model.  This function must return immediately, so the actual work is done in a separate thread."""
    thread = threading.Thread(name="Compute CCA Model", target=compute, kwargs={"mid" : model["_id"]})
    thread.start()

  # Register our new model type
  context.register_model("cca", finish)

  # Register custom wizards for creating CCA models.
  context.register_wizard("new-cca", "New CCA Model", require={"action":"create", "context":"project"})
  context.register_wizard("rerun-cca", "Modified CCA Model", require={"action":"create", "context":"model", "model-type":["cca"]})
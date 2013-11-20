# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from slycat.web.server.cca import cca

import cherrypy
import datetime
import numpy
import slycat.web.server.database.couchdb
import slycat.web.server.database.hdf5
import slycat.web.server.model
import threading
import time
import traceback

def compute(mid):
  try:
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)

  # Get required inputs ...
    data_table = slycat.web.server.model.load_hdf5_artifact("data-table")
    input_columns = slycat.web.server.model.load_json_artifact(model, "input-columns")
    output_columns = slycat.web.server.model.load_json_artifact(model, "output-columns")
    scale_inputs = slycat.web.server.model.load_json_artifact(model, "scale-inputs")

    if len(input_columns) < 1:
      raise Exception("CCA model requires at least one input column.")
    if len(output_columns) < 1:
      raise Exception("CCA model requires at least one output column.")

    # Transform the input data table to a form usable with our cca() function ...
    with slycat.web.server.database.hdf5.open(data_table["storage"]) as file:
      row_count = file.array_shape(0)[0]
      indices = numpy.arange(row_count, dtype="int32")

      X = numpy.empty((row_count, len(input_columns)))
      for j, input in enumerate(input_columns):
        slycat.web.server.model.set_progress(slycat.web.server.model.mix(0.0, 0.25, float(j) / float(len(input_columns))))
        X[:,j] = file.array_attribute(0, input)[...]

      Y = numpy.empty((row_count, len(output_columns)))
      for j, output in enumerate(output_columns):
        slycat.web.server.model.set_progress(slycat.web.server.model.mix(0.25, 0.50, float(j) / float(len(output_columns))))
        Y[:,j] = file.array_attribute(0, output)[...]

    # Remove rows containing NaNs ...
    good = numpy.invert(numpy.any(numpy.isnan(numpy.hstack((X, Y))), axis=1))
    indices = indices[good]
    X = X[good]
    Y = Y[good]

    # Compute the CCA ...
    slycat.web.server.model.set_message("Computing CCA.")
    x, y, x_loadings, y_loadings, r, wilks = cca(X, Y, scale_inputs=scale_inputs)
    slycat.web.server.model.set_progress(0.75)

    slycat.web.server.model.set_message("Storing results.")
    component_count = x.shape[1]
    sample_count = x.shape[0]

    # Store canonical variable indices (scatterplot indices) as a |sample| vector of indices ...
    slycat.web.server.model.start_array_set("canonical-indices")
    slycat.web.server.model.create_array("canonical-indices", 0, [("index", "int32")],[("sample", "int64", 0, sample_count)])
    slycat.web.server.model.store_array_attribute("canonical-indices", 0, 0, [(0, sample_count)], indices)
    slycat.web.server.model.finish_array_set("canonical-indices", input=False)

    # Store canonical variables (scatterplot data) as a component x sample matrix of x/y attributes ...
    slycat.web.server.model.start_array_set("canonical-variables")
    slycat.web.server.model.create_array("canonical-variables", 0, [("input", "float64"), ("output", "float64")], [("component", "int64", 0, component_count), ("sample", "int64", 0, sample_count)])
    slycat.web.server.model.store_array_attribute("canonical-variables", 0, 0, [(0, component_count), (0, sample_count)], x.T)
    slycat.web.server.model.store_array_attribute("canonical-variables", 0, 1, [(0, component_count), (0, sample_count)], y.T)
    slycat.web.server.model.finish_array_set("canonical-variables", input=False)
    slycat.web.server.model.set_progress(0.80)

    # Store structure correlations (barplot data) as a component x variable matrix of correlation attributes ...
    slycat.web.server.model.start_array_set("input-structure-correlation")
    slycat.web.server.model.create_array("input-structure-correlation", 0, [("correlation", "float64")], [("component", "int64", 0, component_count), ("input", "int64", 0, len(input_columns))])
    slycat.web.server.model.store_array_attribute("input-structure-correlation", 0, 0, [(0, component_count), (0, len(input_columns))], x_loadings.T)
    slycat.web.server.model.finish_array_set("input-structure-correlation", input=False)
    slycat.web.server.model.set_progress(0.85)

    slycat.web.server.model.start_array_set("output-structure-correlation")
    slycat.web.server.model.create_array("output-structure-correlation", 0, [("correlation", "float64")], [("component", "int64", 0, component_count), ("output", "int64", 0, len(output_columns))])
    slycat.web.server.model.store_array_attribute("output-structure-correlation", 0, 0, [(0, component_count), (0, len(output_columns))], y_loadings.T)
    slycat.web.server.model.finish_array_set("output-structure-correlation", input=False)
    slycat.web.server.model.set_progress(0.90)

    # Store statistics as a vector of component r2/p attributes
    slycat.web.server.model.start_array_set("cca-statistics")
    slycat.web.server.model.create_array("cca-statistics", 0, [("r2", "float64"), ("p", "float64")], [("component", "int64", 0, component_count)])
    slycat.web.server.model.store_array_attribute("cca-statistics", 0, 0, [(0, component_count)], r)
    slycat.web.server.model.store_array_attribute("cca-statistics", 0, 1, [(0, component_count)], wilks)
    slycat.web.server.model.finish_array_set("cca-statistics", input=False)

    model["state"] = "finished"
    model["result"] = "succeeded"
    model["finished"] = datetime.datetime.utcnow().isoformat()
    model["progress"] = 1.0
    database.save(model)

  except:
    cherrypy.log.error("%s" % traceback.format_exc())

    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    model["state"] = "finished"
    model["result"] = "failed"
    model["finished"] = datetime.datetime.utcnow().isoformat()
    model["progress"] = None
    model["message"] = traceback.format_exc()
    database.save(model)

def finish(database, model):
  """Compute a CCA model given an input table, a set of input variable names, and a set of output variable names."""
  thread = threading.Thread(name="Compute CCA Model", target=compute, kwargs={"mid" : model["_id"]})
  thread.start()

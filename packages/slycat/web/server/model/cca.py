# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from slycat.cca import cca
from slycat.web.server.model import *

import cherrypy
import datetime
import numpy
import slycat.hdf5
import slycat.web.server.database.couchdb
import slycat.web.server.database.hdf5
import threading
import time
import traceback

def compute(mid):
  try:
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)

    # Get required inputs ...
    data_table = load_hdf5_artifact(model, "data-table")
    input_columns = load_json_artifact(model, "input-columns")
    output_columns = load_json_artifact(model, "output-columns")
    scale_inputs = load_json_artifact(model, "scale-inputs")

    cherrypy.log.error("scale_inputs: %s" % scale_inputs)

    if len(input_columns) < 1:
      raise Exception("CCA model requires at least one input column.")
    if len(output_columns) < 1:
      raise Exception("CCA model requires at least one output column.")

    # Transform the input data table to a form usable with our cca() function ...
    with slycat.web.server.database.hdf5.open(data_table) as file:
      array = slycat.hdf5.ArraySet(file)[0]
      row_count = array.shape[0]
      indices = numpy.arange(row_count, dtype="int32")

      X = numpy.empty((row_count, len(input_columns)))
      for j, input in enumerate(input_columns):
        update(database, model, progress=mix(0.0, 0.25, float(j) / float(len(input_columns))))
        X[:,j] = array.get_data(input)[...]

      Y = numpy.empty((row_count, len(output_columns)))
      for j, output in enumerate(output_columns):
        update(database, model, progress=mix(0.25, 0.50, float(j) / float(len(output_columns))))
        Y[:,j] = array.get_data(output)[...]

    # Remove rows containing NaNs ...
    good = numpy.invert(numpy.any(numpy.isnan(numpy.hstack((X, Y))), axis=1))
    indices = indices[good]
    X = X[good]
    Y = Y[good]

    # Compute the CCA ...
    update(database, model, message="Computing CCA.")
    x, y, x_loadings, y_loadings, r, wilks = cca(X, Y, scale_inputs=scale_inputs)
    update(database, model, progress=0.75)

    update(database, model, message="Storing results.")
    component_count = x.shape[1]
    sample_count = x.shape[0]

    # Store canonical variable indices (scatterplot indices) as a |sample| vector of indices ...
    start_array_set(database, model, "canonical-indices")
    start_array(database, model, "canonical-indices", 0, [dict(name="index", type="int32")],[dict(name="sample", end=sample_count)])
    store_array_attribute(database, model, "canonical-indices", 0, 0, slice(0, sample_count), indices)

    # Store canonical variables (scatterplot data) as a component x sample matrix of x/y attributes ...
    start_array_set(database, model, "canonical-variables")
    start_array(database, model, "canonical-variables", 0, [dict(name="input", type="float64"), dict(name="output", type="float64")], [dict(name="component", end=component_count), dict(name="sample", end=sample_count)])
    store_array_attribute(database, model, "canonical-variables", 0, 0, (slice(0, component_count), slice(0, sample_count)), x.T)
    store_array_attribute(database, model, "canonical-variables", 0, 1, (slice(0, component_count), slice(0, sample_count)), y.T)
    update(database, model, progress=0.80)

    # Store structure correlations (barplot data) as a component x variable matrix of correlation attributes ...
    start_array_set(database, model, "input-structure-correlation")
    start_array(database, model, "input-structure-correlation", 0, [dict(name="correlation", type="float64")], [dict(name="component", end=component_count), dict(name="input", end=len(input_columns))])
    store_array_attribute(database, model, "input-structure-correlation", 0, 0, (slice(0, component_count), slice(0, len(input_columns))), x_loadings.T)
    update(database, model, progress=0.85)

    start_array_set(database, model, "output-structure-correlation")
    start_array(database, model, "output-structure-correlation", 0, [dict(name="correlation", type="float64")], [dict(name="component", end=component_count), dict(name="output", end=len(output_columns))])
    store_array_attribute(database, model, "output-structure-correlation", 0, 0, (slice(0, component_count), slice(0, len(output_columns))), y_loadings.T)
    update(database, model, progress=0.90)

    # Store statistics as a vector of component r2/p attributes
    start_array_set(database, model, "cca-statistics")
    start_array(database, model, "cca-statistics", 0, [dict(name="r2", type="float64"), dict(name="p", type="float64")], [dict(name="component", end=component_count)])
    store_array_attribute(database, model, "cca-statistics", 0, 0, slice(0, component_count), r)
    store_array_attribute(database, model, "cca-statistics", 0, 1, slice(0, component_count), wilks)

    update(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  except:
    cherrypy.log.error("%s" % traceback.format_exc())

    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    update(database, model, state="finished", result="failed", finished=datetime.datetime.utcnow().isoformat(), message=traceback.format_exc())

def finish(database, model):
  """Compute a CCA model given an input table, a set of input variable names, and a set of output variable names."""
  thread = threading.Thread(name="Compute CCA Model", target=compute, kwargs={"mid" : model["_id"]})
  thread.start()

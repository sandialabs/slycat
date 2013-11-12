# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from slycat.web.server.cca import cca
import cherrypy
import itertools
import slycat.web.server.database.hdf5
import slycat.web.server.worker.model
import StringIO
import numpy

class implementation(slycat.web.server.worker.model.prototype):
  """Worker that computes a CCA model, given an input table, a set of input
  variable names, and a set of output variable names."""
  def __init__(self, security, pid, mid, name, marking, description):
    slycat.web.server.worker.model.prototype.__init__(self, security, "CCA model", pid, mid, "cca3", name, marking, description, incremental=True)

  def compute_model(self):
    self.set_progress(0.0)
    self.set_message("Transforming data.")

    # Get required inputs ...
    data_table = self.load_table_artifact("data-table")
    input_columns = self.load_json_artifact("input-columns")
    output_columns = self.load_json_artifact("output-columns")
    scale_inputs = self.load_json_artifact("scale-inputs")

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
        self.set_progress(self.mix(0.0, 0.25, float(j) / float(len(input_columns))))
        X[:,j] = file.array_attribute(0, input)[...]

      Y = numpy.empty((row_count, len(output_columns)))
      for j, output in enumerate(output_columns):
        self.set_progress(self.mix(0.25, 0.50, float(j) / float(len(output_columns))))
        Y[:,j] = file.array_attribute(0, output)[...]

#      cherrypy.log.error("X: %s" % X)
#      cherrypy.log.error("Y: %s" % Y)

    # Remove rows containing NaNs ...
    good = numpy.invert(numpy.any(numpy.isnan(numpy.hstack((X, Y))), axis=1))
    indices = indices[good]
    X = X[good]
    Y = Y[good]

    # Compute the CCA ...
#    cherrypy.log.error("%s" % X)
#    cherrypy.log.error("%s" % Y)
#    cherrypy.log.error("%s" % scale_inputs)
    self.set_message("Computing CCA.")
    x, y, x_loadings, y_loadings, r, wilks = cca(X, Y, scale_inputs=scale_inputs)
    self.set_progress(0.75)
#    cherrypy.log.error("x %s" % (x.shape,))
#    cherrypy.log.error("y %s" % (y.shape,))
#    cherrypy.log.error("x_loadings %s" % (x_loadings.shape,))
#    cherrypy.log.error("y_loadings %s" % (y_loadings.shape,))
#    cherrypy.log.error("r %s" % (r.shape,))
#    cherrypy.log.error("wilks %s" % (wilks.shape,))

    self.set_message("Storing results.")
    component_count = x.shape[1]
    sample_count = x.shape[0]

    # Store canonical variable indices (scatterplot indices) as a |sample| vector of indices ...
    self.start_array_set("canonical-indices")
    self.create_array("canonical-indices", 0, [("index", "int32")],[("sample", "int64", 0, sample_count)])
    self.store_array_attribute("canonical-indices", 0, 0, [(0, sample_count)], indices)
    self.finish_array_set("canonical-indices", input=False)

    # Store canonical variables (scatterplot data) as a component x sample matrix of x/y attributes ...
    self.start_array_set("canonical-variables")
    self.create_array("canonical-variables", 0, [("input", "float64"), ("output", "float64")], [("component", "int64", 0, component_count), ("sample", "int64", 0, sample_count)])
    self.store_array_attribute("canonical-variables", 0, 0, [(0, component_count), (0, sample_count)], x.T)
    self.store_array_attribute("canonical-variables", 0, 1, [(0, component_count), (0, sample_count)], y.T)
    self.finish_array_set("canonical-variables", input=False)
    self.set_progress(0.80)

    # Store structure correlations (barplot data) as a component x variable matrix of correlation attributes ...
    self.start_array_set("input-structure-correlation")
    self.create_array("input-structure-correlation", 0, [("correlation", "float64")], [("component", "int64", 0, component_count), ("input", "int64", 0, len(input_columns))])
    self.store_array_attribute("input-structure-correlation", 0, 0, [(0, component_count), (0, len(input_columns))], x_loadings.T)
    self.finish_array_set("input-structure-correlation", input=False)
    self.set_progress(0.85)

    self.start_array_set("output-structure-correlation")
    self.create_array("output-structure-correlation", 0, [("correlation", "float64")], [("component", "int64", 0, component_count), ("output", "int64", 0, len(output_columns))])
    self.store_array_attribute("output-structure-correlation", 0, 0, [(0, component_count), (0, len(output_columns))], y_loadings.T)
    self.finish_array_set("output-structure-correlation", input=False)
    self.set_progress(0.90)

    # Store statistics as a vector of component r2/p attributes
    self.start_array_set("cca-statistics")
    self.create_array("cca-statistics", 0, [("r2", "float64"), ("p", "float64")], [("component", "int64", 0, component_count)])
    self.store_array_attribute("cca-statistics", 0, 0, [(0, component_count)], r)
    self.store_array_attribute("cca-statistics", 0, 1, [(0, component_count)], wilks)
    self.finish_array_set("cca-statistics", input=False)

    self.set_progress(1.0)

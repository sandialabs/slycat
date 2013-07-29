# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import itertools
import slycat.web.server.worker.model
import StringIO
import numpy
import scipy.linalg
import scipy.stats

def cca(X, Y, scale_inputs=True, positive_output=1, significant_digits=None):
  """Compute Canonical Correlation Analysis (CCA).

  Returns: x, y, x_loadings, y_loadings, r, wilks
  """
  def qr(A):
    """Custom implementation of QR for use with our CCA."""
    return scipy.linalg.qr(A, mode="economic", pivoting=True)
#    a1 = numpy.asarray_chkfinite(A)
#    geqp3, = scipy.linalg.lapack.get_lapack_funcs(("geqp3",), (a1,))
#    qr, P, tau, work, info = geqp3(A)
#
#    m, n = A.shape
#    k = min(m, n)
#    R = numpy.triu(qr[:k,:k])
#
#    orgqr, = scipy.linalg.lapack.get_lapack_funcs(("orgqr",), (qr,))
#    if m >= n: # Tall-skinny case
#      Q, work, info = orgqr(qr[:m,:n], tau)
#      Q = Q[:m, :n]
#    else: # Short-wide case
#      Q, work, info = orgqr(qr[:m,:m], tau)
#      Q = Q[:m, :m]
#
#    P -= 1 # geqp3 returns a 1-based index array, so subtract 1
#
#    return Q, R, P

  eps = numpy.finfo("double").eps
  if significant_digits is None or significant_digits > numpy.abs(numpy.log10(eps)):
    significant_digits = numpy.abs(numpy.log10(eps))

  n = X.shape[0]
  p1 = X.shape[1]
  p2 = Y.shape[1]

  X -= X.mean(axis=0)
  Y -= Y.mean(axis=0)

  if scale_inputs:
    X /= X.std(axis=0)
    Y /= Y.std(axis=0)

  Q1, R1, P1 = qr(X)
  Q2, R2, P2 = qr(Y)

  Xrank = numpy.sum(numpy.abs(numpy.diag(R1)) > 10**(numpy.log10(numpy.abs(R1[0,0])) - significant_digits) * max(n, p1))
  Yrank = numpy.sum(numpy.abs(numpy.diag(R2)) > 10**(numpy.log10(numpy.abs(R2[0,0])) - significant_digits) * max(n, p2))

  # TODO: Remove low-rank columns
  if Xrank == 0:
    raise Exception("X must contain at least one non-constant column.")
  if Xrank < p1:
    raise Exception("X is not full rank.")
  if Yrank == 0:
    raise Exception("Y must contain at least one non-constant column.")
  if Yrank < p2:
    raise Exception("Y is not full rank.")

  L, D, M = scipy.linalg.svd(numpy.dot(Q1.T, Q2), full_matrices=False)

  A = numpy.linalg.solve(R1, L)
  B = numpy.linalg.solve(R2, M.T)

  A *= numpy.sqrt(n - 1)
  B *= numpy.sqrt(n - 1)

  # TODO: Restore low-rank columns
  A = A[P1]
  B = B[P2]

  x = numpy.dot(X, A)
  y = numpy.dot(Y, B)

  x_loadings = numpy.array([[scipy.stats.pearsonr(i, j)[0] for j in X.T] for i in x.T]).T
  y_loadings = numpy.array([[scipy.stats.pearsonr(i, j)[0] for j in Y.T] for i in y.T]).T

  positive_output = 1
  if positive_output is not None:
    for j in range(y_loadings.shape[1]):
      if y_loadings[positive_output, j] < 0:
        x_loadings[:,j] = -x_loadings[:,j]
        y_loadings[:,j] = -y_loadings[:,j]
        x[:,j] = -x[:,j]
        y[:,j] = -y[:,j]

  d = min(Xrank, Yrank)
  r = numpy.minimum(numpy.maximum(D[:d], 0), 1)

  nondegenerate = r < 1
  wilks = numpy.exp(numpy.cumsum(numpy.log(1-(r[nondegenerate] ** 2))[::-1])[::-1])

  return x, y, x_loadings, y_loadings, r, wilks

class implementation(slycat.web.server.worker.model.prototype):
  """Worker that computes a CCA model, given an input table, a set of input
  variable names, and a set of output variable names."""
  def __init__(self, security, pid, mid, name, marking, description):
    slycat.web.server.worker.model.prototype.__init__(self, security, "CCA model", pid, mid, "cca3", name, marking, description, incremental=True)

  def compute_model(self):
    # Get required inputs ...
    data_table = self.load_table_artifact("data-table")
    input_columns = self.load_json_artifact("input-columns")
    output_columns = self.load_json_artifact("output-columns")
    scale_inputs = self.load_json_artifact("scale-inputs")

    # Transform the input data table to a form usable with our cca() function ...
    low = self.scidb.query_value("aql", "select low from dimensions(%s)" % data_table["columns"]).getInt64()
    high = self.scidb.query_value("aql", "select high from dimensions(%s)" % data_table["columns"]).getInt64()
    row_count = high + 1 if high >= low else 0

    X = numpy.empty((row_count, len(input_columns)))
    for j, input in enumerate(input_columns):
      with self.scidb.query("aql", "select %s from %s" % ("c%s" % input, data_table["columns"])) as results:
        for artifact in results:
          for i, value in enumerate(artifact):
            X[i, j] = value.getDouble()

    Y = numpy.empty((row_count, len(output_columns)))
    for j, output in enumerate(output_columns):
      with self.scidb.query("aql", "select %s from %s" % ("c%s" % output, data_table["columns"])) as results:
        for artifact in results:
          for i, value in enumerate(artifact):
            Y[i, j] = value.getDouble()

    # Compute the CCA ...
#    cherrypy.log.error("%s" % X)
#    cherrypy.log.error("%s" % Y)
#    cherrypy.log.error("%s" % scale_inputs)
    x, y, x_loadings, y_loadings, r, wilks = cca(X, Y, scale_inputs=scale_inputs)
#    cherrypy.log.error("%s" % x)
#    cherrypy.log.error("%s" % y)
#    cherrypy.log.error("%s" % x_loadings)
#    cherrypy.log.error("%s" % y_loadings)
#    cherrypy.log.error("%s" % r)
#    cherrypy.log.error("%s" % wilks)

    component_count = x.shape[1]
    sample_count = x.shape[0]

    # Store canonical variables (scatterplot data) as a component x sample matrix of x/y attributes ...
    self.start_array_artifact("canonical-variables", [("input", "double"), ("output", "double")], [("component", component_count, 1), ("sample", sample_count, sample_count)])
    for component in range(component_count):
      self.send_array_artifact_data("canonical-variables", list(itertools.chain.from_iterable([(x[i, component], y[i, component]) for i in range(sample_count)])))
    self.finish_array_artifact("canonical-variables", input=False)

    # Store structure correlations (barplot data) as a component x variable matrix of correlation attributes ...
    self.start_array_artifact("input-structure-correlation", [("correlation", "double")], [("component", component_count, 1), ("input", len(input_columns), len(input_columns))])
    for component in range(component_count):
      self.send_array_artifact_data("input-structure-correlation", [x_loadings[i, component] for i in range(len(input_columns))])
    self.finish_array_artifact("input-structure-correlation", input=False)

    self.start_array_artifact("output-structure-correlation", [("correlation", "double")], [("component", component_count, 1), ("output", len(output_columns), len(output_columns))])
    for component in range(component_count):
      self.send_array_artifact_data("output-structure-correlation", [y_loadings[i, component] for i in range(len(output_columns))])
    self.finish_array_artifact("output-structure-correlation", input=False)

    # Store statistics as a vector of component r2/p attributes
    self.start_array_artifact("cca-statistics", [("r2", "double"), ("p", "double")], [("component", component_count, 1)])
    for component in range(component_count):
      self.send_array_artifact_data("cca-statistics", [r[component], wilks[component]])
    self.finish_array_artifact("cca-statistics", input=False)


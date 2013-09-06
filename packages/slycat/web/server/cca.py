# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy
import scipy.linalg
import scipy.stats

def cca(X, Y, scale_inputs=True, positive_output=None, significant_digits=None):
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


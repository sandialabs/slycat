# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import numbers
import numpy
import scipy.linalg
import scipy.stats
import slycat.email

def cca(X, Y, scale_inputs=True, force_positive=None, significant_digits=None):
  """Compute Canonical Correlation Analysis (CCA).

  Parameters
  ----------
  X : numpy.ndarray
    :math:`M \\times I` matrix containing :math:`M` observations and :math:`I` input features.
  Y : numpy.ndarray
    :math:`M \\times O` matrix containing :math:`M` observations and :math:`O` output features.
  scale_inputs : bool, optional
    Scale input and output features to unit variance.
  force_positive : integer, optional
    If specified, flip signs in the `x`, `y`, `x_loadings`, and `y_loadings` output values so
    that the values in row :math:`n` of `y_loadings` are all positive.
  significant_digits: integer, optional
    Optionally specify the number of significant digits used to compute the `X` and `Y` ranks.

  Returns
  -------
  x : numpy.ndarray
    :math:`M \\times C` matrix containing input metavariable values for :math:`M` observations and :math:`C` CCA components.
  y : numpy.ndarray
    :math:`M \\times C` matrix containing output metavariable values for :math:`M` observations and :math:`C` CCA components.
  x_loadings : numpy.ndarray
    :math:`I \\times C` matrix containing weights for :math:`I` input variables and :math:`C` CCA components.
  y_loadings : numpy.ndarray
    :math:`O \\times C` matrix containing weights for :math:`O` output variables and :math:`C` CCA components.
  r2 : numpy.ndarray
    length-:math:`C` vector containing :math:`r^2` values for :math:`C` CCA components.
  wilks : numpy.ndarray
    length-:math:`C` vector containing the likelihood-ratio for :math:`C` CCA components.
  """

  # Validate our inputs ...
  if not isinstance(X, numpy.ndarray) or not isinstance(Y, numpy.ndarray):
    slycat.email.send_error("cca.py", "X and Y must be numpy.ndarray instances.")
    raise TypeError("X and Y must be numpy.ndarray instances.")
  if X.ndim != 2 or Y.ndim != 2:
    slycat.email.send_error("cca.py", "X and Y must have two dimensions.")
    raise ValueError("X and Y must have two dimensions.")
  if X.shape[0] != Y.shape[0]:
    slycat.email.send_error("cca.py", "X and Y must contain the same number of rows.")
    raise ValueError("X and Y must contain the same number of rows.")
  if X.shape[0] < X.shape[1] or X.shape[0] < Y.shape[1]:
    slycat.email.send_error("cca.py", "Number of rows must be >= the number of column in X, and >= the number of columns in Y.")
    raise ValueError("Number of rows must be >= the number of columns in X, and >= the number of columns in Y.")
  if X.shape[1] < 1 or Y.shape[1] < 1:
    slycat.email.send_error("cca.py", "X and Y must each contain at least one column.")
    raise ValueError("X and Y must each contain at least one column.")
  for column in numpy.column_stack((X, Y)).T:
    if column.min() == column.max():
      slycat.email.send_error("cca.py", "Columns in X and Y cannot be constant.")
      raise ValueError("Columns in X and Y cannot be constant.")
  if not isinstance(scale_inputs, bool):
    slycat.email.send_error("cca.py", "scale_inputs must be a boolean.")
    raise TypeError("scale_inputs must be a boolean.")
  if not isinstance(force_positive, (type(None), numbers.Integral)):
    slycat.email.send_error("cca.py", "force_positive must be an integer or None.")
    raise TypeError("force_positive must be an integer or None.")
  if force_positive is not None and (force_positive < 0 or force_positive >= Y.shape[1]):
    slycat.email.send_error("cca.py", "force_positive must be in the range [0, number of Y columns).")
    raise ValueError("force_positive must be in the range [0, number of Y columns).")
  if not isinstance(significant_digits, (type(None), numbers.Integral)):
    slycat.email.send_error("cca.py", "significant_digits must be an integer or None.")
    raise TypeError("significant_digits must be an integer or None.")

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

  Q1, R1, P1 = scipy.linalg.qr(X, mode="economic", pivoting=True)
  Q2, R2, P2 = scipy.linalg.qr(Y, mode="economic", pivoting=True)

  Xrank = numpy.sum(numpy.abs(numpy.diag(R1)) > 10**(numpy.log10(numpy.abs(R1[0,0])) - significant_digits) * max(n, p1))
  Yrank = numpy.sum(numpy.abs(numpy.diag(R2)) > 10**(numpy.log10(numpy.abs(R2[0,0])) - significant_digits) * max(n, p2))

  # We validate this here, to avoid computing the rank twice.
  if X.shape[0] < Xrank or X.shape[0] < Yrank:
    slycat.email.send_error("cca.py", "Number of rows must be >= rank(X), and >= rank(Y).")
    raise ValueError("Number of rows must be >= rank(X), and >= rank(Y).")

  L, D, M = scipy.linalg.svd(numpy.dot(Q1.T, Q2), full_matrices=False)

  d = min(Xrank, Yrank)
  L = L[:,:d]
  M = M[:d,:]

  A = numpy.linalg.solve(R1, L)
  B = numpy.linalg.solve(R2, M.T)

  A *= numpy.sqrt(n - 1)
  B *= numpy.sqrt(n - 1)

  A[P1] = numpy.copy(A)
  B[P2] = numpy.copy(B)

  x = numpy.dot(X, A)
  y = numpy.dot(Y, B)

  x_loadings = numpy.array([[scipy.stats.pearsonr(i, j)[0] for j in X.T] for i in x.T]).T
  y_loadings = numpy.array([[scipy.stats.pearsonr(i, j)[0] for j in Y.T] for i in y.T]).T

  if force_positive is not None:
    for j in range(y_loadings.shape[1]):
      if y_loadings[force_positive, j] < 0:
        x_loadings[:,j] = -x_loadings[:,j]
        y_loadings[:,j] = -y_loadings[:,j]
        x[:,j] = -x[:,j]
        y[:,j] = -y[:,j]

  r = numpy.minimum(numpy.maximum(D[:d], 0), 1)

  nondegenerate = r < 1
  wilks = numpy.exp(numpy.cumsum(numpy.log(1-(r[nondegenerate] ** 2))[::-1])[::-1])

  return x, y, x_loadings, y_loadings, r, wilks


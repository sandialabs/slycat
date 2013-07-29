from slycat.analysis import *
import matplotlib.pyplot as pyplot
import numpy
import scipy.linalg
import scipy.stats

def cca(X, Y, scale=True, positive_output=1):
  """Custom implementation of CCA for use in Slycat."""
  def qr(A):
    """Custom implementation of QR for use with our CCA."""
    a1 = numpy.asarray_chkfinite(A)
    geqp3, = scipy.linalg.lapack.get_lapack_funcs(("geqp3",), (a1,))
    qr, P, tau, work, info = geqp3(A)

    m, n = A.shape
    k = min(m, n)
    R = numpy.triu(qr[:k,:k])

    orgqr, = scipy.linalg.lapack.get_lapack_funcs(("orgqr",), (qr,))
    if m >= n: # Tall-skinny case
      Q, work, info = orgqr(qr[:m,:n], tau)
      Q = Q[:m, :n]
    else: # Short-wide case
      Q, work, info = orgqr(qr[:m,:m], tau)
      Q = Q[:m, :m]

    P -= 1 # geqp3 returns a 1-based index array, so subtract 1

    return Q, R, P
    #return scipy.linalg.qr(A, mode="economic", pivoting=True)

  n = X.shape[0]
  p1 = X.shape[1]
  p2 = Y.shape[1]

  X -= X.mean(axis=0)
  Y -= Y.mean(axis=0)

  if scale:
    X /= X.std(axis=0)
    Y /= Y.std(axis=0)

  Q1, R1, P1 = qr(X)
  Q2, R2, P2 = qr(Y)

  Xrank = sum((numpy.abs(numpy.diag(R1)) > 0) * max(n, p1))
  Yrank = sum((numpy.abs(numpy.diag(R2)) > 0) * max(n, p2))
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

  A = A.T[P1].T
  B = B.T[P2].T

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

  return x, y, x_loadings, y_loadings

autos = load("../data/automobiles.csv", "csv-file", chunk_size=100)
inputs = project(autos, "Year", "Cylinders", "Displacement")
outputs = project(autos, "Acceleration", "MPG", "Horsepower")
X = numpy.array([values(inputs, 0), values(inputs, 1), values(inputs, 2)]).T.astype("double")
Y = numpy.array([values(outputs, 0), values(outputs, 1), values(outputs, 2)]).T.astype("double")
good = ~numpy.isnan(Y).any(axis=1)
X = X[good]
Y = Y[good]

x, y, x_loadings, y_loadings = cca(X, Y)

print x_loadings
print y_loadings

pyplot.figure()
pyplot.scatter(x.T[0], y.T[0], color="red")
pyplot.figure()
pyplot.scatter(x.T[1], y.T[1], color="green")
pyplot.figure()
pyplot.scatter(x.T[2], y.T[2], color="blue")
pyplot.show(True)


from slycat.analysis import *
import matplotlib.pyplot as pyplot
import numpy
import scipy.linalg

autos = load("../data/automobiles.csv", "csv-file", chunk_size=100)
inputs = project(autos, "Year", "Cylinders", "Displacement")
outputs = project(autos, "Acceleration", "MPG", "Horsepower")
X = numpy.array([values(inputs, 0), values(inputs, 1), values(inputs, 2)]).T.astype("double")
Y = numpy.array([values(outputs, 0), values(outputs, 1), values(outputs, 2)]).T.astype("double")
good = ~numpy.isnan(Y).any(axis=1)
X = X[good]
Y = Y[good]

###################################################
# Introducing ... the Slycat implementation of CCA!
n = X.shape[0]
X -= X.mean(axis=0)
Y -= Y.mean(axis=0)

if True: # Optionally scale data to unit variance
  X /= X.std(axis=0)
  Y /= Y.std(axis=0)

Q1, R1, P1 = scipy.linalg.qr(X, mode="economic", pivoting=True)
Q2, R2, P2 = scipy.linalg.qr(Y, mode="economic", pivoting=True)
numpy.testing.assert_array_almost_equal(X, numpy.dot(Q1, R1))
numpy.testing.assert_array_almost_equal(Y, numpy.dot(Q2, R2))

# TODO: Test for rank deficiencies here.

L, D, M = scipy.linalg.svd(numpy.dot(Q1.T, Q2), full_matrices=False)
numpy.testing.assert_array_almost_equal(numpy.dot(L, numpy.dot(numpy.diag(D), M)), numpy.dot(Q1.T, Q2))

A = numpy.linalg.solve(R1, L)
B = numpy.linalg.solve(R2, M)
numpy.testing.assert_array_almost_equal(numpy.dot(R1, A), L)
numpy.testing.assert_array_almost_equal(numpy.dot(R2, B), M)

A *= numpy.sqrt(n - 1)
B *= numpy.sqrt(n - 1)

x = numpy.dot(X, A)
y = numpy.dot(Y, B)

###################################################

pyplot.scatter(x.T[0], y.T[0], color="red")
#pyplot.scatter(x.T[1], y.T[1], color="green")
#pyplot.scatter(x.T[2], y.T[2], color="blue")
pyplot.show(True)


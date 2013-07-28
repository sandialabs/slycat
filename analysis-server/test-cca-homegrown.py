from slycat.analysis import *
import matplotlib.pyplot as pyplot
import numpy
import scipy.linalg
import scipy.stats

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
p1 = X.shape[1]
p2 = Y.shape[1]

X -= X.mean(axis=0)
Y -= Y.mean(axis=0)

if True: # Optionally scale data to unit variance
  X /= X.std(axis=0) # TODO: decide whether we do this sklearn's way or matlab's way
  Y /= Y.std(axis=0)

Q1, R1, P1 = scipy.linalg.qr(X, mode="economic", pivoting=True)
Q2, R2, P2 = scipy.linalg.qr(Y, mode="economic", pivoting=True)

print "Q1", Q1
print "R1", R1
print "P1", P1
print "Q2", Q2
print "R2", R2
print "P2", P2

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

print "Xrank", Xrank
print "Yrank", Yrank

L, D, M = scipy.linalg.svd(numpy.dot(Q1.T, Q2), full_matrices=False)

print "L", L
print "D", D
print "M", M

A = numpy.linalg.solve(R1, L)
B = numpy.linalg.solve(R2, M.T)

print "A", A
print "B", B

A *= numpy.sqrt(n - 1)
B *= numpy.sqrt(n - 1)

A = A.T[P1].T
B = B.T[P2].T

x = numpy.dot(X, A)
y = numpy.dot(Y, B)

print "x", x
print "y", y

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

print "x_loadings", x_loadings
print "y_loadings", y_loadings

###################################################

pyplot.figure()
pyplot.scatter(x.T[0], y.T[0], color="red")
pyplot.figure()
pyplot.scatter(x.T[1], y.T[1], color="green")
pyplot.figure()
pyplot.scatter(x.T[2], y.T[2], color="blue")
pyplot.show(True)


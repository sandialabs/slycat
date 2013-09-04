from slycat.analysis.client import *
from slycat.web.server.cca import cca
import matplotlib.pyplot as pyplot
import numpy
import sys

input_columns = ["Cylinders", "Displacement", "Weight", "Year"]
output_columns = ["Acceleration", "Horsepower", "MPG"]

autos = load("../data/cars.csv", "csv-file", chunk_size=100)
inputs = project(autos, *input_columns)
outputs = project(autos, *output_columns)
X = numpy.array([values(inputs, column) for column in input_columns]).T.astype("double")
Y = numpy.array([values(outputs, column) for column in output_columns]).T.astype("double")
good = ~numpy.isnan(Y).any(axis=1)
X = X[good]
Y = Y[good]

x, y, x_loadings, y_loadings, r, wilks = cca(X, Y, scale_inputs=True)

print r
print wilks
print x_loadings
print y_loadings

pyplot.figure()
pyplot.scatter(x.T[0], y.T[0], color="red")
#pyplot.figure()
#pyplot.scatter(x.T[1], y.T[1], color="green")
#pyplot.figure()
#pyplot.scatter(x.T[2], y.T[2], color="blue")
pyplot.show(True)


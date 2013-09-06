from slycat.analysis.client import *
from slycat.web.server.cca import cca
import matplotlib.pyplot as pyplot
import numpy
import optparse
import sys

parser = optparse.OptionParser()
parser.add_option("--inputs", default="Cylinders Displacement Weight Year", help="Input variables.  Default: %default")
parser.add_option("--outputs", default="Acceleration Horsepower MPG", help="Output variables.  Default: %default")
parser.add_option("--scale", default=False, action="store_true", help="Scale inputs to unit variance.")
options, arguments = parser.parse_args()

autos = load("../data/cars.csv", "csv-file", chunk_size=100)
inputs = project(autos, *options.inputs.split())
outputs = project(autos, *options.outputs.split())
X = numpy.array([values(inputs, column) for column in options.inputs.split()]).T.astype("double")
Y = numpy.array([values(outputs, column) for column in options.outputs.split()]).T.astype("double")
good = ~numpy.isnan(Y).any(axis=1)
X = X[good]
Y = Y[good]

x, y, x_loadings, y_loadings, r, wilks = cca(X, Y, scale_inputs=options.scale)

sys.stderr.write("r^2:\n%s\n" % r)
sys.stderr.write("x loadings:\n%s\n" % x_loadings)
sys.stderr.write("y loadings:\n%s\n" % y_loadings)

pyplot.figure()
pyplot.scatter(x.T[0], y.T[0], color="red")
#pyplot.figure()
#pyplot.scatter(x.T[1], y.T[1], color="green")
#pyplot.figure()
#pyplot.scatter(x.T[2], y.T[2], color="blue")
pyplot.show(True)


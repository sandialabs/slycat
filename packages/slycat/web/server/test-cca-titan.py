from slycat.analysis.client import *
from titan.Trilinos import vtkTrilinosCCA
from titan.Web import vtkJSONArrayWriter
from vtk import vtkDenseArray, vtkArrayData
import matplotlib.pyplot as pyplot
import numpy
import optparse
import sys

parser = optparse.OptionParser()
parser.add_option("--force-positive", default=None, help="Output variable to force positive.  Default: %default")
parser.add_option("--inputs", default="Cylinders Displacement Weight Year", help="Input variables.  Default: %default")
parser.add_option("--outputs", default="Acceleration Horsepower MPG", help="Output variables.  Default: %default")
parser.add_option("--scale", default=False, action="store_true", help="Scale inputs to unit variance.")
options, arguments = parser.parse_args()

if options.force_positive is not None:
  options.force_positive = options.outputs.split().index(options.force_positive)

autos = load("../data/cars.csv", "csv-file", chunk_size=100)
inputs = project(autos, *options.inputs.split())
outputs = project(autos, *options.outputs.split())
X = numpy.array([values(inputs, column) for column in options.inputs.split()]).T.astype("double")
Y = numpy.array([values(outputs, column) for column in options.outputs.split()]).T.astype("double")
good = ~numpy.isnan(Y).any(axis=1)
X = X[good]
Y = Y[good]

X_titan = vtkDenseArray["float64"]()
X_titan.Resize(X.shape[0], X.shape[1])
for i in range(X.shape[0]):
  for j in range(X.shape[1]):
    X_titan.SetVariantValue(i, j, X[i, j])

Y_titan = vtkDenseArray["float64"]()
Y_titan.Resize(Y.shape[0], Y.shape[1])
for i in range(Y.shape[0]):
  for j in range(Y.shape[1]):
    Y_titan.SetVariantValue(i, j, Y[i, j])

cca_array_data = vtkArrayData()
cca_array_data.AddArray(X_titan)
cca_array_data.AddArray(Y_titan)

cca = vtkTrilinosCCA()
cca.SetInputData(cca_array_data)
cca.SetSigDigits(16)
if options.force_positive is not None:
  cca.ForcePositiveYCorrelation(options.force_positive)
if options.scale:
  cca.ScaleInputToUnitVarianceOn()
else:
  cca.ScaleInputToUnitVarianceOff()
cca.Update()

x_titan = cca.GetOutput().GetArray(2)
y_titan = cca.GetOutput().GetArray(3)
x_loadings_titan = cca.GetOutput().GetArray(4)
y_loadings_titan = cca.GetOutput().GetArray(5)
statistics_titan = cca.GetOutput().GetArray(6)

r = numpy.empty((statistics_titan.GetExtent(1).GetSize()))
for i in range(statistics_titan.GetExtent(1).GetSize()):
  r[i] = statistics_titan.GetValue(0, i)

x = numpy.empty((x_titan.GetExtent(0).GetSize(), x_titan.GetExtent(1).GetSize()))
for i in range(x_titan.GetExtent(0).GetSize()):
  for j in range(x_titan.GetExtent(1).GetSize()):
    x[i,j] = x_titan.GetValue(i, j)

y = numpy.empty((y_titan.GetExtent(0).GetSize(), y_titan.GetExtent(1).GetSize()))
for i in range(y_titan.GetExtent(0).GetSize()):
  for j in range(y_titan.GetExtent(1).GetSize()):
    y[i,j] = y_titan.GetValue(i, j)

x_loadings = numpy.empty((x_loadings_titan.GetExtent(0).GetSize(), x_loadings_titan.GetExtent(1).GetSize()))
for i in range(x_loadings_titan.GetExtent(0).GetSize()):
  for j in range(x_loadings_titan.GetExtent(1).GetSize()):
    x_loadings[i,j] = x_loadings_titan.GetValue(i, j)

y_loadings = numpy.empty((y_loadings_titan.GetExtent(0).GetSize(), y_loadings_titan.GetExtent(1).GetSize()))
for i in range(y_loadings_titan.GetExtent(0).GetSize()):
  for j in range(y_loadings_titan.GetExtent(1).GetSize()):
    y_loadings[i,j] = y_loadings_titan.GetValue(i, j)

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


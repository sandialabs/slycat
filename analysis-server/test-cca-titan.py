from slycat.analysis import *
from titan.Trilinos import vtkTrilinosCCA
from titan.Web import vtkJSONArrayWriter
from vtk import vtkDenseArray, vtkArrayData
import matplotlib.pyplot as pyplot
import numpy

autos = load("../data/automobiles.csv", "csv-file", chunk_size=100)
inputs = project(autos, "Year", "Cylinders", "Displacement")
outputs = project(autos, "Acceleration", "Horsepower", "MPG")
X = numpy.array([values(inputs, 0), values(inputs, 1), values(inputs, 2)]).T.astype("double")
Y = numpy.array([values(outputs, 0), values(outputs, 1), values(outputs, 2)]).T.astype("double")
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
cca.ForcePositiveYCorrelation(1)
if True:
  cca.ScaleInputToUnitVarianceOn()
cca.Update()

x_titan = cca.GetOutput().GetArray(2)
y_titan = cca.GetOutput().GetArray(3)
x_loadings_titan = cca.GetOutput().GetArray(4)
y_loadings_titan = cca.GetOutput().GetArray(5)
statistics_titan = cca.GetOutput().GetArray(6)

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

print x_loadings
print y_loadings

pyplot.figure()
pyplot.scatter(x.T[0], y.T[0], color="red")
pyplot.figure()
pyplot.scatter(x.T[1], y.T[1], color="green")
pyplot.figure()
pyplot.scatter(x.T[2], y.T[2], color="blue")
pyplot.show(True)


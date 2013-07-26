from sklearn.pls import *
from slycat.analysis import *
import matplotlib.pyplot as pyplot

autos = load("../data/automobiles.csv", "csv-file", chunk_size=100)
inputs = project(autos, "Year", "Cylinders", "Displacement")
outputs = project(autos, "Acceleration", "MPG", "Horsepower")
X = numpy.array([values(inputs, 0), values(inputs, 1), values(inputs, 2)]).T.astype("double")
Y = numpy.array([values(outputs, 0), values(outputs, 1), values(outputs, 2)]).T.astype("double")
good = ~numpy.isnan(Y).any(axis=1)
X = X[good]
Y = Y[good]

cca = CCA(n_components=3, scale=True)
cca.fit(X, Y)
x, y = cca.transform(X,Y)

pyplot.scatter(x.T[0], y.T[0], color="red")
#pyplot.scatter(x.T[1], y.T[1], color="green")
#pyplot.scatter(x.T[2], y.T[2], color="blue")
pyplot.show(True)


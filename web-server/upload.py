# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy
import slycat.web.client

parser = slycat.web.client.option_parser()
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument("--model-name", default="Upload Test", help="New model name.  Default: %(default)s")
parser.add_argument("--project-name", default="Upload Test", help="New project name.  Default: %(default)s")
arguments = parser.parse_args()

# Setup a connection to the Slycat Web Server.
connection = slycat.web.client.connect(arguments)

# Create a new project to contain our model.
pid = connection.find_or_create_project(arguments.project_name)

# Create the new, empty model.
mid = connection.create_model(pid, "generic", arguments.model_name, arguments.marking)

# Start an array set (a collection of zero-to-many arrays).
connection.start_array_set(mid, "data")

# Start an array (a dense, multi-dimension, multi-attribute array).
connection.start_array(mid, "data", 0, ["x", "y", "z"], [("i", "int64", 0, 4), ("j", "int64", 0, 4)])
connection.start_array(mid, "data", 1, ["x", "y", "z"], [("i", "int64", 0, 4), ("j", "int64", 0, 4)])
connection.start_array(mid, "data", 2, ["x", "y", "z"], [("i", "int64", 0, 6), ("j", "int64", 0, 6)])

# Store values into increasingly-large subsets of the array set.
m22 = numpy.arange(4, dtype="float64").reshape((2, 2))
m44 = numpy.arange(16, dtype="float64").reshape((4, 4))
m66 = numpy.arange(36, dtype="float64").reshape((6, 6))

connection.put_model_array_data(mid, "data", array=0, attribute=0, hyperslice=[(0, 2), (0, 2)], data=m22) # A hyperslice of one attribute of one array
connection.put_model_array_data(mid, "data", array=0, attribute=1, data=m44) # One attribute of one array
connection.put_model_array_data(mid, "data", array=0, data=[m44, m44, m44]) # Every attribute of one array
connection.put_model_array_data(mid, "data", array=slice(1, 3), data=[m44, m44, m44, m66, m66, m66]) # Every attribute of a range of arrays
connection.put_model_array_data(mid, "data", array=[2, 1], attribute=[1, 0], data=[m66, m66, m44, m44]) # Multiple attributes of multiple arrays 
connection.put_model_array_data(mid, "data", data=[m44, m44, m44, m44, m44, m44, m66, m66, m66]) # Every attribute of every array

# Signal that we're done uploading data to the model.  This lets Slycat Web
# Server know that it can perform any required computation.
connection.finish_model(mid)
# Wait until the model is ready.
connection.join_model(mid)

# Supply the user with a direct link to the new model.
slycat.web.client.log.info("Your new model is located at %s/models/%s" % (arguments.host, mid))

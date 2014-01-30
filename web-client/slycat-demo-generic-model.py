# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

"""Demonstrates uploading data to a Slycat generic model.

A Slycat generic model is a container for data that doesn't do any computation.
Use generic models to stuff custom data into Slycat Web Server and/or as a
starting-point for custom models of your own.
"""

import numpy
import slycat.web.client

parser = slycat.web.client.option_parser()
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument("--model-name", default="Demo Generic Model", help="New model name.  Default: %(default)s")
parser.add_argument("--project-name", default="Demo Generic Project", help="New project name.  Default: %(default)s")
arguments = parser.parse_args()

# Setup a connection to the Slycat Web Server.
connection = slycat.web.client.connect(arguments)

# Create a new project to contain our model.
pid = connection.find_or_create_project(arguments.project_name)

# Create the new, empty model.
mid = connection.create_model(pid, "generic", arguments.model_name, arguments.marking)

# Store arbitrary data as name-value pairs in the model.
connection.store_parameter(mid, "name", "Fred")
connection.store_parameter(mid, "pi", 3.1416)

# Start an array set (a collection of zero-to-many arrays).
connection.start_array_set(mid, "data")

# Start an array (a dense, multi-dimension, multi-attribute array).
connection.start_array(mid, "data", 0, ("range", "int64"), ("i", "int64", 0, 10))

# Store values into an array attribute.
connection.store_array_attribute(mid, "data", 0, 0, numpy.arange(10))

# Signal that we're done uploading data to the model.  This lets Slycat Web
# Server know that it can perform any required computation.
connection.finish_model(mid)
# Wait until the model is ready.
connection.join_model(mid)

# Suppl the user with a direct link to the new model.
slycat.web.client.log.info("Your new model is located at %s/models/%s" % (arguments.host, mid))

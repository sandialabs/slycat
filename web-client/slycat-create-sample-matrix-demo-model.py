#!/bin/env python
# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import numpy
import slycat.web.client

# Parse command-line arguments.
parser = slycat.web.client.ArgumentParser()
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument("--model-name", default="Sample Matrix Demo Model", help="New model name.  Default: %(default)s")
parser.add_argument("--project-name", default="Sample Matrix Demo Project", help="New project name.  Default: %(default)s")
arguments = parser.parse_args()

# Create a pair of random matrices.
A = numpy.random.random_integers(0, 10, size=(4, 4))
B = numpy.random.random_integers(0, 10, size=(4, 4))

# Create a connection to the Slycat server.
connection = slycat.web.client.connect(arguments)

# Find-or-create a project to contain our new model.
pid = connection.find_or_create_project(arguments.project_name)

# Create our new model.
mid = connection.post_project_models(pid, "matrix-demo", arguments.model_name, arguments.marking)

# Store each matrix as a separate arrayset artifact containing a single, two-dimensional darray with a single attribute.
dimensions = [dict(name="row", end=A.shape[0]), dict(name="column", end=A.shape[1])]
attributes = [dict(name="value", type="int64")]
connection.put_model_arrayset(mid, "A")
connection.put_model_arrayset_array(mid, "A", 0, dimensions, attributes)
connection.put_model_arrayset_data(mid, "A", "0/0/...", [A])

dimensions = [dict(name="row", end=B.shape[0]), dict(name="column", end=B.shape[1])]
attributes = [dict(name="value", type="int64")]
connection.put_model_arrayset(mid, "B")
connection.put_model_arrayset_array(mid, "B", 0, dimensions, attributes)
connection.put_model_arrayset_data(mid, "B", "0/0/...", [B])

# Let the server know that we're done creating the model.
connection.post_model_finish(mid)
connection.join_model(mid)

# Provide a handy link to the new model.
slycat.web.client.log.info("Your new model is located at %s/models/%s" % (arguments.host, mid))

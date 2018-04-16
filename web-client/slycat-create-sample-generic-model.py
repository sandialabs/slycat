#!/bin/env python
# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

"""Create a Slycat generic model.

A Slycat generic model is a container for data that doesn't do any computation.
Use generic models to stuff custom data into Slycat Web Server and/or as a
starting-point for custom models of your own.
"""

import numpy
import slycat.web.client

parser = slycat.web.client.ArgumentParser()
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument("--model-name", default="Sample Generic Model", help="New model name.  Default: %(default)s")
parser.add_argument("--project-name", default="Sample Generic Project", help="New project name.  Default: %(default)s")
arguments = parser.parse_args()

# Setup a connection to the Slycat Web Server.
connection = slycat.web.client.connect(arguments)

# Create a new project to contain our model.
pid = connection.find_or_create_project(arguments.project_name)

# Create the new, empty model.
mid = connection.post_project_models(pid, "generic", arguments.model_name, arguments.marking)

# Signal that we're done uploading data to the model.  This lets Slycat Web
# Server know that it can perform any required computation.
connection.post_model_finish(mid)
# Wait until the model is ready.
connection.join_model(mid)

# Suppl the user with a direct link to the new model.
slycat.web.client.log.info("Your new model is located at %s/models/%s" % (arguments.host, mid))

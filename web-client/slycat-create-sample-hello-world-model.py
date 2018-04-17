#!/bin/env python
# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import slycat.web.client

parser = slycat.web.client.ArgumentParser()
parser.add_argument("--name", default="World", help="Name.  Default: %(default)s")
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument("--model-name", default="Sample Hello World Model", help="New model name.  Default: %(default)s")
parser.add_argument("--project-name", default="Sample Hello World Project", help="New project name.  Default: %(default)s")
arguments = parser.parse_args()

connection = slycat.web.client.connect(arguments)

pid = connection.find_or_create_project(arguments.project_name)

mid = connection.post_project_models(pid, "hello-world", arguments.model_name, arguments.marking)
connection.put_model_parameter(mid, "name", arguments.name)

connection.post_model_finish(mid)
connection.join_model(mid)

slycat.web.client.log.info("Your new model is located at %s/models/%s" % (arguments.host, mid))

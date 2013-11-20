# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import slycat.web.client
import sys

parser = slycat.web.client.option_parser()
parser.add_option("--marking", default="", help="Marking type.  Default: %default")
parser.add_option("--model-name", default="Demo Generic Model", help="New model name.  Default: %default")
parser.add_option("--project-name", default="Demo Generic Project", help="New project name.  Default: %default")
options, arguments = parser.parse_args()

connection = slycat.web.client.connect(options)
pid = connection.create_project(options.project_name)
mid = connection.create_model(pid, "generic", options.model_name, options.marking)
connection.set_parameter(mid, "name", "Fred")
connection.set_parameter(mid, "pi", 3.1416)
connection.start_array_set(mid, "data")
#connection.create_array(mid, "data", 0, ("range", "int64"), ("i", 10))
connection.finish_model(mid)
sys.stderr.write("Your new model is located at %s/models/%s\n" % (options.host, mid))

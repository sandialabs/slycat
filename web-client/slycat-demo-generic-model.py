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
#connection.set_parameter(mid, "input-columns", range(0, options.input_count))
#connection.set_parameter(mid, "output-columns", range(options.input_count, options.input_count + options.output_count))
#connection.set_parameter(mid, "scale-inputs", False)
connection.finish_model(mid)
sys.stderr.write("Your new model is located at %s/models/%s\n" % (options.host, mid))

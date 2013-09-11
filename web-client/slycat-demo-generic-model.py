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
wid = connection.create_generic_model_worker(pid, options.model_name, options.marking)
connection.set_parameter(wid, "MyParameter", ["My", {"Complex" : "Value"}])
connection.start_table(wid, "MyTable", ["Name","Height","Weight"],["string","double","double"])
connection.send_table_rows(wid, "MyTable", [["Fred", 2.03, 78], ["Jan", 1.45, 54]])
connection.finish_table(wid, "MyTable")
mid = connection.finish_model(wid)
connection.join_worker(wid)
sys.stderr.write("Your new model is located at %s/models/%s\n" % (options.host, mid))

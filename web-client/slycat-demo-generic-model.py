# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import slycat.web.client
import sys

parser = slycat.web.client.option_parser()
parser.add_option("--marking", default="", help="Marking type.  Default: %default")
options, arguments = parser.parse_args()

connection = slycat.web.client.connect(options)

pid = connection.create_project("Generic Model Test")
mwid = connection.create_generic_model_worker(pid, "Model", options.marking)
connection.set_parameter(mwid, "MyParameter", ["My", {"Complex" : "Value"}])
connection.start_table(mwid, "MyTable", ["Name","Height","Weight"],["string","double","double"])
connection.send_table_rows(mwid, "MyTable", [["Fred", 2.03, 78], ["Jan", 1.45, 54]])
connection.finish_table(mwid, "MyTable")
mid = connection.finish_model(mwid)
#connection.delete_worker(mwid)

sys.stderr.write("Your new model will be at %s/models/%s when complete.\n" % (options.host, mid))

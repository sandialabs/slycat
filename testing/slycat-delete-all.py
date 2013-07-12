# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import slycat.client
import getpass
import optparse

parser = slycat.client.option_parser()
options, arguments = parser.parse_args()

connection = slycat.client.connect(options)

for project in connection.get_projects():
  connection.delete_project(project["_id"])

for worker in connection.get_workers():
  connection.delete_worker(worker["_id"], stop=True)

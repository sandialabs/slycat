# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import slycat.web.client

parser = slycat.web.client.option_parser()
arguments = parser.parse_args()

connection = slycat.web.client.connect(arguments)
for project in connection.get_projects()["projects"]:
  connection.delete_project(project["_id"])

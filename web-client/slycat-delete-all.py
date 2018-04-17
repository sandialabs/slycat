#!/bin/env python
# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import slycat.web.client

parser = slycat.web.client.ArgumentParser()
arguments = parser.parse_args()

connection = slycat.web.client.connect(arguments)
for project in connection.get_projects()["projects"]:
  connection.delete_project(project["_id"])

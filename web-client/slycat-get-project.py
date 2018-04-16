#!/bin/env python
# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import pprint
import slycat.web.client

parser = slycat.web.client.ArgumentParser()
parser.add_argument("pid", help="The ID of the project to retrieve")
arguments = parser.parse_args()

connection = slycat.web.client.connect(arguments)
project = connection.get_project(arguments.pid)
pprint.pprint(project)

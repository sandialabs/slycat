# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

# This script lists the projects available for a given user

import slycat.web.client

# get arguments for connecting to Slycat server
parser = slycat.web.client.ArgumentParser(
    description="List projects accessible for a given user.")
arguments = parser.parse_args()

# connect and get projects
connection = slycat.web.client.connect(arguments)
projects = connection.get_projects()

# output projects
for project in projects["projects"]:
    print("Found user %s project %s." %(arguments.user, project["name"]))
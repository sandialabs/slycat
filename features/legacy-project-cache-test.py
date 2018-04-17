# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import slycat.web.client
import time

parser = slycat.web.client.ArgumentParser()
parser.add_argument("--project-name", default="Project Cache Test", help="New project name.  Default: %(default)s")
arguments = parser.parse_args()

connection = slycat.web.client.connect(arguments)
pid = connection.find_or_create_project(arguments.project_name)
sid = connection.post_remotes("localhost", "slycat", "slycat")

connection.get_remote_image(sid, "/home/slycat/src/slycat/artwork/slycat-logo-original-artwork.png", cache="project", project=pid, key="test")
connection.get_project_cache_object(pid, "test")
connection.get_remote_image(sid, "/home/slycat/src/slycat/artwork/slycat-logo-original-artwork.png", cache="project", project=pid, key="test")
connection.get_project_cache_object(pid, "test")

#connection.delete_project_cache_object(pid, "test")

connection.delete_remote(sid)

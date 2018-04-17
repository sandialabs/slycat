# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import argparse
import os
import cherrypy
import slycat.web.server.engine

parser = argparse.ArgumentParser()
parser.add_argument("--config", default="/home/slycat/etc/slycat/web-server-config.ini", help="Path to a file containing configuration parameters.")
arguments = parser.parse_args()

root_path = os.path.dirname(os.path.abspath(__file__))
#slycat.web.server.engine.start(root_path, arguments.config)
server_config = slycat.web.server.engine.start(root_path, arguments.config)

# TODO: should the 2nd "script_name" arg be ""? or None? 
application = cherrypy.Application(None, "", server_config)

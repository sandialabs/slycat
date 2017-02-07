# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

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

application = cherrypy.Application(None, None, server_config)

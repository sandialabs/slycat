# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import argparse
import os

parser = argparse.ArgumentParser()
parser.add_argument("--config", default=None, help="Path to a file containing configuration parameters.")
arguments = parser.parse_args()

config_path = "config.ini"

if "SLYCAT_WEB_SERVER_CONFIG" in os.environ:
  config_path = os.environ["SLYCAT_WEB_SERVER_CONFIG"]

if arguments.config is not None:
  config_path = arguments.config

import os
import slycat.web.server.engine
slycat.web.server.engine.start(os.path.dirname(os.path.abspath(__file__)), config_path)


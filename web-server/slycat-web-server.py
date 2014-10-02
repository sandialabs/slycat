# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import optparse
parser = optparse.OptionParser()
parser.add_option("--config", default="config.ini", help="Path to a file containing configuration parameters.")
options, arguments = parser.parse_args()

import os
import slycat.web.server.engine
slycat.web.server.engine.start(os.path.dirname(os.path.abspath(__file__)), options.config)


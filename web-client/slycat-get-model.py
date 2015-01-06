#!/bin/env python
# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import pprint
import slycat.web.client

parser = slycat.web.client.option_parser()
parser.add_argument("mid", help="The ID of the model to retrieve")
arguments = parser.parse_args()

connection = slycat.web.client.connect(arguments)
model = connection.get_model(arguments.mid)
pprint.pprint(model)

# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import slycat.server.worker.model

class implementation(slycat.server.worker.model.prototype):
  """Worker that creates a "generic" model."""
  def __init__(self, security, pid, mid, name, marking, description):
    slycat.server.worker.model.prototype.__init__(self, security, "Generic model", pid, mid, "generic", name, marking, description, incremental=True)

  def compute_model(self):
    pass

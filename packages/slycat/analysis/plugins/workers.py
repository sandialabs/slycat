# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import Pyro4

def workers(connection):
  """Return the current set of available slycat analysis workers.

  Signature: workers()
  """
  for worker in connection.nameserver.list(prefix="slycat.worker").keys():
    proxy = Pyro4.Proxy(connection.nameserver.lookup(worker))
    proxy._pyroOneway.add("shutdown")
    yield proxy

def register_client_plugin(context):
  context.register_plugin_function("workers", workers)

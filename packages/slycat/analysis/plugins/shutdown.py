# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def shutdown(connection):
  """Request that the connected coordinator and all workers shut-down.

  Note that this is currently an experimental feature, which does not enforce
  any access controls.  Shutting down while other clients are working will
  make you very unpopular!
  """
  connection.proxy._pyroOneway.add("shutdown")
  connection.proxy.shutdown()

def register_client_plugin(context):
  context.add_operator("shutdown", shutdown)

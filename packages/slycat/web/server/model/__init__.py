# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def load_json_artifact(model, name):
  """Retrieve a json artifact from a model."""
  if model["artifact-types"][name] != "json":
    raise Exception("Not a json artifact.")
  return model["artifact:%s" % name]

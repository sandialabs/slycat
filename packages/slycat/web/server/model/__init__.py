# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import h5py
import json
import numbers
import numpy
import os
import slycat.hdf5
import slycat.table
import slycat.web.server.database.couchdb
import slycat.web.server.database.hdf5
import sys
import uuid

###############################################################################
# Deprecated functions that shouldn't be used in new code.  Prefer to use the
# functions in slycat.web.server wherever possible.

def load_hdf5_artifact(model, name):
  """Retrieve an hdf5 artifact from a model."""
  if model["artifact-types"][name] not in ["hdf5"]:
    raise Exception("Not an hdf5 artifact.")
  return model["artifact:%s" % name]

def store_table_file(database, model, name, data, filename, nan_row_filtering, input=False):
  slycat.web.server.update_model(database, model, message="Loading table %s from %s." % (name, filename))
  try:
    array = slycat.table.parse(data)
  except:
    raise cherrypy.HTTPError("400 Could not parse file %s" % filename)

  storage = uuid.uuid4().hex
  with slycat.web.server.database.hdf5.create(storage) as file:
    database.save({"_id" : storage, "type" : "hdf5"})
    model["artifact:%s" % name] = storage
    model["artifact-types"][name] = "hdf5"
    if input:
      model["input-artifacts"] = list(set(model["input-artifacts"] + [name]))
    database.save(model)
    arrayset = slycat.hdf5.ArraySet(file)
    arrayset.store_array(0, array)


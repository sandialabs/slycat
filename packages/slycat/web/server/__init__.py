# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import slycat.hdf5
import slycat.web.server.database.hdf5

def update_model(database, model, **kwargs):
  """Update the model, and signal any waiting threads that it's changed."""
  for name, value in kwargs.items():
    if name in ["state", "result", "started", "finished", "progress", "message"]:
      model[name] = value
  database.save(model)

def get_model_array_attribute_chunk(database, model, aid, array, attribute, hyperslice):
  artifact = model["artifact:%s" % aid]
  artifact_type = model["artifact-types"][aid]
  assert artifact_type  == "hdf5"

  with slycat.web.server.database.hdf5.lock:
    with slycat.web.server.database.hdf5.open(artifact) as file:
      hdf5_arrayset = slycat.hdf5.ArraySet(file)
      hdf5_array = hdf5_arrayset[array]
      data = hdf5_array.get_data(attribute)[hyperslice]
      return data

def get_model_array_metadata(database, model, aid, array):
  artifact = model["artifact:%s" % aid]
  artifact_type = model["artifact-types"][aid]
  assert artifact_type == "hdf5"

  with slycat.web.server.database.hdf5.lock:
    with slycat.web.server.database.hdf5.open(artifact, "r+") as file: # We open the file with writing enabled because retrieving statistics may need to update the cache.
      hdf5_arrayset = slycat.hdf5.ArraySet(file)
      hdf5_array = hdf5_arrayset[array]
      metadata = dict(dimensions=hdf5_array.dimensions, attributes=hdf5_array.attributes, statistics=[hdf5_array.get_statistics(attribute) for attribute in range(len(hdf5_array.attributes))])
  return metadata


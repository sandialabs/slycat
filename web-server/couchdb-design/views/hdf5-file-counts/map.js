/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

function(doc)
{
  if(doc["type"] == "hdf5")
  {
    emit(doc["_id"], 0);
  }
  else if(doc["type"] == "model")
  {
    artifact_types = doc["artifact-types"];
    if(artifact_types)
    {
      for(var artifact in artifact_types)
      {
        if(artifact_types[artifact] == "hdf5")
        {
          emit(doc["artifact:" + artifact], 1);
        }
      }
    }
  }
}

/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

function(doc)
{
  if(doc["type"] == "array")
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
        if(artifact_types[artifact] == "array")
        {
          emit(doc["artifact:" + artifact]["storage"], 1);
        }
        else if(artifact_types[artifact] == "timeseries")
        {
          emit(doc["artifact:" + artifact]["columns"], 1);
          emit(doc["artifact:" + artifact]["column-names"], 1);
        }
      }
    }
  }
}

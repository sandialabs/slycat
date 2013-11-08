/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

function(doc)
{
  if(doc["type"] != "model")
    return;

  artifact_types = doc["artifact-types"];
  if(artifact_types)
  {
    for(var artifact in artifact_types)
    {
      if(artifact_types[artifact] == "array")
      {
        emit(doc._id, doc["artifact:" + artifact]["storage"]);
      }
      else if(artifact_types[artifact] == "timeseries")
      {
        emit(doc._id, doc["artifact:" + artifact]["columns"]);
        emit(doc._id, doc["artifact:" + artifact]["column-names"]);
      }
    }
  }
}

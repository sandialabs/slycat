/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

function(doc)
{
  if(doc["type"] != "model")
    return;
  if(doc["state"] == null)
    return;
  if(doc["state"] == "closed")
    return;
  emit(doc._id, null);
}

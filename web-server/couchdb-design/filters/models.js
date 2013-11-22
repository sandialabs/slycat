function(doc, req)
{
  if(doc._deleted)
    return true;
  if(doc.type != "model")
    return false;
  if(doc.state == null)
    return false;
  if(doc.state == "closed")
    return false;
  return true
}

/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-page-demo-child-page", [], function()
{
  window.addEventListener("message", function(event)
  {
    console.log(event);
    if(event.data === "close")
    {
      window.close();
    }
  });

  window.addEventListener("unload", function(event)
  {
    window.opener.postMessage("closing", "*");
  });
});


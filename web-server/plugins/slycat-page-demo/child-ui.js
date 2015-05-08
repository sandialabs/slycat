/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-page-demo-child-page", ["knockout", "URI"], function(ko, URI)
{
  if(!window.opener && URI().hasQuery("role", "child") === true)
  {
    window.close();
    return;
  }

  window.addEventListener("message", function(event)
  {
    console.log(event);
  });

  window.addEventListener("unload", function(event)
  {
    window.opener.postMessage("closing", "*");
  });
});


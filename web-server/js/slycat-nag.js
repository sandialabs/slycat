/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-nag", ["slycat-dialog"], function(dialog)
{
  var nag = false;

  // We need EventSource for our live project and model feeds.
  if(!window.EventSource)
    nag = true;

  // We need localStorage for many of our standarized controls and bookmarks.
  if(!window.localStorage)
    nag = true;

  if(nag)
  {
    dialog.dialog(
    {
      title: "Compatibility Alert",
      message: "Your browser is missing features required by Slycat. We suggest switching to a current version of Firefox, Chrome, or Safari.",
    });
  }
});

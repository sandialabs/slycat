/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-page-demo-model", ["slycat-web-client", "knockout", "knockout-mapping", "URI", "domReady!"], function(client, ko, mapping, d3, URI)
{
  // Setup storage for the data we're going to plot.
  var page =
  {
  };

  ko.applyBindings(page, document.getElementById("slycat-page-demo"));
});


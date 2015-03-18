/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-generic-model", ["slycat-changes-feed", "knockout", "knockout-mapping", "URI", "domReady!"], function(changes_feed, ko, mapping, URI)
{
  // Setup storage for the data we're going to plot.
  var page = {};

  page.mid = ko.observable(URI(window.location).segment(-1));

  page.model = changes_feed.models().filter(function(model)
  {
    return model._id() == page.mid();
  });

  page.formatted_model = ko.pureComputed(function()
  {
    return JSON.stringify(mapping.toJS(page.model()), null, 2);
  });

  ko.applyBindings(page, document.getElementById("slycat-generic"));
});


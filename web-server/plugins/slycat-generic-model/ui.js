/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-generic-model", ["slycat-models-feed", "knockout", "knockout-mapping", "domReady!"], function(models_feed, ko, mapping)
{
  // Setup storage for the data we're going to plot.
  var page = {};

  page.mid = ko.observable(location.pathname.split("/").reverse()[0]);

  page.model = models_feed.watch().filter(function(model)
  {
    return model._id() == page.mid();
  });

  page.formatted_model = ko.pureComputed(function()
  {
    return JSON.stringify(mapping.toJS(page.model()), null, 2);
  });

  ko.applyBindings(page, document.getElementById("slycat-generic"));
});


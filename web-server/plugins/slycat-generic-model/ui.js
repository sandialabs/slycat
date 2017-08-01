/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-generic-model", ["slycat-web-client", "knockout", "knockout-mapping", "URI", "domReady!"], function(client, ko, mapping, URI)
{
  // Setup storage for the data we're going to plot.
  var page = {};

  page.mid = ko.observable(URI(window.location).segment(-1));
  page.model = ko.observableArray();
  client.get_model({
    mid: page.mid(),
    success: function(result) {
      page.model.push(mapping.fromJS(result));
    },
    error: function(request, status, reason_phrase) {
      console.log("Unable to retrieve model.");
    }
  });

  page.formatted_model = ko.pureComputed(function()
  {
    return JSON.stringify(mapping.toJS(page.model()), null, 2);
  });

  ko.applyBindings(page, document.getElementById("slycat-generic"));
});


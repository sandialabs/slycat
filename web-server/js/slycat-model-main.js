/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-model-main", ["slycat-models-feed", "knockout", "URI"], function(models_feed, ko, URI)
{
  var module = {};

  module.start = function()
  {
    // Enable knockout
    var mid = URI(window.location).segment(-1);
    var page = {};
    page.models = models_feed.watch().filter(function(model)
    {
      return mid == model._id();
    });
    page.title = ko.pureComputed(function()
    {
      var models = page.models();
      return models.length ? models[0].name() + " - Slycat Model" : "";
    });
    ko.applyBindings(page, document.querySelector("head"));
    ko.applyBindings(page, document.querySelector("slycat-navbar"));
  };

  return module;
});

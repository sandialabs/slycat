/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-linear-regression-demo-model", ["slycat-web-client", "domReady!"], function(client)
{
  // Setup storage for the data we're going to plot.
  var page =
  {
    width: ko.observable(600),
    height: ko.observable(600),
    x: ko.observableArray(),
    y: ko.observableArray(),
    slope: ko.observable(null),
    intercept: ko.observable(null),
    r: ko.observable(null),
    p: ko.observable(null),
    error: ko.observable(null),
  };
  page.points = ko.pureComputed(function()
  {
    return [];
  });
  ko.applyBindings(page, document.getElementById("slycat-linear-regression-demo"));

  // Load the model data.
  var mid = location.pathname.split("/").reverse()[0];

  client.get_model_parameter(
  {
    mid: mid,
    name: "slope",
    success: function(value)
    {
      page.slope(value);
    }
  });

  client.get_model_parameter(
  {
    mid: mid,
    name: "intercept",
    success: function(value)
    {
      page.intercept(value);
    }
  });

  client.get_model_parameter(
  {
    mid: mid,
    name: "r",
    success: function(value)
    {
      page.r(value);
    }
  });

  client.get_model_parameter(
  {
    mid: mid,
    name: "p",
    success: function(value)
    {
      page.p(value);
    }
  });

  client.get_model_parameter(
  {
    mid: mid,
    name: "error",
    success: function(value)
    {
      page.error(value);
    }
  });
});


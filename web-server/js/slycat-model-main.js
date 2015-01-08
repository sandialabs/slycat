/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-model-main", [], function()
{
  var module = {};

  module.start = function()
  {
    // Enable knockout
    page = {};
    ko.applyBindings(page);
  };

  return module;
});

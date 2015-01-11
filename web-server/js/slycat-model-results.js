/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-model-results", ["slycat-server-root", "knockout"], function(server_root, ko)
{
  ko.components.register("slycat-model-results",
  {
    viewModel: function(params)
    {
      var component = this;
      component.server_root = server_root;
      component.mid = params.mid;
    },
    template: { require: "text!" + server_root + "templates/slycat-model-results.html" }
  });
});

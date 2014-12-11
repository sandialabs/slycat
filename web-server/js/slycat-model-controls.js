/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-model-controls", ["slycat-server-root", "slycat-web-client", "slycat-markings"], function(server_root, client, markings)
{
  ko.components.register("slycat-model-controls",
  {
    viewModel: function(params)
    {
      var component = this;
      component.name = params.name;
      component.description = params.description;
      component.marking = params.marking;
      component.markings = markings;
    },
    template: { require: "text!" + server_root + "templates/slycat-model-controls.html" }
  });
});


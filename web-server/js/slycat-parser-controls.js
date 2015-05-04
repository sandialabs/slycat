/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-parser-controls", ["slycat-server-root", "slycat-parsers", "knockout"], function(server_root, parsers, ko)
{
  ko.components.register("slycat-parser-controls",
  {
    viewModel: function(params)
    {
      var component = this;
      component.parser = params.parser || ko.observable(null);
      component.parsers = parsers.available;

      // This is a tad awkward, but a default marking may-or-may-not be available yet.
      if(component.parser() === null)
      {
        component.parser(parsers.preselected());
        parsers.preselected.subscribe(function()
        {
          component.parser(parsers.preselected());
        });
      }
    },
    template: { require: "text!" + server_root + "templates/slycat-parser-controls.html" }
  });
});


/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define("slycat-parser-controls", ["slycat-server-root", "slycat-parsers", "knockout", "lodash"], function(server_root, parsers, ko, lodash)
{
  ko.components.register("slycat-parser-controls",
  {
    viewModel: function(params)
    {
      var component = this;
      component.parser = params.parser || ko.observable(null);
      component.disabled = params.disabled === undefined ? false : params.disabled;

      if(params.category)
      {
        component.parsers = parsers.available.filter(function(parser)
        {
          return lodash.contains(parser.categories(), params.category);
        });
      }
      else
      {
        component.parsers = parsers.available;
      }

      function assign_default_parser()
      {
        if(component.parser() === null && component.parsers().length)
        {
          component.parser(component.parsers()[0].type());
        }
      }
      component.parsers.subscribe(assign_default_parser);
      assign_default_parser();
    },
    template: { require: "text!" + server_root + "templates/slycat-parser-controls.html" }
  });
});


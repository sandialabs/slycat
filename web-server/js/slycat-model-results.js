/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

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

/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define(["slycat-server-root", "slycat-web-client", "knockout"], function(server_root, client, ko) {
  var constructor = function(params) {
    return {
      viewModel: {
        project: params.projects()[0]
      }
    };
  };
  return {
    viewModel: constructor,
    template: {
      require: "text!" + server_root + "resources/wizards/slycat-info-project/ui.html"
    }
  };
});

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

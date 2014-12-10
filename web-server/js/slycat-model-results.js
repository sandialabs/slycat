define("slycat-model-results", ["slycat-server-root"], function(server_root)
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

define("slycat-remote-controls", ["slycat-server-root"], function(server_root)
{
  ko.components.register("slycat-remote-controls",
  {
    viewModel: function(params)
    {
      var component = this;
      component.hostname = ko.observable(null);
      component.username = ko.observable(null);
      component.password = ko.observable(null);

      if(params.data)
        params.data(component);
    },
    template: { require: "text!" + server_root + "templates/slycat-remote-controls.html" }
  });

});

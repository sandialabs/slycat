define("slycat-remote-controls", ["slycat-server-root", "slycat-web-client"], function(server_root, client)
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

/*
      client.get_configuration_remote_hosts(
      {
        success: function(hosts)
        {
          console.log(hosts);
        }
      });
*/
    },
    template: { require: "text!" + server_root + "templates/slycat-remote-controls.html" }
  });

});

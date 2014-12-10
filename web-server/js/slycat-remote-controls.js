define("slycat-remote-controls", ["slycat-server-root", "slycat-web-client"], function(server_root, client)
{
  ko.components.register("slycat-remote-controls",
  {
    viewModel: function(params)
    {
      var component = this;
      component.hostname = params.hostname;
      component.username = params.username;
      component.password = params.password;

      if(!params.hostname())
        params.hostname(localStorage.getItem("slycat-remote-controls-hostname"));
      if(!params.username())
        params.username(localStorage.getItem("slycat-remote-controls-username"));

      params.hostname.subscribe(function(value)
      {
        localStorage.setItem("slycat-remote-controls-hostname", value);
      });
      params.username.subscribe(function(value)
      {
        localStorage.setItem("slycat-remote-controls-username", value);
      });
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

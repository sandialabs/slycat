/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-remote-controls", ["slycat-server-root", "slycat-web-client", "knockout", "knockout-mapping"], function(server_root, client, ko, mapping)
{
  ko.components.register("slycat-remote-controls",
  {
    viewModel: function(params)
    {
      var component = this;
      component.hostname = params.hostname;
      component.username = params.username;
      component.password = params.password;
      component.error = params.error;
      component.remote_hosts = mapping.fromJS([]);
      component.use_remote = function(remote_host)
      {
        component.hostname(remote_host.hostname());
      }

      if(!component.hostname())
        component.hostname(localStorage.getItem("slycat-remote-controls-hostname"));
      if(!component.username())
        component.username(localStorage.getItem("slycat-remote-controls-username"));

      component.hostname.subscribe(function(value)
      {
        localStorage.setItem("slycat-remote-controls-hostname", value);
        component.error("");
      });
      component.username.subscribe(function(value)
      {
        localStorage.setItem("slycat-remote-controls-username", value);
        component.error("");
      });
      component.password.subscribe(function(value)
      {
        component.error("");
      });
      client.get_configuration_remote_hosts(
      {
        success: function(remote_hosts)
        {
          var current_host = component.hostname();
          remote_hosts.sort(function(left, right)
          {
            return left.hostname == right.hostname ? 0 : left.hostname < right.hostname ? -1 : 1;
          });
          mapping.fromJS(remote_hosts, component.remote_hosts);
          component.hostname(current_host || component.hostname());
        }
      });
    },
    template: { require: "text!" + server_root + "templates/slycat-remote-controls.html" }
  });

});

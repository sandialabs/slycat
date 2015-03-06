/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-remote-controls", ["slycat-server-root", "slycat-web-client", "knockout", "knockout-mapping", "jquery"], function(server_root, client, ko, mapping, $)
{
  ko.components.register("slycat-remote-controls",
  {
    viewModel:
    {
      createViewModel: function(params, component_info)
      {
        var component = {};
        component.hostname = params.hostname;
        component.username = params.username;
        component.password = params.password;
        component.status = params.status || ko.observable(null);
        component.status_type = params.status_type || ko.observable(null);
        component.remote_hosts = mapping.fromJS([]);

        component.status_classes = ko.pureComputed(function()
        {
          var classes = [];
          if(component.status())
            classes.push("in");
          if(component.status_type())
            classes.push("alert-" + component.status_type());
          return classes.join(" ");
        });

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
          component.status(null);
        });

        component.username.subscribe(function(value)
        {
          localStorage.setItem("slycat-remote-controls-username", value);
          component.status(null);
        });

        component.password.subscribe(function(value)
        {
          component.status(null);
        });

        $(component_info.element).find("input").keydown(function(e)
        {
          if(e.which == 13 && params.activate)
            params.activate();
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

        return component;
      },
    },
    template: { require: "text!" + server_root + "templates/slycat-remote-controls.html" }
  });

});

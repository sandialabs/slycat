/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-login-controls", ["slycat-server-root", "slycat-web-client", "knockout", "knockout-mapping", "jquery"], function(server_root, client, ko, mapping, $)
{
  ko.components.register("slycat-login-controls",
  {
    viewModel:
    {
      createViewModel: function(params, component_info)
      {
        var component = {};
        component.username = params.username;
        component.password = params.password;
        component.status = params.status || ko.observable(null);
        component.status_type = params.status_type || ko.observable(null);

        component.status_classes = ko.pureComputed(function()
        {
          var classes = [];
          if(component.status())
            classes.push("in");
          if(component.status_type())
            classes.push("alert-" + component.status_type());
          return classes.join(" ");
        });

        if(!component.username())
          component.username(localStorage.getItem("slycat-login-controls-username"));

        component.username.subscribe(function(value)
        {
          localStorage.setItem("slycat-login-controls-username", value);
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

        return component;
      },
    },
    template: { require: "text!" + server_root + "templates/slycat-login-controls.html" }
  });
});

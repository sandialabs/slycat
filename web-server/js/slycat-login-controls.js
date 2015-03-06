/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-login-controls", ["slycat-server-root", "slycat-web-client", "knockout", "knockout-mapping", "jquery"], function(server_root, client, ko, mapping, $)
{
  ko.components.register("slycat-login-controls",
  {
    viewModel: function(params)
    {
      var component = this;
      component.username = params.username;
      component.password = params.password;
      component.status = params.status || ko.observable(null);
      component.error = params.error || ko.observable(null);

      component.message = ko.pureComputed(function()
      {
        return component.status() || component.error();
      });

      if(!component.username())
        component.username(localStorage.getItem("slycat-login-controls-username"));

      component.username.subscribe(function(value)
      {
        localStorage.setItem("slycat-login-controls-username", value);
        component.status(null);
        component.error(null);
      });

      component.password.subscribe(function(value)
      {
        component.status(null);
        component.error(null);
      });

      $("#slycat-login-controls input").keydown(function(e)
      {
        if(e.which == 13 && params.activate)
          params.activate();
      });
    },
    template: { require: "text!" + server_root + "templates/slycat-login-controls.html" }
  });

});

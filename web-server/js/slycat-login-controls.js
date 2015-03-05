/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-login-controls", ["slycat-server-root", "slycat-web-client", "knockout", "knockout-mapping"], function(server_root, client, ko, mapping)
{
  ko.components.register("slycat-login-controls",
  {
    viewModel: function(params)
    {
      var component = this;
      component.username = params.username;
      component.password = params.password;
      component.error = params.error;

      if(!component.username())
        component.username(localStorage.getItem("slycat-remote-controls-username"));

      component.username.subscribe(function(value)
      {
        localStorage.setItem("slycat-login-controls-username", value);
      });
    },
    template: { require: "text!" + server_root + "templates/slycat-login-controls.html" }
  });

});

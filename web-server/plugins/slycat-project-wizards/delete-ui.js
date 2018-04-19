/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define(["slycat-server-root", "slycat-web-client"], function(server_root, client)
{
  function constructor(params)
  {
    var component = {};
    component.project = params.projects()[0];

    component.delete_project = function()
    {
      client.delete_project(
      {
        pid: component.project._id(),
        success: function()
        {
          window.location.href = server_root + "projects";
        }
      });
    }
    return component;
  }

  return {
    viewModel: constructor,
    template: { require: "text!" + server_root + "resources/wizards/slycat-delete-project/ui.html" },
    };
});

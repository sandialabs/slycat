/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define(["slycat-server-root", "slycat-web-client", "knockout", "knockout-mapping"], function(server_root, client, ko, mapping)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.name = ko.observable("");
    component.description = ko.observable("");

    component.finish = function()
    {
      client.post_projects(
      {
        name : component.name(),
        description : component.description(),
        success : function(pid)
        {
          window.location.href = server_root + "projects/" + pid;
        }
      });
    }
    return component;
  }

  return {
    viewModel: constructor,
    template: { require: "text!" + server_root + "resources/wizards/slycat-create-project/ui.html"},
    };
});

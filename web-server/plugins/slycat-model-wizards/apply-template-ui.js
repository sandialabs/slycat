/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "slycat-bookmark-manager", "knockout", "knockout-mapping"], function(server_root, client, dialog, bookmark_manager, ko, mapping)
{
  function constructor(params)
  {
    var component = {};
    component.project = params.projects()[0];
    component.model = params.models()[0];
    component.references = mapping.fromJS([]);
    component.reference = ko.observable(null);

    client.get_project_references(
    {
      pid: component.project._id(),
      success: function(references)
      {
        mapping.fromJS(references, component.references);
      },
    });

    component.apply_template = function()
    {
      bookmark_manager.current_bid(component.reference());
    }
    return component;
  }

  return {
    viewModel: constructor,
    template: { require: "text!" + server_root + "resources/wizards/slycat-apply-template/ui.html" },
    };
});

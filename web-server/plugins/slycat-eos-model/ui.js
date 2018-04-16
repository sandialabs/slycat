/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "slycat-markings", "knockout", "knockout-mapping"], function(server_root, client, dialog, markings, ko, mapping)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.model = mapping.fromJS({_id: null, name: "New EOS Model", description: "", marking: markings.preselected()});
    component.recipient = ko.observable("EOS");

    component.create = function()
    {
      component.tab(1);
    };

    component.go_to_model = function() {
      location = server_root + 'models/' + component.model._id();
    };

    component.finish = function()
    {
      client.post_project_models(
      {
        pid: component.project._id(),
        type: "eos",
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function(mid)
        {
          component.model._id(mid);

          client.put_model_parameter(
          {
            mid: component.model._id(),
            aid: "name",
            value: component.recipient(),
            input: true,
            success: function()
            {
              client.post_model_finish(
              {
                mid: component.model._id(),
                success: function()
                {
                  component.tab(2);
                }
              });
            }
          });
        },
        error: dialog.ajax_error("Error creating model.")
      });
    };
    return component;
  }

  return {
    viewModel: constructor,
    template: { require: "text!" + server_root + "resources/wizards/hello-world/ui.html" }
  };
});

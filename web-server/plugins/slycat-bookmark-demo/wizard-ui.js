define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "slycat-markings", "knockout", "knockout-mapping"], function(server_root, client, dialog, markings, ko, mapping)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.model = mapping.fromJS({_id: null, name: "New Bookmark Demo Model", description: "This model demonstrates how Slycat bookmarks work.", marking: markings.preselected()});

    component.cancel = function()
    {
      if(component.model._id())
        client.delete_model({ mid: component.model._id() });
    }

    component.create_model = function()
    {
      client.post_project_models(
      {
        pid: component.project._id(),
        type: "bookmark-demo",
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function(mid)
        {
          component.model._id(mid);
          client.post_model_finish(
          {
            mid: component.model._id(),
            success: function()
            {
              component.tab(1);
            }
          });
        },
        error: dialog.ajax_error("Error creating model."),
      });
    }

    component.go_to_model = function() {
      location = server_root + 'models/' + component.model._id();
    }

    return component;
  }

  return {
    viewModel: constructor,
    template: { require: "text!" + server_root + "resources/wizards/bookmark-demo/ui.html" },
    };
});

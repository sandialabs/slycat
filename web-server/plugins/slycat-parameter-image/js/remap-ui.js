define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "knockout", "knockout-mapping"], function(server_root, client, dialog, ko, mapping)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.original = params.models()[0];
    component.model = mapping.fromJS(
    {
      _id: null,
      name: "Remapped " + component.original.name(),
      description: component.original.description(),
      marking: component.original.marking(),
    });
    component.media_columns = mapping.fromJS([]);
    component.search = ko.observable("");
    component.replace = ko.observable("");

    client.get_model_parameter(
    {
      mid: component.original._id(),
      name: "image-columns",
      success: function(value)
      {
        mapping.fromJS(value, component.media_columns);
      },
    });

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
        type: "parameter-image",
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function(mid)
        {
          component.model._id(mid);
          client.put_model_inputs(
          {
            mid: component.model._id(),
            sid: component.original._id(),
            success: function()
            {
              component.tab(1);
            }
          });
        },
        error: dialog.ajax_error("Error creating model."),
      });
    }

    component.finish = function()
    {
      client.get_model_command(
      {
        mid: component.model._id(),
        command: "search-and-replace",
        parameters:
        {
          columns: component.media_columns(),
          search: component.search(),
          replace: component.replace(),
        },
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
        },
        error: dialog.ajax_error("There was a problem remapping the data: "),
      });
    }

    return component;
  }

  return {
    viewModel: constructor,
    template: { require: "text!" + server_root + "resources/wizards/remap-parameter-image/ui.html" },
    };
});

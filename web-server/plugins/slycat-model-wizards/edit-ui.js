define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "knockout-mapping", "text!" + $("#slycat-server-root").attr("href") + "resources/wizards/slycat-edit-model/ui.html"], function(server_root, client, dialog, mapping, html)
{
  function constructor(params)
  {
    var component = {};
    component.project = params.project;
    component.model = params.model;
    component.modified = mapping.fromJS(mapping.toJS(params.model));

    component.save_model = function()
    {
      client.put_model(
      {
        mid: component.model._id(),
        name: component.modified.name(),
        description: component.modified.description(),
        marking: component.modified.marking(),
        success: function()
        {
          // Since marking changes have the potential to alter the page
          // structure in arbitrary ways, it's easier to just reload.
          if(component.modified.marking() !== component.model.marking())
          {
            window.location.href = server_root + "models/" + component.model._id();
          }
        },
        error: dialog.ajax_error("Error updating model."),
      });
    }
    return component;
  }

  return { viewModel: constructor, template: html };
});

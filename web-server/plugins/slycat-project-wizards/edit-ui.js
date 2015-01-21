define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "knockout-mapping", "text!" + $("#slycat-server-root").attr("href") + "resources/wizards/slycat-edit-project/ui.html"], function(server_root, client, dialog, mapping, html)
{
  function constructor(params)
  {
    var component = {};
    component.project = params.project;
    component.modified = mapping.fromJS(mapping.toJS(params.project));

    component.save_project = function()
    {
      client.put_project(
      {
        pid: component.project._id(),
        name: mapping.toJS(component.modified.name),
        description: mapping.toJS(component.modified.description),
        acl: mapping.toJS(component.modified.acl),
        success: function()
        {
        },
        error: dialog.ajax_error("Error updating project."),
      });
    }
    return component;
  }

  return { viewModel: constructor, template: html };
});

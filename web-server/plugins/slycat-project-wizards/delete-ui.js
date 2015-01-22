define(["slycat-server-root", "slycat-web-client", "text!" + $("#slycat-server-root").attr("href") + "resources/wizards/slycat-delete-project/ui.html"], function(server_root, client, html)
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

  return { viewModel: constructor, template: html };
});

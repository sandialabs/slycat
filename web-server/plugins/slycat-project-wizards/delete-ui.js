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

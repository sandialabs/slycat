define(["slycat-server-root", "slycat-web-client"], function(server_root, client)
{
  function constructor(params)
  {
    var component = {};
    component.project = params.projects()[0];
    component.model = params.models()[0];

    component.delete_model = function()
    {
      client.delete_model(
      {
        mid: component.model._id(),
        success: function()
        {
          window.location.href = server_root + "projects/" + component.project._id();
        }
      });
    }
    return component;
  }

  return {
    viewModel: constructor,
    template: { "require": "text!" + server_root + "resources/wizards/slycat-delete-model/ui.html" },
  };
});

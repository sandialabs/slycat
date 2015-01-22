define(["slycat-server-root", "slycat-web-client", "text!" + $("#slycat-server-root").attr("href") + "resources/wizards/slycat-delete-model/ui.html"], function(server_root, client, html)
{
  function constructor(params)
  {
    console.log(params);

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

  return { viewModel: constructor, template: html };
});

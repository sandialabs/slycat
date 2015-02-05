define(["slycat-server-root", "slycat-bookmark-manager"], function(server_root, bookmark_manager)
{
  function constructor(params)
  {
    var component = {};
    component.project = params.projects()[0];
    component.model = params.models()[0];
    component.reset_model = function()
    {
      bookmark_manager.current_bid(null);
    }
    return component;
  }

  return {
    viewModel: constructor,
    template: { "require": "text!" + server_root + "resources/wizards/slycat-reset-model/ui.html" },
  };
});

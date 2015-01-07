define(["slycat-web-client", "text!" + $("#slycat-server-root").attr("href") + "resources/wizards/bookmark-demo/ui.html"], function(client, html)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.project;
    component.model = ko.mapping.fromJS({_id: null, name: "New Bookmark Demo Model", description: "This model demonstrates how Slycat bookmarks work.", marking: null});

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
        }
      });
    }

    return component;
  }

  return { viewModel: constructor, template: html };
});

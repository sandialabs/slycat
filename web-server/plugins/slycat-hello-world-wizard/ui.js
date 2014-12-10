define(["slycat-web-client", "text!" + $("#slycat-server-root").attr("href") + "resources/wizards/hello-world/ui.html"], function(client, html)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = ko.mapping.fromJS({_id: params.project_id});
    component.model = ko.mapping.fromJS({_id: null, name: "New Hello World Model", description: "", marking: null});
    component.recipient = ko.observable("World");

    component.create = function()
    {
      component.tab(1);
    }

    component.finish = function()
    {
      client.post_project_models(
      {
        pid : component.project._id(),
        type : "hello-world",
        name : component.model.name(),
        description : component.model.description(),
        marking : component.model.marking(),
        success : function(mid)
        {
          component.model._id(mid);

          client.put_model_parameter(
          {
            mid : component.model._id(),
            name : "name",
            value : component.recipient(),
            input : true,
            success : function()
            {
              client.post_model_finish(
              {
                mid : component.model._id(),
                success : function()
                {
                  component.tab(2);
                }
              });
            }
          });
        }
      });
    }
    return component;
  }

  return { viewModel: constructor, template: html };
});

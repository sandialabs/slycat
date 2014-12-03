define(["slycat-web-client", "text!" + $("#slycat-server-root").attr("href") + "resources/wizards/hello-world/ui.html"], function(client, html)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = ko.mapping.fromJS({_id:params.project_id});
    component.model = ko.observable(null);
    component.recipient = ko.observable("World");

    component.create = function()
    {
      console.log("create", ko.mapping.toJS(component.model));
      component.tab(1);
    }

    component.finish = function()
    {
      client.post_project_models(
      {
        pid : component.project._id(),
        type : "hello-world",
        name : component.model().name(),
        description : component.model().description(),
        marking : component.model().marking(),
        success : function(mid)
        {
          client.put_model_parameter(
          {
            mid : mid,
            name : "name",
            value : component.recipient(),
            input : true,
            success : function()
            {
              client.post_model_finish(
              {
                mid : mid,
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

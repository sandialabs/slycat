define(["slycat-web-client", "text!" + $("#slycat-server-root").attr("href") + "resources/wizards/parameter-image/ui.html", "slycat-remote-browser"], function(client, html)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = ko.mapping.fromJS({_id:params.project_id});
    component.model = ko.observable(null);
    component.remote = ko.observable(null);
    component.sid = ko.observable(null);
    component.mid = ko.observable(null);

    component.cancel = function()
    {
      if(component.mid())
        client.delete_model({ mid : component.mid() });
    }
    component.connect = function()
    {
      console.log("connect", ko.mapping.toJS(component.remote));
      client.post_remotes(
      {
        hostname : component.remote().hostname(),
        username : component.remote().username(),
        password : component.remote().password(),
        success : function(sid)
        {
          component.sid(sid);
          component.tab(1);
        }
      });
    }
    component.load = function()
    {
      console.log("load");
      component.tab(2);
    }
    component.finish = function()
    {
      console.log("finish", ko.mapping.toJS(component.model));
      client.post_project_models(
      {
        pid : component.project._id(),
        type : "parameter-image",
        name : component.model().name(),
        description : component.model().description(),
        marking : component.model().marking(),
        success : function(mid)
        {
          component.mid(mid);
          client.post_model_finish(
          {
            mid : mid,
            success : function()
            {
              component.tab(3);
            }
          });
        }
      });
    }
    return component;
  }

  return { viewModel: constructor, template: html };
});

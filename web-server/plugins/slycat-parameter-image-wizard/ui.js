define(["slycat-web-client", "text!" + $("#slycat-server-root").attr("href") + "resources/wizards/parameter-image/ui.html", "slycat-remote-browser"], function(client, html)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = ko.mapping.fromJS({_id:params.project_id});
    component.model = ko.observable(null);
    component.remote = ko.observable(null);
    component.browser = ko.observable(null);
    component.sid = ko.observable(null);
    component.mid = ko.observable(null);

    component.cancel = function()
    {
      if(component.sid())
        client.delete_remote({ sid: component.sid() });

      if(component.mid())
        client.delete_model({ mid: component.mid() });
    }
    component.create_model = function()
    {
      client.post_project_models(
      {
        pid: component.project._id(),
        type: "parameter-image",
        name: component.model().name(),
        description: component.model().description(),
        marking: component.model().marking(),
        success: function(mid)
        {
          component.mid(mid);
          component.tab(1);
        }
      });
    }
    component.connect = function()
    {
      client.post_remotes(
      {
        hostname: component.remote().hostname(),
        username: component.remote().username(),
        password: component.remote().password(),
        success: function(sid)
        {
          component.sid(sid);
          component.tab(2);
        }
      });
    }
    component.load_table = function()
    {
      client.put_model_table(
      {
        mid: component.mid(),
        sid: component.sid(),
        path: component.browser().selection()[0],
        input: true,
        name: "data-table",
        success: function()
        {
          component.tab(3);
        }
      });
    }
    component.finish = function()
    {
      client.post_model_finish(
      {
        mid: component.mid(),
        success: function()
        {
          component.tab(4);
        }
      });
    }

    return component;
  }

  return { viewModel: constructor, template: html };
});

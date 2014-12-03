define(["slycat-web-client", "text!" + $("#slycat-server-root").attr("href") + "resources/wizards/parameter-image/ui.html"], function(client, html)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = ko.mapping.fromJS({_id:params.project_id});
    component.model = ko.observable(null);
    component.remote = ko.observable(null);
    component.mid = ko.observable(null);

    component.cancel = function()
    {
      console.log("cancel");
    }
    component.create = function()
    {
      console.log("create", ko.mapping.toJS(component.model));
      component.tab(1);
    }
    component.connect = function()
    {
      console.log("connect", ko.mapping.toJS(component.remote));
      component.tab(2);
    }
    component.load = function()
    {
      console.log("load");
      component.tab(3);
    }
    component.finish = function()
    {
      console.log("finish");
      component.tab(4);
    }
    return component;
  }

  return { viewModel: constructor, template: html };
});

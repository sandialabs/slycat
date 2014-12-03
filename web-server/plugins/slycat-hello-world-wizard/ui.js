var server_root = document.querySelector("#slycat-server-root").getAttribute("href");

define(["text!" + server_root + "resources/wizards/hello-world/ui.html"], function(html)
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
      $.ajax(
      {
        contentType : "application/json",
        data : $.toJSON(
        {
          "model-type" : "hello-world",
          name : component.model().name(),
          description : component.model().description(),
          marking : component.model().marking(),
        }),
        type : "POST",
        url : server_root + "projects/" + component.project._id() + "/models",
        success : function(result)
        {
          var mid = result.id;
          $.ajax(
          {
            contentType: "application/json",
            data : $.toJSON(
            {
              value : component.recipient(),
              input : true,
            }),
            type: "PUT",
            url : server_root + "models/" + mid + "/parameters/name",
            success : function()
            {
              $.ajax(
              {
                type : "POST",
                url : server_root + "models/" + mid + "/finish",
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

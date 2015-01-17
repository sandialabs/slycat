define(["slycat-server-root", "slycat-web-client", "knockout", "knockout-mapping", "text!" + $("#slycat-server-root").attr("href") + "resources/wizards/project/ui.html"], function(server_root, client, ko, mapping, html)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.name = ko.observable("");
    component.description = ko.observable("");

    component.finish = function()
    {
      client.post_projects(
      {
        name : component.name(),
        description : component.description(),
        success : function(pid)
        {
          window.location.href = server_root + "projects/" + pid;
        }
      });
    }
    return component;
  }

  return { viewModel: constructor, template: html };
});

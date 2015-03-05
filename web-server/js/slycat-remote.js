define("slycat-remote", ["slycat-server-root", "slycat-web-client", "knockout", "knockout-mapping", "jquery"], function(server_root, client, ko, mapping, $)
{
  var module = {};

  module.login = function(params)
  {
    require(["text!" + server_root + "templates/slycat-remote-login.html"], function(template)
    {
      var component = {};
      component.cancel = function()
      {
        component.container.children().modal("hide");
      }
      component.login = function()
      {
        client.post_remotes(
        {
          hostname: params.hostname,
          username: component.remote.username(),
          password: component.remote.password(),
          success: function(sid)
          {
            component.remote.sid(sid);
            component.container.children().modal("hide");
          },
          error: function(request, status, reason_phrase)
          {
            component.remote.error(reason_phrase);
          },
        });
      }
      component.title = ko.observable(params.title || "Login");
      component.message = ko.observable(params.message || "");
      component.remote = mapping.fromJS({username: null, password: null, error: null, sid: null});
      component.container = $($.parseHTML(template)).appendTo($("body"));
      component.container.children().on("hidden.bs.modal", function()
      {
        component.container.remove();
        if(params.callback)
          params.callback(component.remote.sid());
      });
      ko.applyBindings(component, component.container.get(0));
      component.container.children().modal("show");
    });
  }

  return module;
});


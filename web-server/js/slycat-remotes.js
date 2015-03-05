define("slycat-remotes", ["slycat-server-root", "slycat-web-client", "knockout", "knockout-mapping", "jquery"], function(server_root, client, ko, mapping, $)
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
        if(params.cancel)
          params.cancel();
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
            component.container.children().modal("hide");
            if(params.success)
              params.success(sid);
          },
          error: function(request, status, reason_phrase)
          {
            component.remote.error(reason_phrase);
          },
        });
      }
      component.title = ko.observable(params.title || "Login");
      component.message = ko.observable(params.message || "");
      component.remote = mapping.fromJS({username: null, password: null, error: null});
      component.container = $($.parseHTML(template)).appendTo($("body"));
      component.container.children().on("hidden.bs.modal", function()
      {
        component.container.remove();
      });
      ko.applyBindings(component, component.container.get(0));
      component.container.children().modal("show");
    });
  }

  module.create_pool = function()
  {
    var remotes = {};

    var pool = {};

    pool.get_remote = function(params)
    {
      if(params.hostname in remotes)
      {
        if(params.success)
          params.success(remotes[params.hostname]);
        return;
      }

      module.login(
      {
        hostname: params.hostname,
        success: function(sid)
        {
          remotes[params.hostname] = sid;
          if(params.success)
            params.success(sid);
        },
        cancel: function()
        {
          if(params.cancel)
            params.cancel();
        },
      });
    }

    pool.delete_remote = function(hostname)
    {
      if(hostname in remotes)
      {
        // Ignore any errors, the sid could have expired.
        client.delete_remote(
        {
          sid: remotes[hostname],
        });
        delete remotes[hostname];
      }
    }

    return pool;
  }

  return module;
});


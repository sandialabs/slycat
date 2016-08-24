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
        component.remote.enable(false);
        component.remote.status_type("info");
        component.remote.status("Connecting ...");
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
            component.remote.enable(true);
            component.remote.status_type("danger");
            component.remote.status(reason_phrase);
            component.remote.focus("password");
          },
        });
      }
      component.title = ko.observable(params.title || "Login");
      component.message = ko.observable(params.message || "");
      component.remote = mapping.fromJS({username: null, password: null, status: null, enable: true, focus: false, status_type: null});
      component.remote.focus.extend({notify: "always"});
      component.container = $($.parseHTML(template)).appendTo($("body"));
      component.container.children().on("shown.bs.modal", function()
      {
        component.remote.focus(true);
      });
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
          params.success(params.hostname);
        return;
      }

      module.login(
      {
        hostname: params.hostname,
        title: params.title,
        message: params.message,
        success: function(sid)
        {
          remotes[params.hostname] = sid;
          if(params.success)
            params.success(params.hostname);
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


define("slycat-remote-browser", ["slycat-server-root", "slycat-web-client"], function(server_root, client)
{
  ko.components.register("slycat-remote-browser",
  {
    viewModel: function(params)
    {
      var component = this;
      component.type = ko.observable(ko.utils.unwrapObservable(params.type));
      component.sid = ko.observable(ko.utils.unwrapObservable(params.sid));
      component.hostname = ko.observable(ko.utils.unwrapObservable(params.hostname));
      component.path = ko.observable(null);
      component.files = ko.mapping.fromJS([]);
      component.selection = ko.mapping.fromJS([]);
      component.open_callback = params.open_callback;

      function path_dirname(path)
      {
        var new_path = path.replace(/\/\.?(\w|\-)*\/?$/, "");
        if(new_path == "")
          new_path = "/";
        return new_path;
      }

      function path_join(left, right)
      {
        var new_path = left;
        if(new_path.slice(-1) != "/")
          new_path += "/";
        new_path += right;
        return new_path;
      }

      component.full_path = ko.pureComputed(function()
      {
        return component.hostname() + ": " + component.path();
      });

      component.select = function(file, event)
      {
        var selection = [path_join(component.path(), file.name())];
        ko.mapping.fromJS(selection, component.selection);
      }

      component.open = function(file)
      {
        // If the file is our parent directory, move up the hierarchy.
        if(file.name() == "..")
        {
          var path = component.path().replace(/\/\.?(\w|\-)*\/?$/, "");
          if(path == "")
            path = "/";
        }
        // If the file is a directory, move down the hierarchy.
        else if(file.type() == "d")
        {
          component.browse(path_join(component.path(), file.name()));
        }
        // If it's a file, signal observers.
        else if(file.type() == "f")
        {
          if(component.open_callback)
            component.open_callback();
        }
      }

      component.browse = function(path)
      {
        client.post_remote_browse(
        {
          sid : component.sid(),
          path : path,
          success : function(results)
          {
            component.path(path);
            var files = []
            if(path != "/")
              files.push({type:"", name:"..", size:""});
            for(var i = 0; i != results.names.length; ++i)
              files.push({name:results.names[i], size:results.sizes[i], type:results.types[i]});
            ko.mapping.fromJS(files, component.files);
          }
        });
      }

      if(params.data)
        params.data(component);

      component.browse(ko.utils.unwrapObservable(params.path) || "/");
    },
    template: { require: "text!" + server_root + "templates/slycat-remote-browser.html" }
  });

});

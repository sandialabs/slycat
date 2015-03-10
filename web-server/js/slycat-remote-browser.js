/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-remote-browser", ["slycat-server-root", "slycat-web-client", "knockout", "knockout-mapping"], function(server_root, client, ko, mapping)
{
  ko.components.register("slycat-remote-browser",
  {
    viewModel: function(params)
    {
      var component = this;
      component.type = ko.utils.unwrapObservable(params.type);
      component.sid = params.sid;
      component.hostname = params.hostname;
      component.path = params.path;
      component.selection = params.selection;
      component.open_file_callback = params.open_file_callback;
      component.raw_files = mapping.fromJS([]);

      component.icon_map = {
        "application/x-directory" : "<span class='fa fa-folder-o'></span>",
        "application/octet-stream" : "<span class='fa fa-file-o'></span>",
      };

      component.files = component.raw_files.map(function(file)
      {
        var icon = "";
        if(file.mime_type() in component.icon_map)
        {
          icon = component.icon_map[file.mime_type()];
        }
        else if(file.mime_type().startsWith("text/"))
        {
          icon = "<span class='fa fa-file-text-o'></span>";
        }
        else if(file.mime_type().startsWith("image/"))
        {
          icon = "<span class='fa fa-file-image-o'></span>";
        }
        else if(file.mime_type().startsWith("video/"))
        {
          icon = "<span class='fa fa-file-video-o'></span>";
        }

        return {
          type: file.type,
          name: file.name,
          size: file.size,
          mtime: file.mtime,
          mime_type: file.mime_type,
          icon: icon,
        };
      });

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
        component.selection(selection);
      }

      component.open = function(file)
      {
        // If the file is our parent directory, move up the hierarchy.
        if(file.name() == "..")
        {
          component.browse(path_dirname(component.path()));
        }
        // If the file is a directory, move down the hierarchy.
        else if(file.type() == "d")
        {
          component.browse(path_join(component.path(), file.name()));
        }
        // If it's a file, signal observers.
        else if(file.type() == "f")
        {
          if(component.open_file_callback)
            component.open_file_callback();
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
            localStorage.setItem("slycat-remote-browser-path-" + component.hostname(), path);

            component.path(path);
            var files = []
            if(path != "/")
              files.push({type: "", name: "..", size: "", mtime: "", mime_type:"application/x-directory"});
            for(var i = 0; i != results.names.length; ++i)
              files.push({name:results.names[i], size:results.sizes[i], type:results.types[i], mtime:results.mtimes[i], mime_type:results["mime-types"][i]});
            mapping.fromJS(files, component.raw_files);
          }
        });
      }

      component.sid.subscribe(function(new_sid)
      {
        if(new_sid)
        {
          if(!component.path())
            component.path(localStorage.getItem("slycat-remote-browser-path-" + component.hostname()) || "/");
          component.browse(component.path());
        }
      });
    },
    template: { require: "text!" + server_root + "templates/slycat-remote-browser.html" }
  });

});

/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-remote-browser", ["slycat-server-root", "slycat-web-client", "knockout", "knockout-mapping", "lodash"], function(server_root, client, ko, mapping, _)
{
  ko.components.register("slycat-remote-browser",
  {
    viewModel: function(params)
    {
      var component = this;
      component.type = ko.utils.unwrapObservable(params.type); // Specify 'remote' for file picker, 'remote-directory' for directory picker
      component.sid = params.sid;
      component.hostname = params.hostname;
      component.path = params.path;
      component.path_input = ko.observable(component.path());
      component.selection = params.selection;
      component.open_file_callback = params.open_file_callback;
      component.raw_files = mapping.fromJS([]);
      component.session_exists = params.session_exists;
      component.persistence_id = params.persistence_id === undefined ? '' : params.persistence_id; // If you specify a persistence_id, it will be used as a key in localStorage so that path is restored only on remote browsers matching this id 

      component.icon_map = {
        "application/x-directory" : "<span class='fa fa-folder-o'></span>",
        "application/octet-stream" : "<span class='fa fa-file-o'></span>",
        "text/csv" : "<span class='fa fa-file-excel-o'></span>",
        "text/x-python" : "<span class='fa fa-file-code-o'></span>",

      };

      component.files = component.raw_files.map(function(file)
      {
        var icon = "<span class='fa fa-file-o'></span>";
        if(_.startsWith(file.mime_type(), "application/x-directory"))
        {
          icon = "<span class='fa fa-folder'></span>";
        }
        // Disabling file specific icons per https://github.com/sandialabs/slycat/issues/454
        // var icon = "";
        // if(file.mime_type() in component.icon_map)
        // {
        //   icon = component.icon_map[file.mime_type()];
        // }
        // else if(_.startsWith(file.mime_type(), "text/"))
        // {
        //   icon = "<span class='fa fa-file-text-o'></span>";
        // }
        // else if(_.startsWith(file.mime_type(), "image/"))
        // {
        //   icon = "<span class='fa fa-file-image-o'></span>";
        // }
        // else if(_.startsWith(file.mime_type(), "video/"))
        // {
        //   icon = "<span class='fa fa-file-video-o'></span>";
        // }

        return {
          type: file.type,
          name: file.name,
          size: file.size,
          mtime: file.mtime,
          mime_type: file.mime_type,
          icon: icon,
          selected: ko.observable(false)
        };
      });

      function path_dirname(path)
      {
        var new_path = path.replace(/\/\.?(\w|\-|\.)*\/?$/, "");
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
        // Only allow file selection when directory selection is not specified
        if(file.type() == "f" && component.type != 'remote-directory')
        {
          // Clear current selection
          for(var i=0; i < component.files().length; i++)
          {
            component.files()[i].selected(false);
          }
          file.selected(true);
        }
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

      component.up = function() {
        component.open({name: function(){return '..';}});
      }

      component.browse = function(path)
      {
        client.post_remote_browse(
        {
          hostname : component.hostname(),
          path : path,
          success : function(results)
          {
            $('.slycat-remote-browser .path .alert').fadeOut(400);
            $('.slycat-remote-browser .form-group.path').removeClass('has-error');
            $('.slycat-remote-browser-files').fadeOut(0);

            localStorage.setItem("slycat-remote-browser-path-" + component.persistence_id + component.hostname(), path);

            component.path(path);
            component.path_input(path);

            var files = []
            if(path != "/")
              files.push({type: "", name: "..", size: "", mtime: "", mime_type:"application/x-directory"});
            for(var i = 0; i != results.names.length; ++i)
              files.push({name:results.names[i], size:results.sizes[i], type:results.types[i], mtime:results.mtimes[i], mime_type:results["mime-types"][i]});
            mapping.fromJS(files, component.raw_files);
            $('.slycat-remote-browser-files').scrollTop(0);
            $('.slycat-remote-browser-files').fadeIn(400);
          },
          error : function(results)
          {
            if(component.path() != component.path_input())
            {
              $('.slycat-remote-browser .form-group.path').addClass('has-error');
            }

            $('.slycat-remote-browser .path .alert').fadeIn(400);
          }
        });
      }

      component.browse_path = function(formElement)
      {
        component.browse(component.path_input());
      }

      component.session_exists.subscribe(function(new_session_exists)
      {
        if(new_session_exists)
        {
          // Alex: this should be the other way - always overwrite from local storage because that's been customized by the user.
          if(!component.path())
            component.path(localStorage.getItem("slycat-remote-browser-path-" + component.persistence_id + component.hostname()) || "/");
          component.browse(component.path());
        }
      });
    },
    template: { require: "text!" + server_root + "templates/slycat-remote-browser.html" }
  });

});

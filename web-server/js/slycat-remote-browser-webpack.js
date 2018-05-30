/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import server_root from "./slycat-server-root";
import client from "./slycat-web-client-webpack";
import ko from "knockout";
import mapping from "knockout-mapping";
import _ from "lodash";
import slycatRemoteBrowser from "../templates/slycat-remote-browser.html";

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
    component.browse_error = ko.observable(false);
    component.path_error = ko.observable(true);
    component.browser_updating = ko.observable(false);
    component.progress = params.progress != undefined ? params.progress : ko.observable(undefined);
    component.progress_status = params.progress_status != undefined ? params.progress_status : ko.observable('');

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
          component.browse_error(false);
          component.path_error(false);
          component.browser_updating(true);

          localStorage.setItem("slycat-remote-browser-path-" + component.persistence_id + component.hostname(), path);

          component.path(path);
          component.path_input(path);

          var files = []
          if(path != "/")
            files.push({type: "", name: "..", size: "", mtime: "", mime_type:"application/x-directory"});
          for(var i = 0; i != results.names.length; ++i)
            files.push({name:results.names[i], size:results.sizes[i], type:results.types[i], mtime:results.mtimes[i], mime_type:results["mime-types"][i]});
          mapping.fromJS(files, component.raw_files);
          component.browser_updating(false);
        },
        error : function(results)
        {
          if(component.path() != component.path_input())
          {
            component.path_error(true);
          }
          component.browse_error(true);
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
        if(!component.path())
        {
          component.path(localStorage.getItem("slycat-remote-browser-path-" + component.persistence_id + component.hostname()) || "/");
        }
        component.browse(component.path());
      }
    });

    ko.bindingHandlers.fadeError = {
        init: function(element, valueAccessor) {
          var value = ko.unwrap(valueAccessor()); // Get the current value of the current property we're bound to
          $(element).toggle(value); // jQuery will hide/show the element depending on whether "value" or true or false
        },
        update: function(element, valueAccessor, allBindings) {
          var value = ko.unwrap(valueAccessor());
          if(value)
          {
            $(element).fadeIn(400);
          }
          else
          {                
            $(element).fadeOut(400);
          }
        }
    };

    ko.bindingHandlers.updateFeedback = {
      update: function(element, valueAccessor, allBindings) {
        var value = ko.unwrap(valueAccessor());
        if(value)
        {
          $(element).fadeOut(0);
        }
        else
        {                
          $(element).scrollTop(0);
          $(element).fadeIn(400);
          // Some browsers don't seem to scroll to top when the element is still hidden, so calling this again after making it visible
          $(element).scrollTop(0);
        }
      }
    };

  },
  template: slycatRemoteBrowser
});
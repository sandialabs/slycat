/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-web-client", ["slycat-server-root"], function(server_root)
{
  var module = {};

  module.delete_model = function(params)
  {
    $.ajax(
    {
      type: "DELETE",
      url: server_root + "models/" + params.mid,
      success: function()
      {
        if(params.success)
          params.success();
      }
    });
  }

  module.delete_remote = function(params)
  {
    $.ajax(
    {
      type: "DELETE",
      url: server_root + "remotes/" + params.sid,
      success: function()
      {
        if(params.success)
          params.success();
      }
    });
  }

  module.get_configuration_markings = function(params)
  {
    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: server_root + "configuration/markings",
      success: function(markings)
      {
        if(params.success)
          params.success(markings);
      }
    });
  }

  module.get_configuration_remote_hosts = function(params)
  {
    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: server_root + "configuration/remote-hosts",
      success: function(result)
      {
        if(params.success)
          params.success(result);
      }
    });
  }

  module.get_model_table_metadata = function(params)
  {
    var url = server_root + "models/" + params.mid + "/tables/" + params.name + "/arrays/" + (params.aid || "0") + "/metadata";
    if(params.index)
      url += "?index=" + params.index;

    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: url,
      success: function(result)
      {
        if(params.success)
          params.success(result);
      }
    });
  }

  module.post_model_finish = function(params)
  {
    $.ajax(
    {
      type: "POST",
      url: server_root + "models/" + params.mid + "/finish",
      success: function()
      {
        if(params.success)
          params.success();
      }
    });
  }

  module.post_project_models = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: $.toJSON(
      {
        "model-type": params.type,
        "name": params.name,
        "description": params.description || "",
        "marking": params.marking || "",
      }),
      type: "POST",
      url: server_root + "projects/" + params.pid + "/models",
      success: function(result)
      {
        if(params.success)
          params.success(result.id);
      }
    });
  }

  module.post_remotes = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: $.toJSON(
      {
        hostname: params.hostname,
        username: params.username,
        password: params.password,
      }),
      type: "POST",
      url: server_root + "remotes",
      success: function(result)
      {
        if(params.success)
          params.success(result.sid);
      }
    });
  }

  module.post_remote_browse = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: $.toJSON(
      {
      }),
      type: "POST",
      url: server_root + "remotes/" + params.sid + "/browse" + params.path,
      success: function(results)
      {
        if(params.success)
          params.success(results);
      }
    });
  }

  module.put_model_parameter = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: $.toJSON(
      {
        value: params.value,
        input: params.input === undefined ? true: params.input ? true: false,
      }),
      type: "PUT",
      url: server_root + "models/" + params.mid + "/parameters/" + params.name,
      success: function()
      {
        if(params.success)
          params.success();
      }
    });
  }

  module.put_model_table = function(params)
  {
    var data = new FormData();
    data.append("input", params.input === undefined ? true: params.input ? true: false);
    if(params.sid && params.path)
    {
      data.append("sid", params.sid);
      data.append("path", params.path);
    }
    else if(params.file)
    {
      data.append("file", params.file);
    }

    $.ajax(
    {
      contentType: false,
      processData: false,
      data: data,
      type: "PUT",
      url: server_root + "models/" + params.mid + "/tables/" + params.name,
      success: function()
      {
        if(params.success)
          params.success();
      }
    });
  }

  return module;
});

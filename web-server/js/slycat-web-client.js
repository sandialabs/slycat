/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-web-client", ["slycat-server-root", "jquery"], function(server_root, $)
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
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  }

  module.delete_project = function(params)
  {
    $.ajax(
    {
      type: "DELETE",
      url: server_root + "projects/" + params.pid,
      success: function()
      {
        if(params.success)
          params.success();
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
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
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  }

  module.get_configuration_markings = function(params)
  {
    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: server_root + "configuration/markings",
      success: function(result)
      {
        if(params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  }

  module.get_configuration_support_email = function(params)
  {
    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: server_root + "configuration/support-email",
      success: function(email)
      {
        if(params.success)
          params.success(email);
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
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
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  }

  module.get_configuration_version = function(params)
  {
    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: server_root + "configuration/version",
      success: function(result)
      {
        if(params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  }

  module.get_configuration_wizards = function(params)
  {
    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: server_root + "configuration/wizards",
      success: function(wizards)
      {
        if(params.success)
          params.success(wizards);
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  }

  module.get_model = function(params)
  {
    $.ajax(
    {
      dataType: "json",
      type : "GET",
      url : server_root + "models/" + params.mid,
      success : function(result)
      {
        if(params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      }
    });
  }

  module.get_model_arrayset_metadata = function(params)
  {
    var query = {};
    if(params.arrays)
      query.arrays = params.arrays.join(";");
    if(params.statistics)
    {
      query.statistics = [];
      $.each(params.statistics, function(index, spec)
      {
        query.statistics.push(spec[0] + "/" + spec[1]);
      });
      query.statistics = query.statistics.join(";");
    }
    query = $.param(query);
    if(query)
      query = "?" + query;

    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: server_root + "models/" + params.mid + "/arraysets/" + params.aid + "/metadata" + query,
      success: function(result)
      {
        if(params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  }

  module.get_model_arrayset_data = function(params)
  {
    var query = {};
    query.hyperchunks = [];
    $.each(params.hyperchunks, function(index, hyperchunk)
    {
      var spec = hyperchunk[0] + "/" + hyperchunk[1] + "/";
      if(hyperchunk.length == 2)
        spec += "...";
      else
        spec += hyperchunk[2];
      query.hyperchunks.push(spec);
    });
    query.hyperchunks = query.hyperchunks.join(";");
    query = $.param(query);
    if(query)
      query = "?" + query;

    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: server_root + "models/" + params.mid + "/arraysets/" + params.aid + "/data" + query,
      success: function(result)
      {
        if(params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  }

  module.get_model_command = function(params)
  {
    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: server_root + "models/" + params.mid + "/commands/" + params.command,
      success: function(result)
      {
        if(params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  }

  module.get_model_parameter = function(params)
  {
    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: server_root + "models/" + params.mid + "/parameters/" + params.name,
      success: function(result)
      {
        if(params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
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
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  }

  module.get_user = function(params)
  {
    $.ajax(
    {
      type : "GET",
      url : server_root + "users/" + (params.uid || "-"),
      success : function(user)
      {
        if(params.success)
          params.success(user);
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
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
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  }

  module.post_projects = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(
      {
        "name": params.name,
        "description": params.description || "",
      }),
      type: "POST",
      url: server_root + "projects",
      success: function(result)
      {
        if(params.success)
          params.success(result.id);
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  }

  module.post_project_models = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(
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
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  }

  module.post_remotes = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(
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
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  }

  module.post_remote_browse = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(
      {
      }),
      type: "POST",
      url: server_root + "remotes/" + params.sid + "/browse" + params.path,
      success: function(result)
      {
        if(params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  }

  module.put_model_inputs = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(
      {
        sid: params.sid,
      }),
      type: "PUT",
      url: server_root + "models/" + params.mid + "/inputs",
      success: function()
      {
        if(params.success)
          params.success();
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  }

  module.put_model_parameter = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(
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
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
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
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  }

  module.put_project = function(params)
  {
    var project = {};
    if("name" in params)
      project.name = params.name;
    if("description" in params)
      project.description = params.description;
    if("acl" in params)
      project.acl = params.acl;

    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(project),
      processData: false,
      type: "PUT",
      url: server_root + "projects/" + params.pid,
      success: function()
      {
        if(params.success)
          params.success();
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  };

  module.put_model = function(params)
  {
    var model = {};
    if("name" in params)
      model.name = params.name;
    if("description" in params)
      model.description = params.description;
    if("marking" in params)
      model.marking = params.marking;
    if("state" in params)
      model.state = params.state;

    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(model),
      processData: false,
      type: "PUT",
      url: server_root + "models/" + params.mid,
      success: function()
      {
        if(params.success)
          params.success();
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      },
    });
  };

  return module;
});

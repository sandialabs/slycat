/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-web-client", ["slycat-server-root", "jquery", "URI"], function(server_root, $, URI)
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

  module.delete_reference = function(params)
  {
    $.ajax(
    {
      type: "DELETE",
      url: server_root + "references/" + params.rid,
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

  module.get_configuration_parsers = function(params)
  {
    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: server_root + "configuration/parsers",
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
      type: "GET",
      url: server_root + "models/" + params.mid,
      success: function(result)
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

  module.get_model_file = function(params) {
    $.ajax({
      type: 'GET',
      url: server_root + 'models/' + params.mid + '/files/' + params.aid,
      success: function(content) {
        if (params.success)
          params.success(content);
      },
      error: function(request, status, reason_phrase) {
        if (params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  module.get_model_arrayset_metadata = function(params)
  {
    var search = {};
    if(params.arrays)
      search.arrays = params.arrays;
    if(params.statistics)
      search.statistics = params.statistics;
    if(params.unique)
      search.unique = params.unique;

    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: URI(server_root + "models/" + params.mid + "/arraysets/" + params.aid + "/metadata").search(search).toString(),
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
    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: URI(server_root + "models/" + params.mid + "/arraysets/" + params.aid + "/data").search({"hyperchunks":params.hyperchunks}).toString(),
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
      url: URI(server_root + "models/" + params.mid + "/commands/" + params.type + "/" + params.command).search(params.parameters || {}).toString(),
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

  module.post_model_command = function(params)
  {
    $.ajax(
    {
      dataType: "json",
      type: "POST",
      url: URI(server_root + "models/" + params.mid + "/commands/" + params.type + "/" + params.command).search(params.parameters || {}).toString(),
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

  module.put_model_command = function(params)
  {
    $.ajax(
    {
      dataType: "json",
      type: "PUT",
      url: URI(server_root + "models/" + params.mid + "/commands/" + params.type + "/" + params.command).search(params.parameters || {}).toString(),
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

  module.get_project_references = function(params)
  {
    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: server_root + "projects/" + params.pid + "/references",
      success: function(references)
      {
        if(params.success)
          params.success(references);
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      }
    });
  }

  module.get_remote_video_status = function(params)
  {
    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: server_root + "remotes/" + params.sid + "/videos/" + params.vsid + "/status",
      success: function(metadata)
      {
        if(params.success)
          params.success(metadata);
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      }
    });
  }

  module.get_user = function(params)
  {
    $.ajax(
    {
      type: "GET",
      url: server_root + "users/" + (params.uid || "-"),
      success: function(user)
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

  module.post_event = function(params)
  {
    $.ajax(
    {
      type: "POST",
      url: server_root + "events/" + params.path,
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

  module.post_model_files = function(params)
  {
    var data = new FormData();
    data.append("input", params.input ? true: false);
    data.append("parser", params.parser);
    data.append("names", params.names);
    if(params.sids && params.paths)
    {
      data.append("sids", params.sids);
      data.append("paths", params.paths);
    }
    else if(params.files)
    {
      for(var i = 0; i != params.files.length; ++i)
        data.append("files", params.files[i]);
    }

    $.ajax(
    {
      contentType: false,
      processData: false,
      data: data,
      type: "POST",
      url: server_root + "models/" + params.mid + "/files",
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

  module.post_project_references = function(params)
  {
    var data = {};
    data.name = params.name;
    if("model-type" in params)
      data["model-type"] = params["model-type"];
    if("mid" in params)
      data.mid = params.mid;
    if("bid" in params)
      data.bid = params.bid;

    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(data),
      type: "POST",
      url: server_root + "projects/" + params.pid + "/references",
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
        agent: params.agent !== undefined ? params.agent : null,
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

  module.post_remote_video = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(
      {
        "content-type": params["content-type"],
        "images": params.images,
      }),
      type: "POST",
      url: server_root + "remotes/" + params.sid + "/videos",
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

  module.put_model_inputs = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(
      {
        sid: params.sid,
        "deep-copy": params["deep-copy"] || false,
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

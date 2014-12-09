define("slycat-web-client", ["slycat-server-root"], function(server_root)
{
  var module = {};

  module.delete_model = function(params)
  {
    $.ajax(
    {
      type : "DELETE",
      url : server_root + "models/" + params.mid,
      success : function()
      {
        if(params.success)
          params.success();
      }
    });
  }

  module.get_configuration_remote_hosts = function(params)
  {
    $.ajax(
    {
      dataType : "json",
      type : "GET",
      url : server_root + "configuration/remote-hosts",
      success : function(result)
      {
        if(params.success)
          params.success(result);
      }
    });
  }

  module.post_project_models = function(params)
  {
    $.ajax(
    {
      contentType : "application/json",
      data : $.toJSON(
      {
        "model-type" : params.type,
        "name" : params.name,
        "description" : params.description || "",
        "marking" : params.marking || "",
      }),
      type : "POST",
      url : server_root + "projects/" + params.pid + "/models",
      success : function(result)
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
      contentType : "application/json",
      data : $.toJSON(
      {
        "hostname" : params.hostname,
        "username" : params.username,
        "password" : params.password,
      }),
      type : "POST",
      url : server_root + "remotes",
      success : function(result)
      {
        if(params.success)
          params.success(result.sid);
      }
    });
  }

  module.put_model_parameter = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data : $.toJSON(
      {
        value : params.value,
        input : params.input === undefined ? true : params.input ? true : false,
      }),
      type: "PUT",
      url : server_root + "models/" + params.mid + "/parameters/" + params.name,
      success : function()
      {
        if(params.success)
          params.success();
      }
    });
  }

  module.post_model_finish = function(params)
  {
    $.ajax(
    {
      type : "POST",
      url : server_root + "models/" + params.mid + "/finish",
      success : function()
      {
        if(params.success)
          params.success();
      }
    });
  }

  return module;
});

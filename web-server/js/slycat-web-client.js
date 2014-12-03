define("slycat-web-client", [], function()
{
  var server_root = document.querySelector("#slycat-server-root").getAttribute("href");

  var module = {};

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

/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-web-client", ["slycat-server-root", "jquery", "URI"], function(server_root, $, URI)
{
  var module = {};

  /**
   * delete a model for a Slycat project
   * @param params: object{
   * mid: model id that is to be deleted from the Slycat project
   * success(): function called upon success
   * error(request, status, reason_phrase): function called upon error
   * }
   */
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
      }
    });
  };

  /**
   * delete a project in Slycat
   * @param params: object{
   * pid: project id of project that is to be deleted from the Slycat
   * success(): function called upon success
   * error(request, status, reason_phrase): function called upon error
   * }
   */
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
      }
    });
  };

  /**
   * delete a reference in Slycat
   * @param params: object{
   * rid: reference id of reference that is to be deleted from Slycat
   * success(): function called upon success
   * error(request, status, reason_phrase): function called upon error
   * }
   */
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
      }
    });
  };

  /**
   * delete a remote ssh session from the Slycat server
   * @param params: object{
   * sid: session id of open session that is to be deleted from Slycat
   * success(): function called upon success
   * error(request, status, reason_phrase): function called upon error
   * }
   */
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
      }
    });
  };

  /**
   * delete a temp upload file from the slycat server
   * generally you would call this if there was an error in the upload or
   * if the file was successfully uploaded for cleanup purposes. note that
   * Uploads are considered temporary and only should be used as a mean to
   * transport files to the server
   * @param params: object{
   * uid: upload id of the partial or fully uploaded file to be deleted from Slycat
   * success(): function called upon success
   * error(request, status, reason_phrase): function called upon error
   * }
   */
  module.delete_upload = function(params)
  {
    $.ajax(
    {
      type: "DELETE",
      url: server_root + "uploads/" + params.uid,
      success: function()
      {
        if(params.success)
          params.success();
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  /**
   *
   * @param params: object{
   * success(result): function called upon success
   * error(request, status, reason_phrase): function called upon error
   * }
   */
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
      }
    });
  };

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
  };

  module.get_configuration_agent_functions = function(params) {
    $.ajax({
      dataType: "json",
      type: "GET",
      url: server_root + "configuration/agent-functions",
      success: function(fns) {
        if (params.success)
          params.success(fns);
      },
      error: function(request, status, reason_phrase) {
        if (params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

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
  };

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
  };

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
  };

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
  };

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
  };

  module.post_sensitive_model_command = function(params) {
    $.ajax({
      contentType: "application/json",
      type: "POST",
      url: server_root + "models/" + params.mid + "/sensitive/" + params.type + "/" + params.command,
      data: JSON.stringify(params.parameters || {}),
      success: function(result) {
        if(params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase) {
        if(params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

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
  };

  module.get_model_parameter = function(params)
  {
    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: server_root + "models/" + params.mid + "/parameters/" + params.aid,
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
    console.log("slycat-web-client.get_model_table_metadata() is deprecated, use get_model_arrayset_metadata() instead.");

    var url = server_root + "models/" + params.mid + "/tables/" + params.aid + "/arrays/" + (params.array || "0") + "/metadata";
    if(params.index)
      url += "?index=" + params.index;


//    //other section
//    var new_url = server_root + "models/" + params.mid + "/arraysets/" + params.aid +  "/metadata?arrays=" + (params.array || "0") + "%3b1&" +"statistics=0";
////    if(params.index)
////      new_url += "?index=" + params.index;
//    $.ajax(
//    {
//      dataType: "json",
//      type: "GET",
//      url: new_url,
//      success: function(result)
//      {
//        if(params.success)
//          console.log("\nNEW:  " + new_url + "\n" + JSON.stringify(result) +"\n");
//          //params.success(result);
//      },
//      error: function(request, status, reason_phrase)
//      {
//        if(params.error)
//          console.log("\nNEW:  " + url + "\n" + request + reason_phrase + status +"\n");
//          //params.error(request, status, reason_phrase);
//      },
//    });
//    //END other section


    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: url,
      success: function(result)
      {
        if(params.success)
          //console.log("\nOLD:  " + url + "\n" + JSON.stringify(result) +"\n");
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

  module.get_remotes = function(params)
  {
    $.ajax(
    {
      dataType: "json",
      type: "GET",
      url: server_root + "remotes/" + params.hostname,
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
  };

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
    data.append("aids", params.aids);
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
      }
    });
  };

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
      }
    });
  };

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
      }
    });
  };

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
      }
    });
  };

  /**
   * put a reference in Slycat
   * @param params: object{
   * rid: reference id of reference that is to be updated
   * success(): function called upon success
   * error(request, status, reason_phrase): function called upon error
   * }
   */
  module.put_reference = function(params)
  {
    var data = {};
    if("name" in params)
      data["name"] = params["name"];
    if("bid" in params)
      data["bid"] = params["bid"];

    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(data),
      type: "PUT",
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
      }
    });
  };

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
        agent: params.agent !== undefined ? params.agent : null
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
      }
    });
  };

  module.get_session_status = function(params) {
    $.ajax({
      contentType: 'application/json',
      type: 'GET',
      url: server_root + 'remotes/'+params.hostname+'/session-status',
      success: function(result) {
        if (params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase) {
        if (params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  module.post_remote_launch = function(params) {
    $.ajax({
      contentType: 'application/json',
      data: JSON.stringify({
        command: params.command
      }),
      type: 'POST',
      url: server_root + 'remotes/'+params.hostname+'/launch',
      success: function(result) {
        if (params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase) {
        if (params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  module.post_submit_batch = function(params) {
    $.ajax({
      contentType: 'application/json',
      data: JSON.stringify({
        filename: params.filename
      }),
      type: 'POST',
      url: server_root + 'remotes/'+params.hostname+'submit-batch',
      success: function(result) {
        if (params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase) {
        if (params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  module.get_checkjob = function(params) {
    $.ajax({
      contentType: 'application/json',
      type: 'GET',
      url: server_root + 'remotes/checkjob/'+params.hostname+"/"+params.jid,
      success: function(result) {
        if (params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase) {
        if (params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  module.delete_job = function(params) {
    $.ajax({
      contentType: 'application/json',
      type: 'DELETE',
      url: server_root + 'remotes/delete-job/'+params.hostname+'/'+params.jid,
      success: function(result) {
        if (params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase) {
        if (params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  module.get_job_output = function(params) {
    $.ajax({
      contentType: 'application/json',
      type: 'GET',
      url: server_root + 'remotes/get-job-output/'+params.hostname+"/"+params.jid+"/path"+params.path,
      success: function(result) {
        if (params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase) {
        if (params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  module.get_user_config = function(params) {
    $.ajax({
      contentType: 'application/json',
      type: 'GET',
      url: server_root + 'remotes/'+params.hostname+'/get-user-config',
      success: function(result) {
        if (params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase) {
        if (params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  module.set_user_config = function(params) {
    $.ajax({
      contentType: 'application/json',
      data: JSON.stringify({
        config: params.config
      }),
      type: 'POST',
      url: server_root + 'remotes/'+params.hostname+'/set-user-config',
      success: function(result) {
        if (params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase) {
        if (params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  module.post_agent_function = function(params) {
    $.ajax({
      contentType: 'application/json',
      data: JSON.stringify({
        wckey: params.wckey,
        nnodes: params.nnodes,
        partition: params.partition,
        ntasks_per_node: params.ntasks_per_node,
        ntasks: params.ntasks,
        ncpu_per_task: params.ncpu_per_task,
        time_hours: params.time_hours,
        time_minutes: params.time_minutes,
        time_seconds: params.time_seconds,
        fn: params.fn,
        fn_params: params.fn_params,
        uid: params.uid
      }),
      type: 'POST',
      url: server_root + 'remotes/'+params.hostname+'/run-agent-function',
      success: function(response) {
        if (params.success)
          params.success(response);
      },
      error: function(request, status, reason_phrase) {
        if (params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };


  module.post_remote_browse = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(
      {
      }),
      type: "POST",
      url: server_root + "remotes/" + params.hostname + "/browse" + params.path,
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
  };

  module.post_uploads = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(
      {
        "mid": params.mid,
        "input": params.input,
        "parser": params.parser,
        "aids": params.aids
      }),
      type: "POST",
      url: server_root + "uploads",
      success: function(result)
      {
        if(params.success)
          params.success(result.id);
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  module.post_log = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(
      {
        "message": params.message
      }),
      type: "POST",
      url: server_root + "log",
      success: function () {
        if(params.success)
          params.success();
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  module.post_upload_finished = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(
      {
        "uploaded": params.uploaded
      }),
      type: "POST",
      url: server_root + "uploads/" + params.uid + "/finished",
      success: function () {
        if(params.success)
          params.success();
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  module.put_model_inputs = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(
      {
        sid: params.sid,
        "deep-copy": params["deep-copy"] || false
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
      }
    });
  };

  module.put_model_parameter = function(params)
  {
    $.ajax(
    {
      contentType: "application/json",
      data: JSON.stringify(
      {
        value: params.value,
        input: params.input === undefined ? true: params.input ? true: false
      }),
      type: "PUT",
      url: server_root + "models/" + params.mid + "/parameters/" + params.aid,
      success: function()
      {
        if(params.success)
          params.success();
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

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
      }
    });
  };

  module.delete_project_cache = function(params)
  {
    $.ajax(
    {
      type: "DELETE",
      url: server_root + "projects/" + params.pid + "/delete-cache",
      success: function()
      {
        if(params.success)
          params.success();
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  /**
   * delete model artifacts from the nosql database
   * @param params
   * {
   *  mid:model_id,
   *  aid:artifact_id,
   *  success:func(called on ajax success),
   *  error:func(called on ajax error)
   * }
   */
  module.delete_model_parameter = function(params)
  {
    $.ajax(
    {
      type: "DELETE",
      url: server_root + "delete-artifact/" + params.mid + "/" + params.aid,
      success: function()
      {
        if(params.success)
          params.success();
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      }
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
      }
    });
  };

  module.put_upload_file_part = function(params)
  {

    var data = new FormData();
    if(params.hostname && params.path)
    {
//      console.log("if? sid "+params.sid+"path "+params.path+"file "+params.file);
      data.append("hostname", params.hostname);
      data.append("path", params.path);
    }
    else if(params.file)
    {
//      console.log("if else? sid "+params.sid+"path "+params.path+"file "+params.file);
      data.append("file", params.file);
    }

    $.ajax(
    {
      contentType: false,
      processData: false,
      data: data,
      type: "PUT",
      url: server_root + "uploads/" + params.uid + "/files/" + params.fid + "/parts/" + params.pid,
      success: function()
      {
        if(params.success)
          params.success();
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  module.sign_out = function(params)
  {
    $.ajax(
    {
      type: "DELETE",
      url: server_root + "logout",
      success: function()
      {
        if(params.success)
          params.success();
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  module.job_time = function(params)
  {
    $.ajax({
      contentType: 'application/json',
      type: 'GET',
      url: server_root + 'remotes/'+params.nodes+"/"+params.tasks+"/"+params.size+"/job-time",
      success: function(result) {
        if (params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase) {
        if (params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };
  
  module.get_time_series_names = function(params)
  {
    $.ajax({
      contentType: 'application/json',
      type: 'GET',
      url: server_root + "remotes/" + params.hostname + "/time_series_names/file" + params.path,
      success: function(result) {
        //console.log("result "+JSON.stringify(result))
        if (params.success)
          return params.success(result);
      },
      error: function(request, status, reason_phrase) {
        if (params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  module.get_projects = function(params) {
    $.ajax({
      contentType: 'application/json',
      type: 'GET',
      url: server_root + 'projects_list',
      success: function(result) {
        if (params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase) {
        if (params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };

  module.get_project_models = function(params) {
    $.ajax({
      contentType: 'application/json',
      type: 'GET',
      url: server_root + 'projects/'+ params.pid + '/models',
      success: function(result) {
        if (params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase) {
        if (params.error)
          params.error(request, status, reason_phrase);
      }
    });
  };
  return module;
});

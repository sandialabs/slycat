/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import api_root from "js/slycat-api-root";
import URI from "urijs";
import $ from 'jquery';

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
    url: api_root + "models/" + params.mid,
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

module.delete_model_fetch = function(params, successFunction, errorFunction)
{
  return fetch(`${api_root}models/${params.mid}`,
      {
        method: "DELETE",
        credentials: "same-origin",
        cache: "no-store",
      })
  .then(function(response) {
    if (!response.ok) {
        throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
  }).catch((error) => {
    if (errorFunction) {
      errorFunction(error)
    } else {
      console.log(error);
    }
  });
}

module.delete_project_data_in_model_fetch = function(params, successFunction, errorFunction)
{
  return fetch(`${api_root}projects/data/${params.did}/model/${params.mid}`,
  {
    method: "DELETE",
    credentials: "same-origin",
    cache: "no-store",
  })
  .then(function(response) {
    if (!response.ok) {
      throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
  }).catch((error) => {
    if (errorFunction) {
      errorFunction(error)
    } else {
      console.log(error);
    }
  });
}

module.delete_model_in_project_data_fetch = function(params, successFunction, errorFunction)
{
  return fetch(`${api_root}model/${params.mid}/projects/data/${params.did}`,
  {
    method: "DELETE",
    credentials: "same-origin",
    cache: "no-store",
  })
  .then(function(response) {
    if (!response.ok) {
      throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
  }).catch((error) => {
    if (errorFunction) {
      errorFunction(error)
    } else {
      console.log(error);
    }
  });
}

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
    url: api_root + "projects/" + params.pid,
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
    url: api_root + "references/" + params.rid,
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
    url: api_root + "remotes/" + params.sid,
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
    url: api_root + "uploads/" + params.uid,
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

module.put_project_csv_data = function(params)
{
  $.ajax(
      {
          dataType: "json",
          type: "PUT",
          url: api_root + "projects/" + params.pid + "/data/" + params.file_key +
            "/parser/" + params.parser + "/mid/" + params.mid + "/aids/" + params.aids,
          success: function (result) {
              if (params.success)
                  params.success(result);
          },
          error: function (request, status, reason_phrase) {
              if (params.error)
                  params.error(request, status, reason_phrase);
          }
      });
};

module.get_project_data = function(params)
{
  $.ajax(
  {
    dataType: "json",
    type: "GET",
    url: api_root + "data/" + params.did,
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

module.get_project_data_fetch = function(params, successFunction, errorFunction)
{
  return fetch(`${api_root}projects/data/${params.did}`,
      {
        credentials: "same-origin",
        cache: "no-store",
        dataType: "json"
      })
  .then(function(response) {
    if (!response.ok) {
      throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
    return response.json();
  }).catch((error) => {
    if (errorFunction) {
      errorFunction(error)
    } else {
      console.log(error);
    }
  });
};

module.get_project_data_parameter_fetch = function(params, successFunction, errorFunction)
{
  return fetch(`${api_root}projects/data/${params.did}/parameters/${params.param}`,
      {
        credentials: "same-origin",
        cache: "no-store",
        dataType: "json"
      })
  .then(function(response) {
    if (!response.ok) {
        throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
    return response.json();
  }).catch((error) => {
    if (errorFunction) {
      errorFunction(error)
    } else {
      console.log(error);
    }
  });
}

module.get_project_data_in_model_fetch = function(params, successFunction, errorFunction)
{
  return fetch(`${api_root}projects/data/model/${params.mid}`,
    {
      credentials: "same-origin",
      cache: "no-store",
      dataType: "json"
    })
  .then(function(response){
    if (!response.ok) {
      throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
    return response.json();
  }).catch((error) => {
    if (errorFunction) {
      errorFunction(error)
    } else {
      console.log(error);
    }
  });
};

module.put_project_data_parameter = function(params)
{
  $.ajax({
    contentType: "application/json",
    type: "PUT",
    url: api_root + "data/" + params.did + "/aids/" + params.aid,
    data: JSON.stringify(
    {
      value: params.value,
      input: params.input === undefined ? false : params.input ? true : false
    }),
    success: function (result) {
      if (params.success) {
        params.success(result);
      }
    },
    error: function (request, status, reason_phrase) {
      if (params.error) {
        params.error(request, status, reason_phrase);
      }  
    }
  });
};

module.get_project_file_names = function(params) {
 $.ajax(
    {
        dataType: "json",
        type: "GET",
        url: api_root + "/projects/" + params.pid + "/name",
        success: function (result) {
            if (params.success)
                params.success(result);
        },
        error: function (request, status, reason_phrase) {
            if (params.error)
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
    url: api_root + "configuration/markings",
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

// Fetch version of get_configuration_markings
module.get_configuration_markings_fetch = function(params)
{
  return fetch(`${api_root}configuration/markings`,
      {
        credentials: "same-origin",
        cache: "no-store",
        dataType: "json"
      })
  .then(function(response) {
    if (!response.ok) {
        throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
    return response.json();
  }).catch((error) => {
    if (errorFunction) {
      errorFunction(error)
    }else{
      console.log(error);
    }
  });
};

module.get_configuration_parsers = function(params)
{
  $.ajax(
  {
    dataType: "json",
    type: "GET",
    url: api_root + "configuration/parsers",
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
    url: api_root + "configuration/support-email",
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

module.get_configuration_injected_code = function(params)
{
  $.ajax(
  {
    dataType: "json",
    type: "GET",
    url: api_root + "configuration/injected-code",
    success: function(injected_code)
    {
      if(params.success)
        params.success(injected_code);
    },
    error: function(request, status, reason_phrase)
    {
      if(params.error)
        params.error(request, status, reason_phrase);
    },
  });
}

module.get_configuration_ga_tracking_id = function(params)
{
  $.ajax(
  {
    dataType: "json",
    type: "GET",
    url: api_root + "configuration/ga-tracking-id",
    success: function(id)
    {
      if(params.success)
        params.success(id);
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
    url: api_root + "configuration/remote-hosts",
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

module.get_configuration_remote_hosts_fetch = function()
{
  return fetch(`${api_root}configuration/remote-hosts`, {credentials: "same-origin", cache: "no-store", dataType: "json"})
  .then(function(response) {
    if (!response.ok) {
        throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
    return response.json();
  });
};

module.get_configuration_version = function(params)
{
  $.ajax(
  {
    dataType: "json",
    type: "GET",
    url: api_root + "configuration/version",
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
    url: api_root + "configuration/wizards",
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
    url: api_root + "configuration/agent-functions",
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
module.get_model_fetch = function(mid)
{
  return fetch(`${api_root}models/${mid}`, {credentials: "same-origin", cache: "no-store", dataType: "json"})
  .then(function(response) {
    if (!response.ok) {
        throw new Error(`bad response with: ${response.status} :: ${response.statusText}`);
    }
    return response.json();
  });
};

module.get_model = function(params)
{
  $.ajax(
  {
    dataType: "json",
    type: "GET",
    url: api_root + "models/" + params.mid,
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
    url: api_root + 'models/' + params.mid + '/files/' + params.aid,
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
    url: URI(api_root + "models/" + params.mid + "/arraysets/" + params.aid + "/metadata").search(search).toString(),
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
    url: URI(api_root + "models/" + params.mid + "/arraysets/" + params.aid + "/data").search({"hyperchunks":params.hyperchunks}).toString(),
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
    url: URI(api_root + "models/" + params.mid + "/commands/" + params.type + "/" + params.command).search(params.parameters || {}).toString(),
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

module.get_model_command_fetch = function(params, errorFunction)
{
  return fetch(URI(api_root + "models/" + params.mid + "/commands/" + params.type + "/" + params.command).search(params.parameters || {}).toString(),
      {
        credentials: "same-origin",
        cache: "no-store",
        dataType: "json"
      })
  .then(function(response) {
    if (!response.ok) {
        throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
    return response.json();
  }).catch((error) => {
    if (errorFunction) {
      errorFunction(error)
    }else{
      throw error;
    }
  });
};

module.get_last_active_time_fetch = function()
{
  return fetch(`${api_root}server/last_active_time`, {credentials: "same-origin", cache: "no-store", dataType: "json"})
  .then(function(response) {
    if (!response.ok) {
        throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
    return response.json();
  });
};

module.post_model_command = function(params)
{
  $.ajax(
  {
    dataType: "json",
    type: "POST",
    url: URI(api_root + "models/" + params.mid + "/commands/" + params.type + "/" + params.command).search(params.parameters || {}).toString(),
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
    url: api_root + "models/" + params.mid + "/sensitive/" + params.type + "/" + params.command,
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

module.post_remotes_smb_fetch = function(params)
{ 
  return fetch(`${api_root}remotes/smb`,
      {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        dataType: "json",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params || {})
      })
};

module.post_sensitive_model_command_fetch = function(params, successFunction, errorFunction)
{
  return fetch(`${api_root}models/${params.mid}/sensitive/${params.type}/${params.command}`,
      {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        dataType: "json",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params.parameters || {})
      })
  .then(function(response) {
    if (!response.ok) {
        throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
    return response.json();
  }).catch((error) => {
    if (errorFunction) {
      errorFunction(error)
    }else{
      console.log(error);
    }
  });
};

module.put_model_command = function(params)
{
  $.ajax(
  {
    dataType: "json",
    type: "PUT",
    url: URI(api_root + "models/" + params.mid + "/commands/" + params.type + "/" + params.command).search(params.parameters || {}).toString(),
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

module.get_model_parameter_fetch = function(params, successFunction, errorFunction) {
  return fetch(`${api_root}models/${params.mid}/parameters/${params.aid}`,
  {
    credentials: "same-origin",
    cache: "no-store",
    dataType: "json",
  })
.then(function(response) {
  if (!response.ok) {
      throw `bad response with: ${response.status} :: ${response.statusText}`;
  }
  return response.json();
});
}

module.get_model_parameter = function(params)
{
  $.ajax(
  {
    dataType: "json",
    type: "GET",
    url: api_root + "models/" + params.mid + "/parameters/" + params.aid,
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

module.get_remote_file_fetch = function(params, successFunction, errorFunction)
{
  return fetch(`${api_root}remotes/${params.hostname}/file${params.path}`,
  {
    credentials: "same-origin",
    cache: "no-store",
    dataType: "text",
  })
  .then(function(response) {
    if (!response.ok) {
      throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
    return response;
  }).catch((error) => {
    if (errorFunction) {
      errorFunction(error)
    }else{
      console.log(error);
    }
  });
};

module.get_model_table_metadata_fetch = function(params, successFunction, errorFunction)
{
  return fetch(`${api_root}models/${params.mid}/tables/${params.aid}/arrays/${params.array || "0"}/metadata`,
      {
        credentials: "same-origin",
        cache: "no-store",
        dataType: "json",
      })
  .then(function(response) {
    if (!response.ok) {
        throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
    return response.json();
  }).catch((error) => {
    if (errorFunction) {
      errorFunction(error)
    }else{
      console.log(error);
    }
  });
};

module.get_model_table_metadata = function(params)
{
  console.log("slycat-web-client.get_model_table_metadata() is deprecated, use get_model_arrayset_metadata() instead.");

  var url = api_root + "models/" + params.mid + "/tables/" + params.aid + "/arrays/" + (params.array || "0") + "/metadata";
  if(params.index) {
      url += "?index=" + params.index;
  }

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
    url: api_root + "projects/" + params.pid + "/references",
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
    url: api_root + "remotes/" + params.hostname,
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
module.get_remotes_fetch = function(hostname)
{
  return fetch(`${api_root}remotes/${hostname}`, {credentials: "same-origin", cache: "no-store", dataType: "json"})
  .then(function(response) {
    if (!response.ok) {
        throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
    return response.json();
  });
};

module.get_user_fetch = function(params, successFunction, errorFunction) {
  return fetch(`${api_root}users/${params? params.uid : "-"}/${new Date().getTime()}`, 
      {
        credentials: "same-origin", 
        cache: "no-store", 
        dataType: "json"
      }
    )
    .then((response) => {
      if (!response.ok) {
        throw `bad response with: ${response.status} :: ${response.statusText}`;
      }
      return response.json();
    })
    .catch((error) => {
      if (errorFunction) {
        errorFunction(error);
      } else {
        console.log(error);
      }
    });
};

module.get_user = function(params)
{
  $.ajax(
  {
    type: "GET",
    url: api_root + "users/" + (params.uid || "-") + "/" + new Date().getTime(),
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
    url: api_root + "events/" + params.path,
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
    url: api_root + "models/" + params.mid + "/files",
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
    url: api_root + "models/" + params.mid + "/finish",
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
    url: api_root + "projects",
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

module.post_project_models_fetch = function(params)
{
  return fetch(`${api_root}projects/${params.pid}/models`,
      {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        dataType: "json",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          {
            "model-type": params.type,
            "name": params.name,
            "description": params.description || "",
            "marking": params.marking || "",
          })
      })
  .then(function(response) {
    if (!response.ok) {
        throw {
          status:response.status, 
          statusText: response.statusText
        };
    }
    return response.json();
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
    url: api_root + "projects/" + params.pid + "/models",
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
    url: api_root + "projects/" + params.pid + "/references",
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
    url: api_root + "references/" + params.rid,
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
    url: api_root + "remotes",
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

module.post_remotes_fetch = function(params)
{
  return fetch(`${api_root}remotes`,
      {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        dataType: "json",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params.parameters || {})
      })
  .then(function(response) {
    if (!response.ok) {
        throw {
          status:response.status, 
          statusText: response.statusText
        };
    }
    return response.json();
  });
};

module.get_session_status = function(params) {
  $.ajax({
    contentType: 'application/json',
    type: 'GET',
    url: api_root + 'remotes/'+params.hostname+'/session-status',
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
    url: api_root + 'remotes/'+params.hostname+'/launch',
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
    url: api_root + 'remotes/'+params.hostname+'submit-batch',
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

module.get_checkjob_fetch = function(hostname, jid) {
  return fetch(`${api_root}remotes/checkjob/${hostname}/${jid}`, {credentials: "same-origin", cache: "no-store", dataType: "json"})
  .then(function(response) {
    if (!response.ok) {
        throw new Error(`bad response with: ${response.status} :: ${response.statusText}`);
    }
    return response.json();
  }).catch((error) => {
      throw error;
  });
};

module.get_checkjob = function(params) {
  $.ajax({
    contentType: 'application/json',
    type: 'GET',
    url: api_root + 'remotes/checkjob/'+params.hostname+"/"+params.jid,
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
    url: api_root + 'remotes/delete-job/'+params.hostname+'/'+params.jid,
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
module.delete_job_fetch = function(hostname, jid) {
  return fetch(`${api_root}remotes/delete-job/${hostname}/${jid}`,
  {
    method: "DELETE",
    credentials: "same-origin",
    cache: "no-store",
  })
  .then(function(response) {
    if (!response.ok) {
        throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
    return response;
  }).catch((error) => {
      console.log('error calling delete-job:',error);
      return error;
  });
}
module.get_job_output = function(params) {
  $.ajax({
    contentType: 'application/json',
    type: 'GET',
    url: api_root + 'remotes/get-job-output/'+params.hostname+"/"+params.jid+"/path"+params.path,
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

module.get_user_config_fetch = function(params, successFunction, errorFunction)
{
  return fetch(`${api_root}remotes/${params.hostname}/get-user-config`,
      {
        credentials: "same-origin",
        cache: "no-store",
        dataType: "application/json"
      })
  .then(function(response) {
    if (!response.ok) {
        throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
    return response.json();
  }).catch((error) => {
    if (errorFunction) {
      errorFunction(error)
    } else {
      console.log(error);
    }
  });
}

module.get_user_config = function(params) {
  $.ajax({
    contentType: 'application/json',
    type: 'GET',
    url: api_root + 'remotes/'+params.hostname+'/get-user-config',
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

module.set_user_config_fetch = function(params)
{
  return fetch(`${api_root}remotes/${params.hostname}/set-user-config`, {
    method: 'POST', 
    body: JSON.stringify({config: params.config}), 
    credentials: "same-origin", 
    cache: "no-store", 
    dataType: "json"})
  .then(function(response) {
    if (!response.ok) {
        throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
    return response.json();
  });
};

module.set_user_config = function(params) {
  $.ajax({
    contentType: 'application/json',
    data: JSON.stringify({
      config: params.config
    }),
    type: 'POST',
    url: api_root + 'remotes/'+params.hostname+'/set-user-config',
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

module.post_remote_command_fetch = function(params, successFunction, errorFunction)
{
  return fetch(`${api_root}remotes/${params.hostname}/post-remote-command`,
      {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        dataType: "json",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({"command": params.command})
      })
  .then(function(response) {
    if (!response.ok) {
        throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
    return response.json();
  }).catch((error) => {
    if (errorFunction) {
      errorFunction(error)
    }else{
      console.log(error);
    }
  });
};

module.post_remote_command = function(params) {
  $.ajax({
    contentType: 'application/json',
    data: JSON.stringify({"command": params.command}),
    type: 'POST',
    url: api_root + 'remotes/'+params.hostname+'/post-remote-command',
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

module.post_remote_browse_smb = function(params)
{
  console.log("In browse smb");
  $.ajax(
  {
    contentType: "application/json",
    data: JSON.stringify(
    {
    }),
    type: "POST",
    url: api_root + "smb/remotes/" + params.hostname + "/browse" + params.path,
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

module.post_remote_browse = function(params)
{
  $.ajax(
  {
    contentType: "application/json",
    data: JSON.stringify(
    {
    }),
    type: "POST",
    url: api_root + "remotes/" + params.hostname + "/browse" + params.path,
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
      "aids": params.aids,
    }),
    type: "POST",
    url: api_root + "uploads",
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
    url: api_root + "log",
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
    url: api_root + "uploads/" + params.uid + "/finished",
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
    url: api_root + "models/" + params.mid + "/inputs",
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
    url: api_root + "models/" + params.mid + "/parameters/" + params.aid,
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
    url: api_root + "projects/" + params.pid,
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

module.delete_project_data_fetch = function(params, successFunction, errorFunction) {
  return fetch(`${api_root}projects/data/${params.did}`,
  {
    method: "DELETE",
    credentials: "same-origin",
    cache: "no-store",
  })
  .then(function(response) {
    if (!response.ok) {
        throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
  }).catch((error) => {
    if (errorFunction) {
      errorFunction(error)
    } else {
      console.log(error);
    }
  });
}

module.delete_project_cache = function(params)
{
  $.ajax(
  {
    type: "DELETE",
    url: api_root + "projects/" + params.pid + "/delete-cache",
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
    url: api_root + "delete-artifact/" + params.mid + "/" + params.aid,
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

module.put_model_fetch = function(params)
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
  if("bookmark" in params)
    model.bookmark = params.bookmark;

  return fetch(`${api_root}models/${params.mid}`, 
  {
    method: "PUT", 
    credentials: "same-origin",
    cache: "no-store",
    dataType: "json",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(model),
  })
  .then(function(response) {
    if (!response.ok) {
        throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
    console.log("RESPONSE");
    console.log(response);
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
  if("bookmark" in params)
    model.bookmark = params.bookmark;

  $.ajax(
  {
    contentType: "application/json",
    data: JSON.stringify(model),
    processData: false,
    type: "PUT",
    url: api_root + "models/" + params.mid,
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
    url: api_root + "uploads/" + params.uid + "/files/" + params.fid + "/parts/" + params.pid,
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
    url: api_root + "logout",
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
    url: api_root + 'remotes/'+params.nodes+"/"+params.tasks+"/"+params.size+"/job-time",
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

module.get_time_series_names_fetch = function(params)
{
  return fetch(`${api_root}remotes/${params.hostname}/time_series_names/file/${params.path}`, {credentials: "same-origin", cache: "no-store", dataType: "json"})
  .then(function(response) {
    if (!response.ok) {
        throw `bad response with: ${response.status} :: ${response.statusText}`;
    }
    return response.json();
  });
};

module.get_time_series_names = function(params)
{
  $.ajax({
    contentType: 'application/json',
    type: 'GET',
    url: api_root + "remotes/" + params.hostname + "/time_series_names/file" + params.path,
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

module.get_project = function(params) {
  $.ajax({
    contentType: 'application/json',
    type: 'GET',
    url: api_root + 'projects/' + params.pid,
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

module.get_projects = function(params) {
  $.ajax({
    contentType: 'application/json',
    type: 'GET',
    url: api_root + 'projects_list',
    cache: false,
    success: function(result, textStatus, request) {
      if (params.success)
        params.success(result, textStatus, request);
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
    url: api_root + 'projects/'+ params.pid + '/models',
    cache: false,
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
export default module;
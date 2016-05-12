/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-changes-feed", ["slycat-server-root", "slycat-web-client", "URI", "knockout", "knockout-mapping"], function(server_root, client, URI, ko, mapping)
{
  var websocket = null;
  var started = false;

  // Don't rate-limit the array, it seems to cause incorrect results with projections.
  //var projects = ko.observableArray().extend({rateLimit: {timeout: 10, method: "notifyWhenChangesStop"}});
  var projects = ko.observableArray();
  var project_ids = {}

  // Don't rate-limit the array, it seems to cause incorrect results with projections.
  //var models = ko.observableArray().extend({rateLimit: {timeout: 10, method: "notifyWhenChangesStop"}});
  var models = ko.observableArray();
  var model_ids = {}

  function sort_projects()
  {
    projects.sort(function(left, right)
    {
      return left.created() == right.created() ? 0 : (left.created() < right.created() ? 1 : -1);
    });
  }

  function sort_models()
  {
    models.sort(function(left, right)
    {
      return left.created() == right.created() ? 0 : (left.created() < right.created() ? 1 : -1);
    });
  }

  function start()
  {
    if(started)
      return;
    started = true;

    var websocket_uri = URI(window.location).scheme("wss").path(server_root + "changes-feed");
    var websocket = new WebSocket(websocket_uri);
    websocket.onmessage = function(message)
    {
      // console.log("\nmessage recieved: " + message.data + "\n");
      var change = JSON.parse(message.data);

      // Keep track of project changes.
      if(change.deleted)
      {
        if(change.id in project_ids)
        {
          delete project_ids[change.id];
          for(var i = 0; i != projects().length; ++i)
          {
            if(projects()[i]._id() == change.id)
            {
              projects.splice(i, 1);
              break;
            }
          }
        }
      }
      else
      {
        if(change.doc.type == "project")
        {
          var project = change.doc;
          if(project._id in project_ids)
          {
            mapping.fromJS(project, project_ids[project._id]);
          }
          else
          {
            project_ids[project._id] = mapping.fromJS(project);
            projects.push(project_ids[project._id]);
            sort_projects();
          }
        }
      }

      // Keep track of model changes.
      if(change.deleted)
      {
        if(change.id in model_ids)
        {
          delete model_ids[change.id];
          for(var i = 0; i != models().length; ++i)
          {
            if(models()[i]._id() == change.id)
            {
              models.splice(i, 1);
              break;
            }
          }
        }
      }
      else
      {
        if(change.doc.type == "model")
        {
          var model = change.doc;
          if(model._id in model_ids)
          {
            mapping.fromJS(model, model_ids[model._id]);
          }
          else
          {
            model_ids[model._id] = mapping.fromJS(model);
            models.push(model_ids[model._id]);
            sort_models();
          }
        }
      }


    }
  }

  var module = {};

  module.projects = function()
  {
    start();
    return projects;
  }

  module.models = function()
  {
    start();
    return models;
  }

  return module;
});

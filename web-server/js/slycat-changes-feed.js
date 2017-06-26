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

    var project_params = {
      success : function(results){
      // results = JSON.parse(results);
      results.projects.forEach(function(project){
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
        // console.log(results);
        var model_params = {
          pid : project._id,
          success : function(results){
            // console.log(results);
            // results = JSON.parse(results);
            results.forEach(function(model){
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
            });
          }
        };
        client.get_project_models(model_params);
      });

    }};
    client.get_projects(project_params);
  }

  var module = {};

  module.projects = function()
  {
    start();
    return projects;
  };

  module.models = function()
  {
    start();
    return models;
  };

  return module;
});

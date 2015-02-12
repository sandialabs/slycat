/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-changes-feed", ["slycat-server-root", "knockout", "knockout-mapping"], function(server_root, ko, mapping)
{
  // Keep track of change event observers
  var callbacks = [];
  var source = null;

  function start()
  {
  }

/*
  // Server-side-events loop to keep track of the current user's list of projects.
  var projects = ko.observableArray().extend({rateLimit: {timeout: 10, method: "notifyWhenChangesStop"}});
  var project_ids = {}

  function sort_projects()
  {
    projects.sort(function(left, right)
    {
      return left.created() == right.created() ? 0 : (left.created() < right.created() ? 1 : -1);
    });
  }

  function start()
  {
    source = new EventSource(server_root + "projects-feed");
    source.onmessage = function(event)
    {
      message = JSON.parse(event.data);
      if(message.deleted)
      {
        if(message.id in project_ids)
        {
          delete project_ids[message.id];
          for(var i = 0; i != projects().length; ++i)
          {
            if(projects()[i]._id() == message.id)
            {
              projects.splice(i, 1);
              break;
            }
          }
        }
      }
      else
      {
        var project = message.doc;
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
    source.onerror = function(event)
    {
    }
  }
*/

  var module = {};

  module.watch = function(callback)
  {
    callbacks.push(callback);
    if(!source)
      start();
  }

  return module;
});

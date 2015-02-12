/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-projects-feed", ["slycat-changes-feed", "knockout", "knockout-mapping"], function(changes_feed, ko, mapping)
{
  // Server-side-events loop to keep track of the current user's list of projects.
  var projects = ko.observableArray().extend({rateLimit: {timeout: 10, method: "notifyWhenChangesStop"}});
  var project_ids = {}
  var started = false;

  function sort_projects()
  {
    projects.sort(function(left, right)
    {
      return left.created() == right.created() ? 0 : (left.created() < right.created() ? 1 : -1);
    });
  }

  function start()
  {
    if(started)
      return;
    started = true;

    changes_feed.watch(function(change)
    {
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
    });
  }

  var module = {};

  module.watch = function()
  {
    start();
    return projects;
  }

  return module;
});

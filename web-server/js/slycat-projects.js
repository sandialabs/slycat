/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-projects", ["slycat-server-root"], function(server_root)
{
  // Long-polling loop to keep track of the current list of projects.
  var projects = ko.mapping.fromJS([]);
  var current_revision = null;
  var started = false;
  function get_projects()
  {
    $.ajax(
    {
      cache: false, // Don't cache this request; otherwise, the browser will display the JSON if the user leaves this page then returns.
      dataType: "text", // So we can handle the case where there's no change (empty result body)
      headers: {"accept":"application/json"},
      type: "GET",
      url: server_root + "projects" + (current_revision != null ? "?revision=" + current_revision: ""),
      success: function(text)
      {
        var results = text ? $.parseJSON(text): null;
        if(results)
        {
          current_revision = results.revision;
          results.projects.sort(function(left, right)
          {
            return left.created == right.created ? 0: (left.created < right.created ? 1: -1);
          });
          ko.mapping.fromJS(results.projects, projects);
        }

        // Restart the request immediately.
        window.setTimeout(get_projects, 10);
      },
      error: function(request, status, reason_phrase)
      {
        // Rate-limit requests when there's an error.
        window.setTimeout(get_projects, 5000);
      }
    });
  }

  var module = {};
  module.list = function()
  {
    if(!started)
      get_projects();
    return projects;
  }

  return module;
});

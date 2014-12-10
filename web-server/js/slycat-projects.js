/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-projects", ["slycat-server-root"], function(server_root)
{
  var module = {};
  module.start = function()
  {
    var model = {}
    model.server_root = server_root;
    model.projects = ko.mapping.fromJS([]);

    // Get information about available projects.
    var current_revision = null;
    function get_projects()
    {
      $.ajax(
      {
        dataType : "json",
        type : "GET",
        cache : false, // Don't cache this request; otherwise, the browser will display the JSON if the user leaves this page then returns.
        url : server_root + "projects" + (current_revision != null ? "?revision=" + current_revision : ""),
        success : function(results)
        {
          current_revision = results.revision;
          results.projects.sort(function(left, right)
          {
            return left.created == right.created ? 0 : (left.created < right.created ? 1 : -11);
          });
          ko.mapping.fromJS(results.projects, model.projects);

          // Restart the request immediately.
          window.setTimeout(get_projects, 10);
        },
        error : function(request, status, reason_phrase)
        {
          // Rate-limit requests when there's an error.
          window.setTimeout(get_projects, 5000);
        }
      });
    }

    get_projects();

    // Size the page content to consume available space
    function size_content()
    {
      $(".slycat-content").css("min-height", $(window).height() - $("slycat-navbar > div").height());
    }
    $(window).resize(size_content);
    window.setTimeout(function() { $(window).resize(); }, 10);

    ko.applyBindings({}, document.querySelector("slycat-navbar"));
    ko.applyBindings(model, document.getElementById("slycat-projects"));
  }

  return module;
});

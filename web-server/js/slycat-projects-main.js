/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-projects-main", ["slycat-server-root", "slycat-projects"], function(server_root, projects)
{
  var module = {};
  module.start = function()
  {
    var page = {}
    page.server_root = server_root;
    page.projects = projects.watch();

    // Size the page content to consume available space
    function size_content()
    {
      $(".slycat-content").css("min-height", $(window).height() - $("slycat-navbar > div").height());
    }
    $(window).resize(size_content);
    window.setTimeout(function() { $(window).resize(); }, 10);

    ko.applyBindings(page);
  }

  return module;
});

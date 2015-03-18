/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-projects-main", ["slycat-server-root", "slycat-changes-feed", "knockout"], function(server_root, changes_feed, ko)
{
  var module = {};
  module.start = function()
  {
    var page = {}
    page.server_root = server_root;
    page.projects = changes_feed.projects();
    ko.applyBindings(page, document.querySelector("html"));
  }

  return module;
});

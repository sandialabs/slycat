/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-page-main", ["slycat-server-root", "slycat-web-client", "knockout", "knockout-mapping"], function(server_root, client, ko, mapping)
{
  var module = {};
  module.start = function()
  {
    var page = {}
    page.server_root = server_root;
    page.projects = mapping.fromJS([]);
    client.get_projects({
      success: function(result) {
        mapping.fromJS(result.projects, page.projects);
      },
      error: function(request, status, reason_phrase) {
        console.log("Unable to retrieve project.");
      }
    });
    ko.applyBindings(page, document.querySelector("html"));
  }

  return module;
});

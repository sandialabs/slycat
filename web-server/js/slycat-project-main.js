/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-project-main", ["slycat-server-root", "slycat-web-client", "slycat-markings", "slycat-models-feed", "knockout", "knockout-mapping", "URI"], function(server_root, client, markings, models_feed, ko, mapping, URI)
{
  var module = {}
  module.start = function()
  {
    var page = {};
    page.server_root = server_root;
    page.project = mapping.fromJS({_id: URI(window.location).segment(-1), name: "", description: "",created: "",creator: "",acl:{administrators:[],writers:[],readers:[]}});
    page.models = models_feed.watch().filter(function(model)
    {
      return model.project() == page.project._id();
    });
    page.markings = markings.allowed;
    page.badge = function(marking)
    {
      for(var i = 0; i != page.markings().length; ++i)
      {
        if(page.markings()[i].type() == marking)
          return page.markings()[i].badge();
      }
    }
    ko.applyBindings(page);
  };

  return module;
});

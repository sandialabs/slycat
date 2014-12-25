/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-project-main", ["slycat-server-root", "slycat-web-client", "slycat-markings", "slycat-models"], function(server_root, client, markings, models)
{
  var module = {}
  module.start = function()
  {
    var page = {};
    page.server_root = server_root;
    page.project = ko.mapping.fromJS({_id: location.pathname.split("/").reverse()[0], name: "", description: "",created: "",creator: "",acl:{administrators:[],writers:[],readers:[]}});
    page.models = models.watch().filter(function(model)
    {
      return model.project() == page.project._id();
    });
    page.markings = markings;
    page.badge = function(marking)
    {
      for(var i = 0; i != page.markings().length; ++i)
      {
        if(page.markings()[i].type() == marking)
          return page.markings()[i].badge();
      }
    }

    // Size the page content to consume available space
    function size_content()
    {
      $(".slycat-content").css("min-height", $(window).height() - $("slycat-navbar > div").height());
    }
    $(window).resize(size_content);
    window.setTimeout(function() { $(window).resize(); }, 10);

    ko.applyBindings(page);
  };

  return module;
});

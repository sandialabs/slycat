/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define(["slycat-server-root", "slycat-bookmark-manager"], function(server_root, bookmark_manager)
{
  function constructor(params)
  {
    var component = {};
    component.project = params.projects()[0];
    component.model = params.models()[0];
    component.reset_model = function()
    {
      bookmark_manager.current_bid(null);
    }
    return component;
  }

  return {
    viewModel: constructor,
    template: { "require": "text!" + server_root + "resources/wizards/slycat-reset-model/ui.html" },
  };
});

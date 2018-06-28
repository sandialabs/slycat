/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import server_root from "js/slycat-server-root";
import bookmark_manager from "js/slycat-bookmark-manager";
import resetUI from "./reset-ui.html";

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

export default {
  viewModel: constructor,
  template: resetUI,
};
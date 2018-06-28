/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import server_root from "js/slycat-server-root";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import bookmark_manager from "js/slycat-bookmark-manager";
import ko from 'knockout';
import mapping from "knockout-mapping";
import createTemplateUI from "./create-template-ui.html";

function constructor(params)
{
  var component = {};
  component.show_wizard = params.show_wizard;
  component.project = params.projects()[0];
  component.model = params.models()[0];
  component.name = ko.observable("");

  component.save_template = function()
  {
    client.post_project_references(
    {
      pid: component.project._id(),
      name: component.name(),
      "model-type": component.model["model-type"](),
      bid: bookmark_manager.current_bid(),
      error: dialog.ajax_error("Error creating template."),
    });
  }

  if(!bookmark_manager.current_bid())
  {
    dialog.dialog(
    {
      title: "Can't Create Template",
      message: "Since you haven't made any changes to the model state, there's nothing to save as a template.",
      callback: function()
      {
        component.show_wizard(false);
      }
    });
  }

  return component;
}

export default {
  viewModel: constructor,
  template: createTemplateUI,
};
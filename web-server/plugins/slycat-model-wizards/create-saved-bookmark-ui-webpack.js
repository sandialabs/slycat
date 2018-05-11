/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import server_root from "../../js/slycat-server-root";
import client from "../../js/slycat-web-client-webpack";
import * as dialog from "../../js/slycat-dialog-webpack";
import bookmark_manager from "../../js/slycat-bookmark-manager-webpack";
import ko from 'knockout';
import mapping from "knockout-mapping";
import createSavedBookmarkUI from "./create-saved-bookmark-ui.html";

function constructor(params)
{
  var component = {};
  component.show_wizard = params.show_wizard;
  component.project = params.projects()[0];
  component.model = params.models()[0];
  component.name = ko.observable("");

  component.save_bookmark = function()
  {
    client.post_project_references(
    {
      pid: component.project._id(),
      name: component.name(),
      "model-type": component.model["model-type"](),
      mid: bookmark_manager.current_mid(),
      bid: bookmark_manager.current_bid(),
      error: dialog.ajax_error("Error creating saved bookmark."),
      success: function(){
        component.show_wizard(false);
      }
    });
  }

  if(!bookmark_manager.current_bid())
  {
    dialog.dialog(
    {
      title: "Can't Save Bookmark",
      message: "Since you haven't made any changes to the model state, there is no bookmark to save.",
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
  template: createSavedBookmarkUI,
};

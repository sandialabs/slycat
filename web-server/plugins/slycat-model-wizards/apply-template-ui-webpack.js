/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import server_root from "../../js/slycat-server-root";
import client from "../../js/slycat-web-client-webpack";
import * as dialog from "../../js/slycat-dialog-webpack";
import bookmark_manager from "../../js/slycat-bookmark-manager-webpack";
import ko from 'knockout';
import mapping from "knockout-mapping";
import applyTemplateUI from "./apply-template-ui.html";

function constructor(params)
{
  var component = {};
  component.project = params.projects()[0];
  component.model = params.models()[0];
  component.references = mapping.fromJS([]);
  component.reference = ko.observable(null);

  client.get_project_references(
  {
    pid: component.project._id(),
    success: function(references)
    {
      mapping.fromJS(references, component.references);
    },
  });

  component.apply_template = function()
  {
    bookmark_manager.current_bid(component.reference());
  }
  return component;
}

export default {
  viewModel: constructor,
  template: applyTemplateUI,
};

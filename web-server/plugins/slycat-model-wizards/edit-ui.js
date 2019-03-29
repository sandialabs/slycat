/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import server_root from "js/slycat-server-root";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import "js/slycat-model-controls";
import mapping from "knockout-mapping";
import editUI from "./edit-ui.html";

function constructor(params)
{
  var component = {};
  component.project = params.projects()[0];
  component.model = params.models()[0];
  component.modified = mapping.fromJS(mapping.toJS(component.model));

  component.save_model = function(formElement)
  {
    // Validating
    formElement.classList.add('was-validated');

    // If valid...
    if (formElement.checkValidity() === true)
    {
      // Clearing form validation
      formElement.classList.remove('was-validated');
      // Updating model
      client.put_model(
      {
        mid: component.model._id(),
        name: component.modified.name(),
        description: component.modified.description(),
        marking: component.modified.marking(),
        success: function()
        {
          window.location.href = server_root + "models/" + component.model._id();
        },
        error: dialog.ajax_error("Error updating model."),
      });
    }
  }
  return component;
}

export default {
  viewModel: constructor,
  template: editUI,
};
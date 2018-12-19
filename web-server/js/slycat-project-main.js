/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

// CSS resources
import "css/namespaced-bootstrap.scss";
import "css/slycat.css";

import React from "react";
import ReactDOM from "react-dom";
import { ModelsList, TemplatesList } from 'components/ModelsList';
import client from 'js/slycat-web-client';
import URI from 'urijs';
import ga from "js/slycat-ga";
import "bootstrap";

// These next 2 lines are required render the navbar using knockout. Remove them once we convert it to react.
import ko from 'knockout';
import "js/slycat-navbar";

export default function renderTemplates(project_id) {
  // Create a React TemplatesList component after getting the list of templates in this project
  client.get_project_references(
  {
    pid: project_id,
    success: function(result)
    {
      const templates_list = <TemplatesList templates={result} />
      ReactDOM.render(
        templates_list,
        document.getElementById('slycat-templates')
      );
    }
  });
}

// Wait for document ready
$(document).ready(function() {

  // Get the project ID from the URL
  const project_id = URI(window.location).segment(-1);

  // Set the page title by getting the project and appending to its name
  client.get_project({
    pid: project_id,
    success: function(result) {
      document.title = result.name + " - Slycat Project";
    },
    error: function(request, status, reason_phrase) {
      console.log("Unable to retrieve project.");
    }
  });

  // Create a React ModelsList component after getting the list of models in this project
  client.get_project_models({
    pid: project_id,
    success: function(result) {
      const models_list = <ModelsList models={result} />
      ReactDOM.render(
        models_list,
        document.getElementById('slycat-models')
      );
    },
    error: function(request, status, reason_phrase) {
      console.log("Unable to retrieve project models.");
    }
  });

  renderTemplates(project_id);

  var update_references = function()
  {
    client.get_project_references(
    {
      pid: page.project._id(),
      success: function(result)
      {
        mapping.fromJS(result, references);
      }
    });
  }

  // These next 2 lines render the navbar using knockout. Remove them once we convert it to react.
  var page = { project_id: project_id }
  ko.applyBindings(page, document.querySelector("html"));

});

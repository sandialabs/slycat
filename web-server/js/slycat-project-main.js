"use strict";
/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

// CSS resources
import "css/slycat-bootstrap.scss";
import "css/slycat.css";

import React from "react";
import ReactDOM from "react-dom";
import { renderTemplates } from 'components/ModelsList';
import SearchWrapper from 'components/SearchWrapper';
import client from 'js/slycat-web-client';
import URI from 'urijs';

// These next 2 lines are required render the navbar using knockout. Remove them once we convert it to react.
import ko from 'knockout';
import { renderNavBar } from "js/slycat-navbar";

// Wait for document ready
$(document).ready(function() {
  renderNavBar();
  // Get the project ID from the URL
  const project_id = URI(window.location).segment(-1);

  // Set the page title by getting the project and appending to its name
  client.get_project({
    pid: project_id,
    success: function(result) {
      document.title = result.name + " - Slycat Project";
      // Create a React SearchWrapper component after getting the list of models in this project
      client.get_project_models({
        pid: project_id,
        success: function(result) {
          // console.log('got models');
          const models_list = <SearchWrapper items={result} type="models" />
          ReactDOM.render(
            models_list,
            document.getElementById('slycat-models')
          );
        },
        error: function(request, status, reason_phrase) {
          console.log("Unable to retrieve project models.");
        }
      });
    },
    error: function(request, status, reason_phrase) {
      console.log("Unable to retrieve project.");
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

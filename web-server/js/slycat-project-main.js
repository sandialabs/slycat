"use strict";
/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

// CSS resources
import "css/slycat-bootstrap.scss";
import "css/slycat.css";

import React from "react";
import { createRoot } from "react-dom/client";
import { renderTemplates } from "components/ModelsList.tsx";
import SearchWrapper from "components/SearchWrapper.tsx";
import client from "js/slycat-web-client";
import URI from "urijs";

// The next line is required render the navbar using knockout. Remove it once we convert to react.
import ko from "knockout";

// Wait for document ready
$(document).ready(function () {
  // First we do a simple api call for the user to make sure we are authenticated
  // before going ahead with loading the navbar, which makes a bunch more
  // api calls.
  client
    .get_user_fetch()
    // Once we have got the user, thus verified authentication, we import the navbar JS.
    .then(() => import(/* webpackChunkName: "slycat-navbar" */ "js/slycat-navbar"))
    // Once the navbar is loaded, we render it and continue rendering the rest of the page.
    .then((navbar) => {
      navbar.renderNavBar();
      // Get the project ID from the URL
      const project_id = URI(window.location).segment(-1);
      // Set the page title by getting the project and appending to its name
      client.get_project({
        pid: project_id,
        success: function (result) {
          document.title = result.name + " - Slycat Project";
          // Create a React SearchWrapper component after getting the list of models in this project
          client.get_project_models({
            pid: project_id,
            success: function (result) {
              // console.log('got models');
              const models_list = <SearchWrapper items={result} type="models" />;
              const slycat_models_root = createRoot(document.getElementById("slycat-models"));
              slycat_models_root.render(models_list);
            },
            error: function (request, status, reason_phrase) {
              console.log("Unable to retrieve project models.");
            },
          });
        },
        error: function (request, status, reason_phrase) {
          console.log("Unable to retrieve project.");
        },
      });

      renderTemplates(project_id);

      var update_references = function () {
        client.get_project_references({
          pid: page.project._id(),
          success: function (result) {
            mapping.fromJS(result, references);
          },
        });
      };

      // These next 2 lines render the navbar using knockout. Remove them once we convert it to react.
      var page = { project_id: project_id };
      ko.applyBindings(page, document.querySelector("html"));
    })
    .catch((error) => {
      console.log(`Can't retrieve current user before loading the navbar. Error was: ${error}`);
    });
});

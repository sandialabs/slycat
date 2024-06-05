"use strict";
/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

// CSS resources
import "css/slycat-bootstrap.scss";
import "css/slycat.css";

import client from "js/slycat-web-client";
import ko from "knockout";
import URI from "urijs";
import React from "react";
import { createRoot } from "react-dom/client";
import UnrecognizedMarkingWarning from "components/UnrecognizedMarkingWarning.tsx";
import Spinner from "components/Spinner.tsx";

// Wait for document ready
$(document).ready(function () {
  // First we do a simple api call for the user to make sure we are authenticated
  // before going ahead with loading the navbar, which makes a bunch more
  // api calls.
  client
    .get_user_fetch()
    // Once we have got the user, thus verified authentication, we import the rest of the JS.
    .then(() => import(/* webpackChunkName: "slycat-navbar" */ "js/slycat-navbar"))
    // Once the navbar is loaded, we render it and load the rest of the model.
    .then((navbar) => {
      navbar.renderNavBar();

      var mid = URI(window.location).segment(-1);
      var page = {};
      page.model_id = mid;
      page.title = ko.observable();
      client.get_model({
        mid: mid,
        success: function (result) {
          // console.log("success of client.get_model in slycat-model-main.js");
          page.model_name = result.name;
          window.model_name = page.model_name;
          page.title(page.model_name + " - Slycat Model");
          page.project_id = result.project;
          page.model_type = result["model-type"];
          page.marking = result.marking;
          ko.applyBindings(page, document.querySelector("head"));
          ko.applyBindings(page, document.querySelector("slycat-navbar"));

          let slycat_content = document.querySelector(".slycat-content");

          const slycat_content_root = createRoot(slycat_content);
          slycat_content_root.render(<Spinner />);

          // Importing slycat-plugins here because it also makes API calls and these can't happen before get_user_fetch
          import(/* webpackChunkName: "slycat-plugins" */ "js/slycat-plugins").then(
            (slycatPlugins) => {
              let loadTemplatePromise = slycatPlugins.loadTemplate(page.model_type, "html");
              let loadMarkingPromise = client.get_configuration_markings_fetch();
              let loadTemplateFinish = (values) => {
                // Remove spinner
                slycat_content_root.unmount();

                // Match the model's marking with the ones currently registered
                let current_marking = values[1].find((obj) => obj.type == page.marking);
                const embed = URI(window.location).query(true).embed !== undefined;
                let template = document.createElement("template");
                let html = "";

                // Check if the current marking has code that needs to be prepended to the template.

                if (
                  current_marking &&
                  current_marking["page-before"] != null &&
                  // Hide marking code if we are in embed mode.
                  !embed
                )
                  html += current_marking["page-before"].trim();

                // Add the template code
                html += values[0];

                // Check if the current marking has code that needs to be appended to the template
                if (
                  current_marking &&
                  current_marking["page-after"] != null &&
                  // Hide marking code if we are in embed mode.
                  !embed
                )
                  html += current_marking["page-after"].trim();

                // Inject the code into the .slycat-content node
                template.innerHTML = html;
                slycat_content.appendChild(template.content);

                // Load the JS module
                slycatPlugins.loadModule(page.model_type).then((component) => {
                  // console.log("inside loadModelModule().then()");
                  // ko.applyBindings(page, document.querySelector(".slycat-content"));
                });

                // If we don't have marking code for the model, let's overlay a warning message that hides the model
                if (current_marking === undefined) {
                  // console.log("Oops, we don't have code for the current model's marking. We should probably not display it.");
                  let warning_element = document.createElement("div");
                  warning_element.setAttribute("id", "unrecognized-marking-warning");
                  warning_element.setAttribute("class", "w-100 h-100");
                  slycat_content.appendChild(warning_element);
                  const warning_element_root = createRoot(warning_element);
                  warning_element_root.render(
                    <UnrecognizedMarkingWarning
                      marking={page.marking}
                      project_id={page.project_id}
                      warning_element={warning_element}
                    />,
                  );
                }
              };

              // For testing purposes, to simulate a slow network, uncomment this setTimeout
              // setTimeout( () => {
              Promise.all([loadTemplatePromise, loadMarkingPromise]).then(loadTemplateFinish);
              // For testing purposes, to simulate a slow network, uncomment this setTimeout
              // }, 10000);
            },
          );
        },
        error: function (request, status, reason_phrase) {
          alert("Unable to retrieve model.");
          window.location.href = "/projects";
        },
      });
    })
    .catch((error) => {
      console.log(`Can't retrieve current user before loading the navbar. Error was: ${error}`);
    });
});

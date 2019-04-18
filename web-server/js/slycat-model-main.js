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
import {renderNavBar} from "js/slycat-navbar";
import ga from "js/slycat-ga";
import {loadTemplate, loadModule} from 'js/slycat-plugins';
import markings from "js/slycat-markings";
import React from "react";
import ReactDOM from "react-dom";
import UnrecognizedMarkingWarning from 'components/UnrecognizedMarkingWarning';

// Wait for document ready
$(document).ready(function() {
  renderNavBar();
  var mid = URI(window.location).segment(-1);
  var page = {};
  page.model_id = mid;
  page.title = ko.observable();
  client.get_model(
  {
    mid: mid,
    success: function(result)
    {
      // console.log("success of client.get_model in slycat-model-main.js");
      page.model_name = result.name;
      window.model_name = page.model_name;
      page.title(page.model_name + " - Slycat Model");
      page.project_id = result.project;
      page.model_type = result["model-type"];
      page.marking = result.marking;
      ko.applyBindings(page, document.querySelector("head"));
      ko.applyBindings(page, document.querySelector("slycat-navbar"));
      loadTemplate(page.model_type, "html").then(component => {
        let slycat_content = document.querySelector(".slycat-content");
        // Match the model's marking with the ones currently registered
        let current_marking = markings.allowed().find(obj => obj.type() == page.marking);
        let template = document.createElement('template');
        let html = "";

        // Check if the current marking has code that needs to be prepended to the template
        if(current_marking && current_marking['page-before']() != null)
          html += current_marking['page-before']().trim();

        // Add the template code
        html += component;

        // Check if the current marking has code that needs to be appended to the template
        if(current_marking && current_marking['page-after']() != null)
          html += current_marking['page-after']().trim();

        // Inject the code into the .slycat-content node
        template.innerHTML = html;
        slycat_content.appendChild(template.content);

        // Load the JS module
        loadModule(page.model_type).then(component => {
          // console.log("inside loadModelModule().then()");
          // ko.applyBindings(page, document.querySelector(".slycat-content"));
        });

        // If we don't have marking code for the model, let's overlay a warning message that hides the model
        if(current_marking === undefined)
        {
          // console.log("Oops, we don't have code for the current model's marking. We should probably not display it.");
          let warning_element = document.createElement('div');
          warning_element.setAttribute('id', 'unrecognized-marking-warning');
          warning_element.setAttribute('class', 'w-100 h-100');
          slycat_content.appendChild( warning_element );
          ReactDOM.render(
            <UnrecognizedMarkingWarning marking={page.marking} project_id={page.project_id} warning_element={warning_element} />,
            warning_element
          );
        }
      });

    },
    error: function(request, status, reason_phrase)
    {
      alert("Unable to retrieve model.");
      window.location.href = "/projects";
    }
  });
});
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
      ko.applyBindings(page, document.querySelector("slycat-navbar"));
      loadTemplate(page.model_type).then(component => {
        // console.log("inside loadModelTemplate().then()");
        document.querySelector(".slycat-content").appendChild(component);
        ko.applyBindings(page, document.querySelector("head"));
        loadModule(page.model_type).then(component => {
          // console.log("inside loadModelModule().then()");
          // ko.applyBindings(page, document.querySelector(".slycat-content"));
        });
      });

    },
    error: function(request, status, reason_phrase)
    {
      console.log("Error retrieving model.");
    }
  });
});
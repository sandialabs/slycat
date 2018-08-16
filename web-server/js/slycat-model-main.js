/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

// CSS resources
import "css/namespaced-bootstrap.less";
import "css/slycat.css";

import client from "js/slycat-web-client";
import ko from "knockout";
import URI from "urijs";
import "js/slycat-navbar";
import ga from "js/slycat-ga";

// Wait for document ready
$(document).ready(function() {
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
      loadModelTemplate().then(component => {
        // console.log("inside loadModelTemplate().then()");
        document.querySelector(".slycat-content").appendChild(component);
        ko.applyBindings(page, document.querySelector("head"));
        loadModelModule().then(component => {
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

  async function loadModelTemplate() {
    // console.log("loadModelTemplate, page.model_type is " + page.model_type);

    var template = document.createElement('template');
    var html = "";

    if (page.model_type == "parameter-image") {
      html = await import(/* webpackChunkName: "ui_parameter_image_template" */ 'plugins/slycat-parameter-image/ui.html');
    }
    else if (page.model_type == "timeseries") {
      html = await import(/* webpackChunkName: "ui_timeseries_template" */ 'plugins/slycat-timeseries-model/ui.html');
    }
    else if (page.model_type == "cca") {
      html = await import(/* webpackChunkName: "ui_cca_template" */ 'plugins/slycat-cca/ui.html');
    }
    else if (page.model_type == "parameter-image-plus") {
      html = await import(/* webpackChunkName: "ui_parameter_image_plus_template" */ 'plugins/slycat-parameter-image-plus-model/ui.html');
    }
    else {
      console.log("We don't recognize this model type, so not loading a template.");
    }

    if (html.default) {
      html = html.default;
    }
    html = html.trim();
    template.innerHTML = html;
    return template.content;
  }

  async function loadModelModule() {
    // console.log("loadModelModule, page.model_type is " + page.model_type);

    if (page.model_type == "parameter-image") {
      module = await import(/* webpackChunkName: "ui_parameter_image_module" */ 'plugins/slycat-parameter-image/js/ui.js');
      // console.log("loading ui_parameter_image.js");
    }
    else if (page.model_type == "timeseries") {
      module = await import(/* webpackChunkName: "ui_timeseries_module" */ 'plugins/slycat-timeseries-model/js/ui.js');
      // console.log("loading ui_parameter_image.js");
    }
    else if (page.model_type == "cca") {
      module = await import(/* webpackChunkName: "ui_cca_module" */ 'plugins/slycat-cca/js/ui.js');
      // console.log("loading ui_cca.js");
    }
    else if (page.model_type == "parameter-image-plus") {
      module = await import(/* webpackChunkName: "ui_parameter_image_plus_module" */ 'plugins/slycat-parameter-image-plus-model/js/ui.js');
      // console.log("loading ui_parameter_plus.js");
    }
    else {
      console.log("We don't recognize this model type, so not loading a module.");
    }

    return module;
  }

});
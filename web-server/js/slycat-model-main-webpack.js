/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

// CSS resources
import "css/namespaced-bootstrap.less";
import "css/slycat.css";

import client from "./slycat-web-client-webpack";
import ko from "knockout";
import URI from "urijs";
import "js/slycat-navbar-webpack";
import ga from "js/slycat-ga";

// Wait for document ready
$(document).ready(function() {

  // Enable knockout
  var mid = URI(window.location).segment(-1);
  var page = {};
  page.model_id = mid;
  page.title = ko.observable();
  client.get_model(
  {
    mid: mid,
    success: function(result)
    {
      page.title(result.name + " - Slycat Model");
      page.project_id = result.project;
      ko.applyBindings(page, document.querySelector("slycat-navbar"));
    },
    error: function()
    {
      console.log("Error retrieving model.");
    }
  });
  ko.applyBindings(page, document.querySelector("head"));

});
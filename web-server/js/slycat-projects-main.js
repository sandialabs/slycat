/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

// CSS resources
import "css/namespaced-bootstrap.less";
import "css/slycat.css";

import server_root from 'js/slycat-server-root';
import client from 'js/slycat-web-client-webpack';
import ko from 'knockout';
import mapping from 'knockout-mapping';
import "js/slycat-navbar-webpack";
import ga from "js/slycat-ga";

// Wait for document ready
$(document).ready(function() {

  var page = {}
  page.server_root = server_root;
  page.projects = mapping.fromJS([]);
  client.get_projects({
    success: function(result) {
      mapping.fromJS(result.projects, page.projects);
    },
    error: function(request, status, reason_phrase) {
      console.log("Unable to retrieve project.");
    }
  });
  ko.applyBindings(page, document.querySelector("html"));

});
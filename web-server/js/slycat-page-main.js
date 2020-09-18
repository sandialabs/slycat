"use strict";
/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

// CSS resources
import "css/slycat-bootstrap.scss";
import "css/slycat.css";

import server_root from 'js/slycat-server-root';
import client from 'js/slycat-web-client';
import ko from 'knockout';
import URI from "urijs";
import mapping from 'knockout-mapping';

// Wait for document ready
$(document).ready(function() {

  // First we do a simple api call for the user to make sure we are authenticated
  // before going ahead with loading the navbar, which makes a bunch more
  // api calls.
  client.get_user_fetch()
    // Once we have got the user, thus verified authentication, we import the navbar JS.
    .then(() => import(/* webpackChunkName: "slycat-navbar" */ 'js/slycat-navbar'))
    // Once the navbar is loaded, we render it and load the list of projects.
    .then(navbar => {
      navbar.renderNavBar();
      // Loading slycat-ga module here because it makes API calls, and these need to happen after get_user_fetch
      import(/* webpackChunkName: "slycat-ga" */ 'js/slycat-ga');

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

      let pid = URI(window.location).segment(-1);

      // Importing slycat-plugins here because it also makes API calls and these can't happen before get_user_fetch
      import(/* webpackChunkName: "slycat-plugins" */ 'js/slycat-plugins').then(slycatPlugins => {
        slycatPlugins.loadTemplate(pid).then(component => {
          document.querySelector(".slycat-content").appendChild(component);
          slycatPlugins.loadModule(pid).then(component => {
            // console.log("inside loadModelModule().then()");
            // ko.applyBindings(page, document.querySelector(".slycat-content"));
          });
        });
      });
    })
    .catch(error => {
      console.log(`Can't retrieve current user before loading the navbar. Error was: ${error}`);
    })
    ;  

});

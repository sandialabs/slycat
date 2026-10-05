"use strict";
/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

// CSS resources
import "css/slycat-bootstrap.scss";
import "css/slycat.scss";

import client from "js/slycat-web-client";
import React from "react";
import { createRoot } from "react-dom/client";

// These next 2 lines are required render the navbar using knockout. Remove them once we convert it to react.
import ko from "knockout";
import ProjectsPage from "components/Projects/ProjectsPage";
import { AppStoreProvider, appStore, currentUserFromApi, setCurrentUser, setCurrentProject } from "store";

// Wait for document ready
$(document).ready(function () {
  // First we do a simple api call for the user to make sure we are authenticated
  // before going ahead with loading the navbar, which makes a bunch more
  // api calls.
  client
    .get_user_fetch()
    // Once we have got the user, thus verified authentication, we import the navbar JS.
    .then((user) =>
      import(/* webpackChunkName: "slycat-navbar" */ "js/slycat-navbar").then((navbar) => ({
        navbar,
        user,
      })),
    )
    // Once the navbar is loaded, we render it and load the list of projects.
    .then(({ navbar, user }) => {
      navbar.renderNavBar();
      appStore.dispatch(setCurrentUser(currentUserFromApi(user)));
      appStore.dispatch(setCurrentProject(null));
      client.get_projects({
        success: function (result) {
          const projects_list = (
            <AppStoreProvider>
              <ProjectsPage projects={result.projects} />
            </AppStoreProvider>
          );
          const projects_list_root = createRoot(document.getElementById("slycat-projects"));
          projects_list_root.render(projects_list);
        },
        error: function (request, status, reason_phrase) {
          console.log("Unable to retrieve project.");
        },
      });

      // These next 2 lines render the navbar using knockout. Remove them once we convert it to react.
      var page = {};
      ko.applyBindings(page, document.querySelector("html"));
    })
    .catch((error) => {
      console.log(`Can't retrieve current user before loading the navbar. Error was: ${error}`);
    });
});

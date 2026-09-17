/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import "css/slycat-bootstrap.scss";
import "css/slycat.scss";

import ProjectPage from "components/Project/ProjectPage";
import client from "js/slycat-web-client";
// The next line is required render the navbar using knockout. Remove it once we convert to react.
import ko from "knockout";
import React from "react";
import { createRoot } from "react-dom/client";
import URI from "urijs";
import { AppStoreProvider, appStore, currentUserFromApi, setCurrentUser, setCurrentProject } from "store";

// Wait for document ready
$(() => {
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
    // Once the navbar is loaded, we render it and continue rendering the rest of the page.
    .then(({ navbar, user }) => {
      navbar.renderNavBar();
      appStore.dispatch(setCurrentUser(currentUserFromApi(user)));
      // Get the project ID from the URL
      const projectId = URI(window.location).segment(-1);
      // Set the page title by getting the project and appending to its name
      client.get_project({
        pid: projectId,
        success(projectResult) {
          document.title = `${projectResult.name} - Slycat Project`;
          appStore.dispatch(
            setCurrentProject({
              _id: projectResult._id,
              acl: projectResult.acl,
            }),
          );
          // After getting the project, get the models and render the ProjectPage into #slycat-project-react
          client.get_project_models({
            pid: projectId,
            success(modelsResult) {
              // eslint-disable-next-line react/jsx-filename-extension
              const projectPage = (
                <AppStoreProvider>
                  <ProjectPage projectId={projectId} models={modelsResult} />
                </AppStoreProvider>
              );
              const root = createRoot(document.getElementById("slycat-project-react"));
              root.render(projectPage);
            },
            error() {
              console.log("Unable to retrieve project models.");
            },
          });
        },
        error() {
          console.log("Unable to retrieve project.");
        },
      });

      // TODO: These next 2 lines render the navbar using knockout. Remove them once we convert it to react.
      const page = { project_id: projectId };
      ko.applyBindings(page, document.querySelector("html"));
    })
    .catch((error) => {
      console.log(`Can't retrieve current user before loading the navbar. Error was: ${error}`);
    });
});

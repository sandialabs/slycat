/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import ko from "knockout";
import mapping from "knockout-mapping";
import editUI from "./edit-ui.html";
import { SLYCAT_AUTH_LABELS } from "utils/ui-labels";
import "@fortawesome/fontawesome-free/css/all.css";

function constructor(params) {
  var component = {};
  component.slycatAuthLabelUsername = SLYCAT_AUTH_LABELS.username;
  component.project = params.projects()[0];
  component.modified = mapping.fromJS(mapping.toJS(component.project));
  component.permission = ko.observable("reader");
  component.permission_description = ko.pureComputed(function () {
    if (component.permission() == "reader") return "Readers can view all data in a project.";
    if (component.permission() == "writer")
      return "Writers can view all data in a project, and add, modify, or delete models.";
    if (component.permission() == "administrator")
      return "Administrators can view all data in a project, add, modify, and delete models, modify or delete the project, and add or remove project members.";
  });
  component.new_user = ko.observable("");

  component.user = ko.observable({});
  client.get_user({
    success: function (user) {
      component.user(user);
    },
  });

  // Call add_project_memeber if enter key is pressed
  component.username_enter_key = function (metadata, event) {
    if (event.keyCode == 13) {
      component.add_project_member();
    } else {
      return true;
    }
  };

  component.add_project_member = function (formElement) {
    // Validating
    formElement.classList.add("was-validated");

    // If valid...
    if (formElement.checkValidity() === true) {
      // Clearing form validation
      formElement.classList.remove("was-validated");
      // Updating project members
      client.get_user({
        uid: component.new_user(),
        success: function (user) {
          if (component.permission() == "reader") {
            dialog.confirm({
              title: "Add Project Reader",
              message:
                "Add " +
                user.name +
                " to the project?  They will have read access to all project data.",
              ok: function () {
                component.remove_user(user.uid);
                component.modified.acl.readers.push({ user: ko.observable(user.uid) });
                // Clear new user name because you won't want to add them twice
                component.new_user("");
              },
            });
          }
          if (component.permission() == "writer") {
            dialog.confirm({
              title: "Add Project Writer",
              message:
                "Add " +
                user.name +
                " to the project?  They will have read and write access to all project data.",
              ok: function () {
                component.remove_user(user.uid);
                component.modified.acl.writers.push({ user: ko.observable(user.uid) });
                // Clear new user name because you won't want to add them twice
                component.new_user("");
              },
            });
          }
          if (component.permission() == "administrator") {
            dialog.confirm({
              title: "Add Project Administrator",
              message:
                "Add " +
                user.name +
                " to the project?  They will have read and write access to all project data, and will be able to add and remove other project members.",
              ok: function () {
                component.remove_user(user.uid);
                component.modified.acl.administrators.push({ user: ko.observable(user.uid) });
                // Clear new user name because you won't want to add them twice
                component.new_user("");
              },
            });
          }
        },
        error: function (request, status, reason_phrase) {
          if (request.status == 404) {
            dialog.dialog({
              title: "Unknown User",
              message:
                "User '" +
                component.new_user() +
                "' couldn't be found.  Ensure that you correctly entered their id, not their name.",
            });
          } else {
            dialog.dialog({
              title: "Error retrieving user information",
              message: reason_phrase,
            });
          }
        },
      });
    }
  };

  component.remove_user = function (user) {
    component.modified.acl.readers.remove(function (item) {
      return item.user() == user;
    });
    component.modified.acl.writers.remove(function (item) {
      return item.user() == user;
    });
    component.modified.acl.administrators.remove(function (item) {
      return item.user() == user;
    });
  };

  component.remove_project_member = function (context) {
    if (component.user().name === context.user()) {
      dialog.confirm({
        title: "Warning!",
        message:
          "You are removing yourself as an administrator. \
          If you do this and save changes, you will be unable to access this project.",
        ok: function () {
          component.remove_user(context.user());
        },
      });
    } else {
      component.remove_user(context.user());
    }
  };

  component.save_project = function (formElement) {
    // Validating
    formElement.classList.add("was-validated");

    // If valid...
    if (formElement.checkValidity() === true) {
      // Clearing form validation
      formElement.classList.remove("was-validated");
      // Updating project
      client.put_project({
        pid: component.project._id(),
        name: mapping.toJS(component.modified.name),
        description: mapping.toJS(component.modified.description),
        acl: mapping.toJS(component.modified.acl),
        success: function () {
          window.location.reload(true);
        },
        error: dialog.ajax_error("Error updating project."),
      });
    }
  };

  component.delete_project_cache = function () {
    client.delete_project_cache({
      pid: component.project._id(),
      success: function () {},
      error: dialog.ajax_error("Error updating project."),
    });
    console.log("!!");
  };
  return component;
}

export default {
  viewModel: constructor,
  template: editUI,
};

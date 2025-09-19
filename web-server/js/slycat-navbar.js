"use strict";
/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

// Global css resources loaded here
import "css/slycat-bootstrap.scss";
import "@fortawesome/fontawesome-free/css/all.css";
import "css/slycat.scss";

import server_root from "js/slycat-server-root";
import api_root from "js/slycat-api-root";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import model_names from "js/slycat-model-names";
import ko from "knockout";
import mapping from "knockout-mapping";
import "@asielick/knockout-projections";
import ispasswordrequired from "js/slycat-server-ispasswordrequired";
import "js/slycat-nag";
import slycatNavbar from "templates/slycat-navbar.html";
import slycatBookmarkItem from "templates/slycat-bookmark-item.html";
import "js/slycat-plugins";
// Under Bootstrap 3, we couldn't import bootstrap here because it broke models,
// which are dynamically imported and also contain bootstrap, and it seemed to clash with this one.
// However, we were able to import bootstrap's modal js file, since the navbar uses it to create dialogs for wizards.
// import "bootstrap/js/dist/modal";
// Under Bootstrap 4, we seem to be able to import it here and need it to create popovers on the breadcrumbs.
import "bootstrap";
import { SLYCAT_AUTH_LABELS } from "utils/ui-labels";

import config from "config.json";

export function renderNavBar() {
  // Let's check to see if we have a session by trying to retrieve the projects list.
  // If we get redirected, it likely means we don't have a session, so let's take the user
  // to the login page.
  fetch(api_root + "projects_list" + "?_=" + new Date().getTime(), {
    redirect: "error",
    credentials: "same-origin",
    cache: "no-store",
  }).catch((error) => {
    console.log(
      "we are being redirected or have another type of error, so let's go to the login page",
    );
    ispasswordrequired.slycat_passwordrequired()
      ? (window.location.href = "/login/slycat-login.html?from=" + window.location.href)
      : (window.location.href = "/projects");
  });

  // Register bookmark item component for reuse
  ko.components.register("slycat-bookmark-item", {
    viewModel: function (params) {
      this.name = params.name;
      this.model_name = params.model_name;
      this.model_type = params.model_type;
      this.uri = params.uri;
      this.model_names = params.model_names;
      this.onEdit = params.onEdit || function () {};
      this.onDelete = params.onDelete || function () {};
      this.showControls = params.showControls || false;
      this.classNames = params.classNames || "";
    },
    template: slycatBookmarkItem,
  });

  ko.components.register("slycat-navbar", {
    viewModel: function (params) {
      var refreshTimer = setInterval(checkCookie, 60000);

      function checkCookie() {
        var myCookie = getCookie("slycattimeout");
        if (myCookie == null) {
          ispasswordrequired.slycat_passwordrequired()
            ? (window.location.href = "/login/slycat-login.html?from=" + window.location.href)
            : (window.location.href = "/projects");
        }
      }

      function getCookie(name) {
        var dc = document.cookie;
        var prefix = name + "=";
        var begin = dc.indexOf("; " + prefix);
        if (begin == -1) {
          begin = dc.indexOf(prefix);
          if (begin != 0) return null;
        } else {
          begin += 2;
          var end = document.cookie.indexOf(";", begin);
          if (end == -1) {
            end = dc.length;
          }
        }
        return unescape(dc.substring(begin + prefix.length, end));
      }

      var component = this;
      component.server_root = server_root;
      component.server_friendly_name =
        config.server_friendly_name != undefined ? config.server_friendly_name : "Slycat";
      component.model_names = model_names;
      component.ispasswordrequired = ispasswordrequired;

      // Keep track of the current project, if any.
      component.project_id = ko.observable(params.project_id);
      component.project = ko.observableArray();
      component.project_models = mapping.fromJS([]);
      // Setting git version, branch, and commit hash from globals created in webpack.common.js with DefinePlugin
      component.GIT_SLYCAT_VERSION = GIT_SLYCAT_VERSION;
      component.GIT_SLYCAT_BRANCH = GIT_SLYCAT_BRANCH;
      component.GIT_SLYCAT_COMMITHASH = GIT_SLYCAT_COMMITHASH;

      // Adding UI labels
      component.slycatAuthLabelUsername = SLYCAT_AUTH_LABELS.username;
      component.slycatAuthLabelPassword = SLYCAT_AUTH_LABELS.password;
      component.slycatAuthLabelSignIn = SLYCAT_AUTH_LABELS.signIn;
      component.slycatAuthLabelSignOut = SLYCAT_AUTH_LABELS.signOut;

      // Retrieve current project, if any.
      if (component.project_id()) {
        client.get_project({
          pid: component.project_id(),
          success: function (result) {
            component.project.push(mapping.fromJS(result));
            client.get_project_models({
              pid: component.project_id(),
              success: function (result) {
                mapping.fromJS(result, component.project_models);
                // Initialize popovers
                $('[data-bs-toggle="popover"]').popover();
              },
              error: function (request, status, reason_phrase) {
                console.log("Unable to retrieve project models.");
              },
            });
          },
          error: function (request, status, reason_phrase) {
            alert("Unable to retrieve project.");
            window.location.href = "/projects";
          },
        });
      }

      component.relation = ko.pureComputed(function () {
        if (component.project()[0]) {
          var users = component.project()[0].acl;
          var get_name = function (x) {
            return x.user();
          };
          var roles = {
            server_administrator: users.server_administrators
              ? users.server_administrators().map(get_name)
              : [],
            administrator: users.administrators().map(get_name),
            writer: users.writers().map(get_name),
            reader: users.readers().map(get_name),
          };
          for (var role in roles) {
            if (roles[role].indexOf(component.user.uid()) != -1) {
              if (role === "server_administrator") {
                return "administrator";
              }
              return role;
            }
          }
        }
        return "none";
      });

      // Keep track of the current model, if any.
      component.model_id = ko.observable(params.model_id);
      component.model = ko.observableArray();

      // Retrieve current model, if any.
      if (component.model_id()) {
        client.get_model({
          mid: component.model_id(),
          success: function (result) {
            component.model.push(mapping.fromJS(result));
          },
          error: function (request, status, reason_phrase) {
            console.log("Unable to retrieve model.");
          },
        });
      }

      component.navbar_popover = ko.pureComputed(function () {
        var projectInfo = "";
        if (component.project().length) {
          var project = component.project()[0];
          projectInfo += "<b>Project: </b> ";
          projectInfo += "<span>" + project.name() + "</span>";
          var members = [];
          for (var i = 0; i != project.acl.administrators().length; ++i)
            members.push(project.acl.administrators()[i].user());
          for (var i = 0; i != project.acl.writers().length; ++i)
            members.push(project.acl.writers()[i].user());
          for (var i = 0; i != project.acl.readers().length; ++i)
            members.push(project.acl.readers()[i].user());
          if (project.description())
            projectInfo +=
              "<div><small><b>Description:</b> " + project.description() + "</small></div>";
          projectInfo += "<div><small><b>Members:</b> " + members.join(",") + "</small>";
          projectInfo +=
            "<br /><small><b>Created:</b> " +
            project.created() +
            " by " +
            project.creator() +
            "</small></div>";
        }
        if (component.model().length) {
          var model = component.model()[0];
          projectInfo += "<br /><b>Model: </b> ";
          projectInfo += "<span>" + model.name() + "<span>";
          if (model.description())
            projectInfo +=
              "<div><small><b>Description:</b> " + model.description() + "</small></div>";
          projectInfo +=
            "<p><small><b>Created:</b> " +
            model.created() +
            " by " +
            model.creator() +
            "</small></p>";
        }

        return projectInfo;
      });

      component.model_alerts = ko.pureComputed(function () {
        var alerts = [];

        var models = component.model();
        for (var i = 0; i != models.length; ++i) {
          var model = models[i];

          if (model.state() == "waiting")
            alerts.push({
              type: "info",
              message: "The model is waiting for data to be uploaded.",
              detail: null,
            });

          if (model.state() == "running")
            alerts.push({
              type: "success",
              message: "The model is being computed.  Patience...",
              detail: null,
            });

          if (model.result && model.result() == "failed")
            alerts.push({
              type: "danger",
              message: "Model failed to build.  Here's what was happening when things went wrong:",
              detail: model.message(),
            });
        }

        return alerts;
      });

      // Reload model when it closes
      var modelSubscription = component.model.subscribe(function (newValue) {
        if (component.model().length == 1) {
          // Terminating subscription
          modelSubscription.dispose();
        }
      });

      // If the current model is finished, close it.
      component.close_model = function (model) {
        client.put_model({
          mid: model._id(),
          state: "closed",
          success: function () {
            // Reload browser page for timeseries models only
            if (model["model-type"]() == "timeseries") {
              // console.log('Reloading page since this is a timeseries model');
              window.location.reload(true);
            }
            // else {
            //   console.log('Not reloading page for non-timeseries models');
            // }
          },
        });
      };

      component.model
        .filter(function (model) {
          return model.state() == "finished";
        })
        .map(function (model) {
          component.close_model(model);
        });

      // Get the set of available wizards.
      component.wizards = mapping.fromJS([]);

      client.get_configuration_wizards({
        success: function (wizards) {
          wizards.sort(function (left, right) {
            return left.label < right.label ? -1 : left.label > right.label ? 1 : 0;
          });

          mapping.fromJS(wizards, component.wizards);
          // Alex commenting out because automatically registering knockout components breaks under webpack.
          // Webpack expects to package all modules at build time, while this approach tries to load modules at runtime.
          // Front-end plugin registration is now being done in 'js/slycat-plugins'
          // for(var i = 0; i != wizards.length; ++i)
          // {
          //   ko.components.register(wizards[i].type,
          //   {
          //     require: component.server_root + "resources/wizards/" + wizards[i].type + "/ui.js"
          //   });
          //   console.log("registering: " + wizards[i].type);
          // }
        },
      });

      var filter_by_action = function (action, callback) {
        var extra_filters =
          callback ||
          function () {
            return true;
          };
        return function (wizard) {
          return wizard.require.action() === action && extra_filters(wizard);
        };
      };

      // var create_wizards = component.wizards.filter(filter_by_action("create"));
      var create_wizards = component.wizards.filter(
        filter_by_action("create", function (wizard) {
          // Readers are prevented from creating anything at the model or project level
          if (
            component.relation() === "reader" &&
            (wizard.require.context() === "model" || wizard.require.context() === "project")
          ) {
            return false;
          } else {
            return true;
          }
        }),
      );
      var edit_wizards = component.wizards.filter(
        filter_by_action("edit", function (wizard) {
          // Editing is permitted only to administrators. Also to writers at the model level.
          return (
            component.relation() === "administrator" ||
            (component.relation() === "writer" && wizard.require.context() === "model")
          );
        }),
      );
      // var edit_wizards = component.wizards.filter(filter_by_action("edit"));
      var info_wizards = component.wizards.filter(filter_by_action("info"));
      var delete_wizards = component.wizards.filter(
        filter_by_action("delete", function (wizard) {
          // Writers and readers are prevented from deleting projects
          if (
            wizard.require.context() === "project" &&
            (component.relation() === "writer" || component.relation() === "reader")
          ) {
            return false;
          }
          // Readers are prevented from deleting models
          else if (wizard.require.context() === "model" && component.relation() === "reader") {
            return false;
          } else {
            return true;
          }
        }),
      );

      var global_wizard_filter = function (wizard) {
        return wizard.require.context() === "global";
      };
      var project_wizard_filter = function (wizard) {
        return (
          wizard.require.context() === "project" && component.project_id() && !component.model_id()
        );
      };
      var model_wizard_filter = function (wizard) {
        if (
          "model-type" in wizard.require &&
          component.model().length &&
          wizard.require["model-type"].indexOf(component.model()[0]["model-type"]()) == -1
        )
          return false;
        return (
          wizard.require.context() === "model" &&
          component.model_id() &&
          wizard.type() !== "slycat-create-saved-bookmark"
        );
      };
      var bookmark_wizard_filter = function (wizard) {
        if (
          "model-type" in wizard.require &&
          component.model().length &&
          wizard.require["model-type"].indexOf(component.model()[0]["model-type"]()) == -1
        )
          return false;
        return (
          wizard.require.context() === "model" &&
          component.model_id() &&
          wizard.type() === "slycat-create-saved-bookmark"
        );
      };
      component.global_create_wizards = create_wizards.filter(global_wizard_filter);
      component.project_create_wizards = create_wizards.filter(project_wizard_filter);
      component.model_create_wizards = create_wizards.filter(model_wizard_filter);
      component.global_edit_wizards = edit_wizards.filter(global_wizard_filter);
      component.project_edit_wizards = edit_wizards.filter(project_wizard_filter);
      component.model_edit_wizards = edit_wizards.filter(model_wizard_filter);
      component.project_info_wizards = info_wizards.filter(project_wizard_filter);
      component.model_info_wizards = info_wizards.filter(model_wizard_filter);
      component.model_bookmark_wizards = create_wizards.filter(bookmark_wizard_filter);
      component.global_delete_wizards = delete_wizards.filter(global_wizard_filter);
      component.project_delete_wizards = delete_wizards.filter(project_wizard_filter);
      component.model_delete_wizards = delete_wizards.filter(model_wizard_filter);
      component.wizard = ko.observable(false);
      component.show_wizard = ko.observable(false).extend({ notify: "always" });
      component.show_wizard.subscribe(function (value) {
        $("#slycat-wizard").modal(value ? "show" : "hide");
        // Updating references when wizard is hidden because a new bookmark may have been created.
        if (value == false) {
          component.update_references();
        }
      });

      // Get information about the current user.
      component.user = mapping.fromJS({ uid: "", name: "" });
      client.get_user({
        success: function (user) {
          mapping.fromJS(user, component.user);
        },
      });

      // Keep track of information about the current server version.
      component.version = mapping.fromJS({ version: "unknown", commit: "unknown" });

      component.run_wizard = function (item) {
        component.wizard(false);
        component.wizard(item.type());
        component.show_wizard(true);
      };

      component.about = function () {
        client.get_configuration_version({
          success: function (version) {
            mapping.fromJS(version, component.version);
          },
        });

        $("#slycat-about").modal("show");
      };

      component.support_request = function () {
        client.get_configuration_support_email({
          success: function (email) {
            window.location.href = "mailto:" + email.address + "?subject=" + email.subject;
          },
        });
      };

      component.open_documentation = function () {
        window.open("/docs/index.html");
      };

      var references = mapping.fromJS([]);

      component.saved_project_bookmarks = references
        .filter(function (reference) {
          if (component.model_id() === undefined) return reference.bid() && reference.mid();
          else return reference.bid() && reference.mid() && reference.mid() != component.model_id();
        })
        .map(function (reference) {
          var model = ko.utils.arrayFirst(component.project_models(), function (model) {
            return model._id() == reference.mid();
          });

          return {
            _id: reference._id,
            name: reference.name,
            model_name: model ? model.name() : "",
            model_type: reference["model-type"] ? reference["model-type"]() : "",
            created: reference.created,
            creator: reference.creator,
            uri: server_root + "models/" + reference.mid() + "?bid=" + reference.bid(),
          };
        });

      component.saved_model_bookmarks = references
        .filter(function (reference) {
          if (component.model_id() === undefined) return false;
          else return reference.bid() && reference.mid() && reference.mid() == component.model_id();
        })
        .map(function (reference) {
          var model = ko.utils.arrayFirst(component.project_models(), function (model) {
            return model._id() == reference.mid();
          });

          return {
            _id: reference._id,
            name: reference.name,
            model_name: model ? model.name() : "",
            model_type: reference["model-type"] ? reference["model-type"]() : "",
            created: reference.created,
            creator: reference.creator,
            uri: server_root + "models/" + reference.mid() + "?bid=" + reference.bid(),
          };
        });

      component.edit_saved_bookmark = function (reference) {
        var name = ko.observable(reference.name());
        dialog.prompt({
          title: "Edit Bookmark",
          value: name,
          buttons: [
            { className: "btn-light", label: "Cancel" },
            { className: "btn-danger", label: "OK" },
          ],
          callback: function (button) {
            if (!button || button.label != "OK") {
              return;
            }
            client.put_reference({
              rid: reference._id(),
              name: name(),
              success: function () {
                component.update_references();
              },
              error: dialog.ajax_error("Couldn't edit bookmark."),
            });
          },
        });
      };

      component.delete_saved_bookmark = function (reference) {
        dialog.dialog({
          title: "Delete Saved Bookmark?",
          message:
            "The saved bookmark will be deleted immediately and there is no undo.  This will not affect any existing models or bookmarks.",
          buttons: [
            { className: "btn-primary", label: "Cancel" },
            { className: "btn-danger", label: "OK" },
          ],
          callback: function (button) {
            if (!button || button.label != "OK") return;
            client.delete_reference({
              rid: reference._id(),
              success: function () {
                component.update_references();
              },
              error: dialog.ajax_error("Couldn't delete bookmark."),
            });
          },
        });
      };

      component.update_references = function () {
        if (component.project_id()) {
          client.get_project_references({
            pid: component.project_id(),
            success: function (result) {
              mapping.fromJS(result, references);
            },
          });
        }
      };

      component.update_references();
      component.sign_out = function () {
        client.sign_out({
          success: function () {
            window.location.href =
              server_root + "login/slycat-login.html?from=" + window.location.href;
          },
          error: function () {
            window.alert("Sorry, something went wrong and you are not signed out.");
          },
        });
      };
    },
    template: slycatNavbar,
  });
}

/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import ko from "knockout";
import mapping from "knockout-mapping";
import editUI from "./edit-ui.html";
import "./edit-ui.css";
import { SLYCAT_AUTH_LABELS } from "utils/ui-labels";
import "@fortawesome/fontawesome-free/css/all.css";
import api_root from "js/slycat-api-root";

var METAGROUP_RESULT_LIMIT = 25;
var METAGROUP_SEARCH_DEBOUNCE_MS = 250;

var MOCK_ORG_UNITS = [
  "North",
  "South",
  "East",
  "West",
  "Central",
  "Alpha",
  "Beta",
  "Gamma",
  "Delta",
  "Omega",
];
var MOCK_DOMAINS = [
  "Acoustics",
  "Aerodynamics",
  "Chemistry",
  "Climate",
  "Combustion",
  "Controls",
  "Electromagnetics",
  "Geoscience",
  "Hydrology",
  "Imaging",
  "Kinetics",
  "Logistics",
  "Metrology",
  "Nuclear",
  "Optics",
  "Plasma",
  "Robotics",
  "Structures",
  "Thermodynamics",
  "Uncertainty",
];

function debounce(fn, wait) {
  var timer = null;
  return function () {
    var context = this;
    var args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(context, args);
    }, wait);
  };
}

function constructor(params) {
  var component = {};
  component.slycatAuthLabelUsername = SLYCAT_AUTH_LABELS.username;
  component.project = params.projects()[0];
  component.modified = mapping.fromJS(mapping.toJS(component.project));
  component.tab = ko.observable(0);
  component.permission = ko.observable("reader");
  component.permission_description = ko.pureComputed(function () {
    if (component.permission() == "reader") return "Readers can view all data in a project.";
    if (component.permission() == "writer")
      return "Writers can view all data in a project, and add, modify, or delete models.";
    if (component.permission() == "administrator")
      return "Administrators can view all data in a project, add, modify, and delete models, modify or delete the project, and add or remove project members.";
  });
  component.new_user = ko.observable("");

  // Metagroups (UI-only prototype; not persisted with save_project)
  component.metagroup_permission = ko.observable("reader");
  component.metagroup_permission_description = ko.pureComputed(function () {
    if (component.metagroup_permission() == "reader")
      return "Reader metagroups can view all data in a project.";
    if (component.metagroup_permission() == "writer")
      return "Writer metagroups can view all data in a project, and add, modify, or delete models.";
  });
  component.metagroup_search = ko.observable("");
  component.metagroup_search_query = ko.observable("");
  component.selected_metagroup = ko.observable(null);
  component.metagroup_readers = ko.observableArray([]);
  component.metagroup_writers = ko.observableArray([]);

  component.assigned_metagroup_names = ko.pureComputed(function () {
    var assigned = {};
    component.metagroup_readers().forEach(function (item) {
      assigned[item.name()] = true;
    });
    component.metagroup_writers().forEach(function (item) {
      assigned[item.name()] = true;
    });
    return assigned;
  });
  component.metagroup_search_results = ko.observableArray([]);
  component.metagroup_search_loading = ko.observable(false);
  component.metagroup_search_error = ko.observable(null);
  var latestSearchId = 0;
  // wait until the user stops typing before searching
  component.metagroup_search_query = ko
    .observable("")
    .extend({ rateLimit: { timeout: 800, method: "notifyWhenChangesStop" } });
  // perform the actual search for groups
  component.metagroup_search_query.subscribe(function (newQuery) {
    var query = (newQuery || "").trim();
    var searchId = ++latestSearchId;

    component.metagroup_search_error(null);

    if (!query) {
      component.metagroup_search_results([]);
      component.metagroup_search_loading(false);
      return;
    }

    component.metagroup_search_loading(true);

    fetch(api_root + "groups/" + encodeURIComponent(query))
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Group search failed with status " + response.status);
        }

        return response.json();
      })
      .then(function (groups) {
        // Ignore stale responses if the user typed another query before this returned.
        if (searchId !== latestSearchId) {
          return;
        }

        var matches = groups.map(function (group) {
          return {
            name: group.name,
            owner: group.owner,
            memberCount: group.member_count,
          };
        });

        component.metagroup_search_results(matches);
      })
      .catch(function (error) {
        if (searchId !== latestSearchId) {
          return;
        }

        component.metagroup_search_error(error);
        component.metagroup_search_results([]);
      })
      .then(function () {
        if (searchId === latestSearchId) {
          component.metagroup_search_loading(false);
        }
      });
  });

  component.metagroup_search_helper = ko.pureComputed(function () {
    var query = (component.metagroup_search_query() || "").trim();
    if (!query) {
      return "Type to search metagroups.";
    }
    if (component.metagroup_search_results().length === 0) {
      return "No metagroups match your search.";
    }
    return "";
  });

  var applyMetagroupSearch = debounce(function (value) {
    component.metagroup_search_query(value);
    var selected = component.selected_metagroup();
    if (selected) {
      var stillVisible = component.metagroup_search_results().some(function (group) {
        return group.name === selected.name;
      });
      if (!stillVisible) {
        component.selected_metagroup(null);
      }
    }
  }, METAGROUP_SEARCH_DEBOUNCE_MS);

  component.metagroup_search.subscribe(applyMetagroupSearch);

  component.select_metagroup = function (group) {
    component.selected_metagroup(group);
  };

  component.is_metagroup_selected = function (group) {
    var selected = component.selected_metagroup();
    return selected && selected.name === group.name;
  };

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

  component.remove_metagroup = function (name) {
    component.metagroup_readers.remove(function (item) {
      return item.name() == name;
    });
    component.metagroup_writers.remove(function (item) {
      return item.name() == name;
    });
  };

  component.clear_metagroup_selection = function () {
    component.selected_metagroup(null);
    component.metagroup_search("");
    component.metagroup_search_query("");
  };

  component.add_project_metagroup = function () {
    var selected = component.selected_metagroup();
    if (!selected) {
      return;
    }
    var name = selected.name;

    if (component.metagroup_permission() == "reader") {
      dialog.confirm({
        title: "Add Project Reader Metagroup",
        message:
          "Add metagroup '" +
          name +
          "' to the project?  Members of this group will have read access to all project data.",
        ok: function () {
          component.remove_metagroup(name);
          component.metagroup_readers.push({ name: ko.observable(name) });
          component.clear_metagroup_selection();
        },
      });
    }
    if (component.metagroup_permission() == "writer") {
      dialog.confirm({
        title: "Add Project Writer Metagroup",
        message:
          "Add metagroup '" +
          name +
          "' to the project?  Members of this group will have read and write access to all project data.",
        ok: function () {
          component.remove_metagroup(name);
          component.metagroup_writers.push({ name: ko.observable(name) });
          component.clear_metagroup_selection();
        },
      });
    }
  };

  component.metagroup_row_dblclick = function (group) {
    component.selected_metagroup(group);
    component.add_project_metagroup();
  };

  component.metagroup_search_keydown = function (data, event) {
    if (event.keyCode == 13) {
      if (component.selected_metagroup()) {
        component.add_project_metagroup();
      }
      return false;
    }
    return true;
  };

  component.remove_project_metagroup = function (context) {
    component.remove_metagroup(context.name());
  };

  component.save_project = function (formElement) {
    // Validating
    formElement.classList.add("was-validated");

    // If valid...
    if (formElement.checkValidity() === true) {
      // Clearing form validation
      formElement.classList.remove("was-validated");
      // Updating project (user ACL only; metagroups are prototype-only)
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

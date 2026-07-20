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

var METAGROUP_RESULT_LIMIT = 25;
var METAGROUP_SEARCH_DEBOUNCE_MS = 250;

// Mock LDAP metagroup catalog for the UI prototype. Replace with API results later.
var MOCK_METAGROUP_SEED = [
  {
    name: "Engineering",
    description: "Mechanical and electrical engineering staff",
    memberCount: 142,
  },
  {
    name: "Analysts",
    description: "Data analysis and modeling practitioners",
    memberCount: 87,
  },
  { name: "QA-Team", description: "Quality assurance and test engineers", memberCount: 34 },
  {
    name: "Operations",
    description: "Production operations and site support",
    memberCount: 219,
  },
  {
    name: "Research",
    description: "Research scientists and principal investigators",
    memberCount: 56,
  },
  {
    name: "Simulation-Users",
    description: "Users of high-performance simulation codes",
    memberCount: 310,
  },
  {
    name: "Visualization",
    description: "Visualization specialists and designers",
    memberCount: 28,
  },
  {
    name: "Materials-Science",
    description: "Materials science research group",
    memberCount: 63,
  },
  {
    name: "Computational-Physics",
    description: "Computational physics modeling team",
    memberCount: 91,
  },
  {
    name: "Security-Reviewers",
    description: "Security and export-control reviewers",
    memberCount: 15,
  },
];

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

function buildMockMetagroups() {
  var catalog = MOCK_METAGROUP_SEED.slice();
  var i;
  var j;
  var domain;
  var unit;
  var name;
  for (i = 0; i < MOCK_DOMAINS.length; i++) {
    domain = MOCK_DOMAINS[i];
    for (j = 0; j < MOCK_ORG_UNITS.length; j++) {
      unit = MOCK_ORG_UNITS[j];
      name = domain + "-" + unit;
      catalog.push({
        name: name,
        description: domain + " collaboration group for the " + unit + " organization",
        memberCount: 5 + ((i * 17 + j * 13) % 480),
      });
    }
  }
  return catalog;
}

var MOCK_METAGROUPS = buildMockMetagroups();

function fuzzyMatch(query, text) {
  if (!query) {
    return false;
  }
  var haystack = (text || "").toLowerCase();
  var needle = query.toLowerCase();
  if (haystack.indexOf(needle) !== -1) {
    return true;
  }
  // Character-sequence match: all query chars appear in order
  var qi = 0;
  var hi;
  for (hi = 0; hi < haystack.length && qi < needle.length; hi++) {
    if (haystack.charAt(hi) === needle.charAt(qi)) {
      qi++;
    }
  }
  return qi === needle.length;
}

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

  component.metagroup_search_results = ko.pureComputed(function () {
    var query = (component.metagroup_search_query() || "").trim();
    if (!query) {
      return [];
    }
    var assigned = component.assigned_metagroup_names();
    var matches = [];
    var i;
    var group;
    for (i = 0; i < MOCK_METAGROUPS.length; i++) {
      group = MOCK_METAGROUPS[i];
      if (assigned[group.name]) {
        continue;
      }
      if (fuzzyMatch(query, group.name) || fuzzyMatch(query, group.description)) {
        matches.push(group);
        if (matches.length >= METAGROUP_RESULT_LIMIT) {
          break;
        }
      }
    }
    return matches;
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

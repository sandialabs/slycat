/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import ko from "knockout";
import slycatLoginControls from "templates/slycat-login-controls.html";
import { REMOTE_AUTH_LABELS } from "utils/ui-labels";

ko.components.register("slycat-login-controls", {
  viewModel: {
    createViewModel: function (params, component_info) {
      var component = {};
      component.username = params.username;
      component.password = params.password;
      component.status = params.status || ko.observable(null);
      component.status_type = params.status_type || ko.observable(null);
      component.enable = params.enable || ko.observable(true);
      component.focus = params.focus || ko.observable(false);

      // Adding UI labels
      component.remoteAuthLabelUsername = REMOTE_AUTH_LABELS.username;
      component.remoteAuthLabelPassword = REMOTE_AUTH_LABELS.password;

      component.status_classes = ko.pureComputed(function () {
        var classes = [];
        if (component.status()) classes.push("fadein");
        if (component.status_type()) classes.push("alert-" + component.status_type());
        return classes.join(" ");
      });

      if (!component.username())
        component.username(localStorage.getItem("slycat-login-controls-username"));

      component.username.subscribe(function (value) {
        localStorage.setItem("slycat-login-controls-username", value);
        component.status(null);
      });

      component.password.subscribe(function (value) {
        component.status(null);
      });

      component.focus.subscribe(function (value) {
        var username = component.username();
        var password = component.password();
        var username_input = $(component_info.element).find("input").eq(0);
        var password_input = $(component_info.element).find("input").eq(1);

        if (value == true) {
          if (component.username()) {
            value = "password";
          } else {
            value = "username";
          }
        }

        if (value == "username") {
          username_input.focus();
          if (username) username_input.get(0).setSelectionRange(0, username.length);
        }
        if (value == "password") {
          password_input.focus();
          if (password) password_input.get(0).setSelectionRange(0, password.length);
        }
      });

      $(component_info.element)
        .find("input")
        .keydown(function (e) {
          if (e.which == 13 && params.activate) params.activate();
        });

      return component;
    },
  },
  template: slycatLoginControls,
});

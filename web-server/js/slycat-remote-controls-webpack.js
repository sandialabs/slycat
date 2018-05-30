/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import server_root from "./slycat-server-root";
import client from "./slycat-web-client-webpack";
import ko from "knockout";
import mapping from "knockout-mapping";
import ispasswordrequired from "./slycat-server-ispasswordrequired-webpack";
import slycatRemoteControls from "../templates/slycat-remote-controls.html";

ko.components.register("slycat-remote-controls",
{
  viewModel:
  {
    createViewModel: function(params, component_info)
    {
      var component = {};
      component.hostname = params.hostname;
      component.username = params.username;
      component.password = params.password;
      component.enable = params.enable || ko.observable(true);
      component.focus = params.focus || ko.observable(false);
      component.status = params.status || ko.observable(null);
      component.status_type = params.status_type || ko.observable(null);
      component.remote_hosts = mapping.fromJS([]);
      component.session_exists = params.session_exists;
      component.ispasswordrequired = ispasswordrequired;

      component.status_classes = ko.pureComputed(function()
      {
        var classes = [];
        if(component.status())
          classes.push("in");
        if(component.status_type())
          classes.push("alert-" + component.status_type());
        return classes.join(" ");
      });

      component.use_remote = function(remote_host)
      {
        component.hostname(remote_host.hostname());
      }

      if(!component.hostname())
        component.hostname(localStorage.getItem("slycat-remote-controls-hostname"));
      if(!component.username())
        component.username(localStorage.getItem("slycat-remote-controls-username"));

      component.hostname.subscribe(function(value)
      {
        localStorage.setItem("slycat-remote-controls-hostname", value);
        component.status(null);

        if(value != null && value.trim() != "")
        {
          client.get_remotes({
            hostname: value,
            success: function(result)
            {
              if(component.hostname() == value)
              {
                if(result.status)
                  component.session_exists(true);
                else
                  component.session_exists(false);
              }
            },
            error: function(request, status, reason_phrase)
            {
              if(component.hostname() == value)
                component.session_exists(false);
            }
          });
        }
        else
        {
          component.session_exists(false);
        }
      });

      component.username.subscribe(function(value)
      {
        localStorage.setItem("slycat-remote-controls-username", value);
        component.status(null);
      });

      component.password.subscribe(function(value)
      {
        component.status(null);
      });

      component.focus.subscribe(function(value)
      {
        var hostname = component.hostname();
        var username = component.username();
        var password = component.password();
        var hostname_input = $(component_info.element).find("input").eq(0);
        var username_input = $(component_info.element).find("input").eq(1);
        var password_input = $(component_info.element).find("input").eq(2);

        if(value == true)
        {
          if(component.hostname() && component.username())
          {
            value = "password";
          }
          else if(component.hostname())
          {
            value = "username";
          }
          else
          {
            value = "hostname";
          }
        }

        if(value == "hostname")
        {
          hostname_input.focus();
          if(hostname)
            hostname_input.get(0).setSelectionRange(0, hostname.length);
        }
        if(value == "username")
        {
          username_input.focus();
          if(username)
            username_input.get(0).setSelectionRange(0, username.length);
        }
        if(value == "password")
        {
          password_input.focus();
          if(password)
            password_input.get(0).setSelectionRange(0, password.length);
        }
      });

      $(component_info.element).find("input").keydown(function(e)
      {
        if(e.which == 13 && params.activate)
          params.activate();
      });

      client.get_configuration_remote_hosts(
      {
        success: function(remote_hosts)
        {
          var current_host = component.hostname();
          remote_hosts.sort(function(left, right)
          {
            return left.hostname == right.hostname ? 0 : left.hostname < right.hostname ? -1 : 1;
          });
          mapping.fromJS(remote_hosts, component.remote_hosts);
          component.hostname(current_host || component.hostname());
        }
      });

      return component;
    },
  },
  template: slycatRemoteControls
});
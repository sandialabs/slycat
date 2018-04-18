/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import server_root from './slycat-server-root';
import client from './slycat-web-client-webpack';
import ko from 'knockout';
import mapping from 'knockout-mapping';
import ispasswordrequired from './slycat-server-ispasswordrequired-webpack';
import template from '../templates/slycat-remote-login.html';

export function login(params)
{
  var component = {};
  component.cancel = function()
  {
    component.container.children().modal("hide");
    if(params.cancel)
      params.cancel();
  }
  component.login = function()
  {
    component.remote.enable(false);
    component.remote.status_type("info");
    component.remote.status("Connecting ...");
    client.post_remotes(
    {
      hostname: params.hostname,
      username: component.remote.username(),
      password: component.remote.password(),
      success: function(sid)
      {
        component.container.children().modal("hide");
        if(params.success)
          params.success(sid);
      },
      error: function(request, status, reason_phrase)
      {
        component.remote.enable(true);
        component.remote.status_type("danger");
        component.remote.status(reason_phrase);
        component.remote.focus("password");
      },
    });
  }
  component.title = ko.observable(params.title || "Login");
  component.message = ko.observable(params.message || "");
  component.remote = mapping.fromJS({username: null, password: null, status: null, enable: true, focus: false, status_type: null});
  component.remote.focus.extend({notify: "always"});
  component.container = $($.parseHTML(template)).appendTo($("body"));
  component.ispasswordrequired = ispasswordrequired;
  component.container.children().on("shown.bs.modal", function()
  {
    component.remote.focus(true);
  });
  component.container.children().on("hidden.bs.modal", function()
  {
    component.container.remove();
  });
  ko.applyBindings(component, component.container.get(0));
  component.container.children().modal("show");
}

export function create_pool()
{
  var remotes = {};

  var pool = {};

  pool.check_remote = function(params)
  {
    client.get_remotes({
      hostname: params.hostname,
      success: function(result)
      {
        if(params.success)
          params.success(result);
      },
      error: function(request, status, reason_phrase)
      {
        if(params.error)
          params.error(request, status, reason_phrase);
      }
    });
  }

  pool.get_remote = function(params)
  {
    pool.check_remote({
      hostname: params.hostname,
      get_remote_params: params,
      success: function(result)
      {
        if(result.status)
        {
          if(params.success)
            params.success(params.hostname);
          return;
        }
        else
        {
          login(
          {
            hostname: params.hostname,
            title: params.title,
            message: params.message,
            success: function(sid)
            {
              if(params.success)
                params.success(params.hostname);
            },
            cancel: function()
            {
              if(params.cancel)
                params.cancel();
            },
          });
        }
      },
      error: function(request, status, reason_phrase)
      {
        console.log("Unable to check status of remote session.");
        return;
      }
    });
  }

  pool.delete_remote = function(hostname)
  {
    if(hostname in remotes)
    {
      // Ignore any errors, the sid could have expired.
      client.delete_remote(
      {
        sid: remotes[hostname],
      });
      delete remotes[hostname];
    }
  }

  return pool;
}
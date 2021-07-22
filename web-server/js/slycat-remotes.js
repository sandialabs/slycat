/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import client from 'js/slycat-web-client';
import ko from 'knockout';
import mapping from 'knockout-mapping';
import ispasswordrequired from 'js/slycat-server-ispasswordrequired';
import template from 'templates/slycat-remote-login.html';
import "bootstrap";
import React from "react";
import ReactDOM from "react-dom";
import SmbAuthentication from 'components/SmbAuthentication.tsx';

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
    if(!params.smb) {
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
    else {
      client.post_remotes_smb_fetch({
        user_name: component.remote.username(),
        password: component.remote.password(),
        server: params.hostname,
        share: component.remote.share()
    }).then((response) => {
        console.log("authenticated.",response);
        if(response.ok){
          component.container.children().modal("hide");
          params.success(response.data.sid);
        } else {
          component.remote.enable(true);
          component.remote.status_type("danger");
          component.remote.focus("password");
        }
    }).catch((error)=>{
      component.remote.enable(true);
      component.remote.status_type("danger");
      //component.remote.status(reason_phrase);
      component.remote.focus("password");
    });
    }
  }
  component.title = ko.observable(params.title || "Login");
  component.message = ko.observable(params.message || "");
  component.remote = mapping.fromJS({username: null, password: null, status: null, enable: true, focus: false, status_type: null, share: null, session_exists: null});
  component.remote.focus.extend({notify: "always"});
  component.container = $($.parseHTML(template)).appendTo($("body"));
  component.ispasswordrequired = ispasswordrequired;
  component.smb = params.smb;
  component.container.children().on("shown.bs.modal", function()
  {
    component.remote.focus(true);
  });
  component.container.children().on("hidden.bs.modal", function()
  {
    component.container.remove();
  });
  ko.applyBindings(component, component.container.get(0));

  // If protocol is SMB, use the React login
  if(params.smb) {
    const setSmbAuthValues = function(hostname, username, password, share, session_exists) {
      //component.remote.hostname(hostname)
      component.remote.username(username)
      component.remote.password(password)
      component.remote.share(share)
      component.remote.session_exists(session_exists)
    }
    ReactDOM.render(
      <div>
        <SmbAuthentication
          loadingData={false}
          callBack={setSmbAuthValues}
        />
      </div>,
      document.querySelector(".smb-login")
    );
  }
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
            smb: params.smb,
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
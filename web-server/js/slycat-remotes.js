/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import client from "js/slycat-web-client";
import ko from "knockout";
import mapping from "knockout-mapping";
import ispasswordrequired from "js/slycat-server-ispasswordrequired";
import template from "templates/slycat-remote-login.html";
import "bootstrap";
import React from "react";
import { createRoot } from "react-dom/client";
import SmbAuthentication from "components/SmbAuthentication.tsx";
import SshAuthentication from "components/SshAuthentication.tsx";
import {
  applyRemoteLoginError,
  formatRemoteAuthError,
  postSmbSession,
  remoteAuthErrorFromResponse,
  remoteLoginDangerMessage,
} from "utils/remote-auth";
import { REMOTE_AUTH_LABELS } from "utils/ui-labels";

export function login(params) {
  var component = {};
  let smb_info = {};
  smb_info["hostname"] = params.hostname;
  smb_info["collab"] = params.collab_name;

  component.remoteAuthLabelSignIn = REMOTE_AUTH_LABELS.signIn;

  component.cancel = function () {
    component.container.children().modal("hide");
    if (params.cancel) params.cancel();
  };
  const connectRemote = function () {
    if (!component.remote.enable()) {
      return;
    }
    component.remote.enable(false);
    component.remote.status_type("info");
    component.remote.status("Connecting ...");
    renderLogin(true);
    if (!params.smb) {
      client.post_remotes({
        hostname: params.hostname,
        username: component.remote.username(),
        password: component.remote.password(),
        success: function (sid) {
          component.container.children().modal("hide");
          if (params.success) params.success(sid);
        },
        error: function (request, status, reason_phrase) {
          component.remote.enable(true);
          component.remote.status_type("danger");
          component.remote.status(
            formatRemoteAuthError({
              status: request.status,
              statusText: request.statusText || reason_phrase,
            }),
          );
          renderLogin(false);
        },
      });
    } else {
      postSmbSession({
        username: component.remote.username() || "",
        password: component.remote.password() || "",
        domain: component.remote.domain() || "",
        server: component.remote.hostname() || params.hostname,
        share: component.remote.share() || "",
      })
        .then(async (response) => {
          if (response.ok) {
            component.container.children().modal("hide");
            params.success(response.status);
          } else {
            const error = await remoteAuthErrorFromResponse(response);
            component.remote.enable(true);
            component.remote.status_type("danger");
            component.remote.status(formatRemoteAuthError(error));
            renderLogin(false);
          }
        })
        .catch(() => {
          component.remote.enable(true);
          component.remote.status_type("danger");
          component.remote.status(formatRemoteAuthError());
          renderLogin(false);
        });
    }
  };

  component.login = function () {
    if (!component.remote.enable()) {
      return;
    }
    const form = component.container.find("form.SshAuthentication, form.SmbAuthentication").get(0);
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
      return;
    }
    connectRemote();
  };

  component.title = ko.observable(params.title || "Login");
  component.message = ko.observable(params.message || "");
  component.remote = mapping.fromJS({
    hostname: params.hostname,
    username: null,
    password: null,
    status: null,
    enable: true,
    focus: false,
    status_type: null,
    share: params.collab_name,
    domain: null,
    session_exists: null,
  });
  component.remote.focus.extend({ notify: "always" });
  component.container = $($.parseHTML(template)).appendTo($("body"));
  component.ispasswordrequired = ispasswordrequired;
  component.smb = params.smb;
  let login_root = null;

  const setSmbAuthValues = function (values) {
    component.remote.hostname(values.hostname);
    component.remote.username(values.username);
    component.remote.password(values.password);
    component.remote.share(values.share);
    component.remote.domain(values.domain);
    component.remote.session_exists(values.sessionExists);
  };

  const onSmbAuthEnter = function (values) {
    setSmbAuthValues(values);
    connectRemote();
  };

  const setSshAuthValues = function (values) {
    component.remote.hostname(values.hostname);
    component.remote.username(values.username);
    component.remote.password(values.password);
    component.remote.session_exists(values.sessionExists);
  };

  const onSshAuthEnter = function (values) {
    setSshAuthValues(values);
    connectRemote();
  };

  const onRemoteLoginError = function (message) {
    applyRemoteLoginError(component.remote.status, component.remote.status_type, message);
  };

  const unmountLogin = function () {
    if (login_root) {
      login_root.unmount();
      login_root = null;
    }
  };

  const renderLogin = function (loadingData) {
    if (!login_root) {
      return;
    }
    if (params.smb) {
      login_root.render(
        <SmbAuthentication
          loadingData={loadingData}
          error={remoteLoginDangerMessage(component.remote.status_type(), component.remote.status())}
          onError={onRemoteLoginError}
          smbInfo={smb_info}
          onChange={setSmbAuthValues}
          onEnter={onSmbAuthEnter}
        />,
      );
    } else {
      login_root.render(
        <SshAuthentication
          hostnameMode="hidden"
          hostname={params.hostname}
          loadingData={loadingData}
          error={remoteLoginDangerMessage(component.remote.status_type(), component.remote.status())}
          onError={onRemoteLoginError}
          onChange={setSshAuthValues}
          onEnter={onSshAuthEnter}
        />,
      );
    }
  };

  const mountLogin = function () {
    const node = component.container.find(".remote-login").get(0);
    if (!node || login_root) {
      return;
    }
    login_root = createRoot(node);
    renderLogin(false);
  };

  component.container.children().on("shown.bs.modal", function () {
    mountLogin();
  });
  component.container.children().on("hidden.bs.modal", function () {
    unmountLogin();
    component.container.remove();
  });
  ko.applyBindings(component, component.container.get(0));
  component.container.children().modal("show");
}

export function create_pool() {
  var remotes = {};

  var pool = {};

  pool.check_remote = function (params) {
    client.get_remotes({
      hostname: params.hostname,
      success: function (result) {
        if (params.success) params.success(result);
      },
      error: function (request, status, reason_phrase) {
        if (params.error) params.error(request, status, reason_phrase);
      },
    });
  };

  pool.get_remote = function (params) {
    pool.check_remote({
      hostname: params.hostname,
      get_remote_params: params,
      success: function (result) {
        if (result.status) {
          if (params.success) params.success(params.hostname);
          return;
        } else {
          login({
            smb: params.smb,
            hostname: params.hostname,
            collab_name: params.collab_name,
            title: params.title,
            message: params.message,
            success: function (status) {
              if (params.success) params.success(params.hostname);
            },
            cancel: function () {
              if (params.cancel) params.cancel();
            },
          });
        }
      },
      error: function (request, status, reason_phrase) {
        console.log("Unable to check status of remote session.");
        return;
      },
    });
  };

  pool.delete_remote = function (hostname) {
    if (hostname in remotes) {
      // Ignore any errors, the sid could have expired.
      client.delete_remote({
        sid: remotes[hostname],
      });
      delete remotes[hostname];
    }
  };

  return pool;
}

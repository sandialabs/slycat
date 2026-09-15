/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import client from "js/slycat-web-client";
import { showRemoteLogin } from "components/RemoteLoginModal";

export function login(params) {
  showRemoteLogin(params);
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

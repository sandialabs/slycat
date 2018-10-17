/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import server_root from "js/slycat-server-root";
import client from "js/slycat-web-client";
import deleteUI from "./delete-ui.html";

function constructor(params)
{
  var component = {};
  component.project = params.projects()[0];

  component.delete_project = function()
  {
    client.delete_project(
    {
      pid: component.project._id(),
      success: function()
      {
        window.location.href = server_root + "projects";
      }
    });
  }
  return component;
}

export default {
  viewModel: constructor,
  template: deleteUI,
  };
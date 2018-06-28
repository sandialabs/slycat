/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import server_root from "js/slycat-server-root";
import client from "js/slycat-web-client";
import ko from 'knockout';
import mapping from "knockout-mapping";
import createUI from "./create-ui.html";

function constructor(params)
{
  var component = {};
  component.tab = ko.observable(0);
  component.name = ko.observable("");
  component.description = ko.observable("");

  component.finish = function()
  {
    client.post_projects(
    {
      name : component.name(),
      description : component.description(),
      success : function(pid)
      {
        window.location.href = server_root + "projects/" + pid;
      }
    });
  }
  return component;
}

export default {
  viewModel: constructor,
  template: createUI,
};
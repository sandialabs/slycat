/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import server_root from "../../js/slycat-server-root";
import client from "../../js/slycat-web-client-webpack";
import ko from 'knockout';
import infoUI from "./info-ui.html";

var constructor = function(params) {
  return {
    viewModel: {
      project: params.projects()[0]
    }
  };
};

export default {
  viewModel: constructor,
  template: infoUI
};
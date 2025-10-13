/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

var module = {};

module.translate_model_type = function (model_type) {
  var model_names = {
    "parameter-image": "Parameter Space",
    cca: "CCA",
    VS: "Video Swarm",
  };
  return model_names[model_type] ? model_names[model_type] : model_type;
};

export default module;

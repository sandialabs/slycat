/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define('slycat-model-names', [], function()
{
  var module = {};

  module.translate_model_type = function(model_type)
  {
    var model_names = {
      'parameter-image' : 'parameter space',
      'parameter-image-plus' : 'parameter image'
    };
    return model_names[model_type] ? model_names[model_type] : model_type;
  }

  return module;
});

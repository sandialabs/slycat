/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

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

/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-models", ["slycat-server-root"], function(server_root)
{
  // Server-side-events loop to keep track of the current user's list of models.
  var models = ko.observableArray();
  var model_ids = {}
  var source = null;

  function start()
  {
    source = new EventSource(server_root + "models-feed");
    source.onmessage = function(event)
    {
      message = JSON.parse(event.data);
      if(message.deleted)
      {
        if(message.id in model_ids)
        {
          delete model_ids[message.id];
          for(var i = 0; i != models().length; ++i)
          {
            if(models()[i]._id() == message.id)
            {
              models.splice(i, 1);
              break;
            }
          }
        }
      }
      else
      {
        var model = message.doc;
        if(model._id in model_ids)
        {
          ko.mapping.fromJS(model, model_ids[model._id]);
        }
        else
        {
          model_ids[model._id] = ko.mapping.fromJS(model);
          models.push(model_ids[model._id]);
        }
      }
    }
    source.onerror = function(event)
    {
      console.log("error", event);
    }
  }

  var module = {};
  module.watch = function()
  {
    if(!source)
      start();
    return models;
  }

  return module;
});

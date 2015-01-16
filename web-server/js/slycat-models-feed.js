/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-models-feed", ["slycat-server-root", "knockout", "knockout-mapping"], function(server_root, ko, mapping)
{
  // Server-side-events loop to keep track of the current user's list of models.
  var models = ko.observableArray().extend({rateLimit: {timeout: 10, method: "notifyWhenChangesStop"}});
  var model_ids = {}
  var source = null;

  function sort_models()
  {
    models.sort(function(left, right)
    {
      return left.created() == right.created() ? 0 : (left.created() < right.created() ? 1 : -1);
    });
  }

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
          mapping.fromJS(model, model_ids[model._id]);
        }
        else
        {
          model_ids[model._id] = mapping.fromJS(model);
          models.push(model_ids[model._id]);
          sort_models();
        }
      }
    }
    source.onerror = function(event)
    {
    }
  }

  var module = {};
  module.watch = function()
  {
    if(!source)
      start();
    return models;
  }

  module.seed = function(model)
  {
    if(model._id in model_ids)
      return;

    model_ids[model._id] = mapping.fromJS(
    {
      _id: model._id,
      name: model.name || "",
      description: model.description || "",
    });
    models.push(model_ids[model._id]);
    sort_models();
  }

  return module;
});

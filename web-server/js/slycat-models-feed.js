/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-models-feed", ["slycat-changes-feed", "knockout", "knockout-mapping"], function(changes_feed, ko, mapping)
{
  // Server-side-events loop to keep track of the current user's list of models.
  var models = ko.observableArray().extend({rateLimit: {timeout: 10, method: "notifyWhenChangesStop"}});
  var model_ids = {}
  var started = false;

  function sort_models()
  {
    models.sort(function(left, right)
    {
      return left.created() == right.created() ? 0 : (left.created() < right.created() ? 1 : -1);
    });
  }

  function start()
  {
    if(started)
      return;
    started = true;

    changes_feed.watch(function(change)
    {
      if(change.deleted)
      {
        if(change.id in model_ids)
        {
          delete model_ids[change.id];
          for(var i = 0; i != models().length; ++i)
          {
            if(models()[i]._id() == change.id)
            {
              models.splice(i, 1);
              break;
            }
          }
        }
      }
      else
      {
        if(change.doc.type == "model")
        {
          var model = change.doc;
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
    });
  }

  var module = {};
  module.watch = function()
  {
    start();
    return models;
  }

  return module;
});

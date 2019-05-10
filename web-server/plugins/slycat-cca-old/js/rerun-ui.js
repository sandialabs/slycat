/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

import server_root from "js/slycat-server-root";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import ko from "knockout";
import mapping from "knockout-mapping";
import "js/slycat-table-ingestion";
import "js/slycat-model-controls";
import rerunCCAWizardUI from "../rerun-ui.html";

function constructor(params)
{
  var component = {};
  component.tab = ko.observable(0);
  component.project = params.projects()[0];
  component.original = params.models()[0];
  component.model = mapping.fromJS(
  {
    _id: null,
    name: "Rerun " + component.original.name(),
    description: "Rerunning " + component.original.name() + ". Original description: " + component.original.description(),
    marking: component.original.marking(),
  });
  component.attributes = mapping.fromJS([]);
  component.scale_inputs = ko.observable(false);
  component.row_count = ko.observable(null);

  client.get_model_arrayset_metadata({
    mid: component.original._id(),
    aid: "data-table",
    arrays: "0",
    statistics: "0/...",
    success: function(metadata) {
      component.row_count(metadata.arrays[0].shape[0]); // Set number of rows
      var attributes = [];
      var name = null;
      var type = null;
      var constant = null;
      var string = null;
      var tooltip = null;
      for(var i = 0; i != metadata.arrays[0].attributes.length; ++i)
      {
        name = metadata.arrays[0].attributes[i].name;
        type = metadata.arrays[0].attributes[i].type;
        constant = metadata.statistics[i].unique == 1;
        string = type == "string";
        tooltip = "";
        if(string)
        {
          tooltip = "This variable's values contain strings, so it cannot be included in the analysis.";
        }
        else if(constant)
        {
          tooltip = "This variable's values are all identical, so it cannot be included in the analysis.";
        }
        attributes.push({
          name: name, 
          type: type, 
          constant: constant,
          disabled: constant || string,
          Classification: 'Neither',
          hidden: false,
          selected: false,
          lastSelected: false,
          tooltip: tooltip
        });
      }
      mapping.fromJS(attributes, component.attributes);
      
      client.get_model_parameter(
      {
        mid: component.original._id(),
        aid: "input-columns",
        success: function(value)
        {
          for(var i = 0; i != value.length; ++i)
          {
            component.attributes()[value[i]].Classification('Input');
          }
        }
      });

      client.get_model_parameter(
      {
        mid: component.original._id(),
        aid: "output-columns",
        success: function(value)
        {
          for(var i = 0; i != value.length; ++i)
          {
            component.attributes()[value[i]].Classification('Output');
          }
        }
      });
    }
  });

  client.get_model_parameter(
  {
    mid: component.original._id(),
    aid: "scale-inputs",
    success: function(value)
    {
      component.scale_inputs(value);
    }
  });

  component.cancel = function()
  {
    if(component.model._id())
      client.delete_model({ mid: component.model._id() });
  }
  component.create_model = function()
  {
    client.post_project_models(
    {
      pid: component.project._id(),
      type: "cca-old",
      name: component.model.name(),
      description: component.model.description(),
      marking: component.model.marking(),
      success: function(mid)
      {
        component.model._id(mid);
        client.put_model_inputs(
        {
          mid: component.model._id(),
          sid: component.original._id(),
          success: function()
          {
            // component.tab(1);
          }
        });
      },
      error: dialog.ajax_error("Error creating model."),
    });
  }

  // Create a model as soon as the dialog loads. We rename, change description and marking later.
  component.create_model();

  component.go_to_model = function() {
    location = server_root + 'models/' + component.model._id();
  }

  component.finish = function()
  {
    var input_columns = [];
    var output_columns = [];
    for(var i = 0; i != component.attributes().length; ++i)
    {
      if(component.attributes()[i].Classification() == 'Input')
        input_columns.push(i);
      if(component.attributes()[i].Classification() == 'Output')
        output_columns.push(i);
    }

    if( input_columns.length >= component.row_count() || output_columns.length >= component.row_count() )
    {
      dialog.dialog({
        message:"The number of inputs must be less than " + component.row_count() + 
                ". The number of outputs must be less than " + component.row_count() + 
                ". You have selected " + input_columns.length +
                " inputs and " + output_columns.length + " outputs."
      });
    }
    else if( input_columns.length == 0 )
    {
      dialog.dialog({
        message:"The number of inputs must be at least one."
      });
    }
    else if( output_columns.length == 0 )
    {
      dialog.dialog({
        message:"The number of outputs must be at least one."
      });
    }
    else
    {
      client.put_model_parameter(
      {
        mid: component.model._id(),
        aid: "input-columns",
        value: input_columns,
        input: true,
        success: function()
        {
          client.put_model_parameter(
          {
            mid: component.model._id(),
            aid: "output-columns",
            value: output_columns,
            input: true,
            success: function()
            {
              client.put_model_parameter(
              {
                mid: component.model._id(),
                aid: "scale-inputs",
                value: component.scale_inputs(),
                input: true,
                success: function()
                {
                  component.tab(1);
                }
              });
            }
          });
        }
      });
    }
  }

  component.name_model = function(formElement) 
  {
    // Validating
    formElement.classList.add('was-validated');

    // If valid...
    if (formElement.checkValidity() === true)
    {
      // Clearing form validation
      formElement.classList.remove('was-validated');
      // Creating new model
      client.put_model(
      {
        mid: component.model._id(),
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function()
        {
          client.post_model_finish({
            mid: component.model._id(),
            success: function() {
              component.go_to_model();
            }
          });
        },
        error: dialog.ajax_error("Error updating model."),
      });
    }
  };

  component.back = function() {
    var target = component.tab();
    target--;
    component.tab(target);
  };

  return component;
}

export default {
  viewModel: constructor,
  template: rerunCCAWizardUI
  };
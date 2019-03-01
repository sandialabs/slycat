/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import server_root from "js/slycat-server-root";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import bookmark_manager from "js/slycat-bookmark-manager";
import ko from 'knockout';
import mapping from "knockout-mapping";
import columnUI from "./column-ui.html";

function constructor(params)
{
  var component = {};
  component.attributes = mapping.fromJS([]);
  component.server_root = server_root;

  component._id = params.models()[0]._id();
  component.input_columns = params.models()[0]["artifact:input-columns"] != undefined ? params.models()[0]["artifact:input-columns"]() : [];
  component.output_columns = params.models()[0]["artifact:output-columns"] != undefined ? params.models()[0]["artifact:output-columns"]() : [];
  component.category_columns = params.models()[0]["artifact:category-columns"] != undefined ? params.models()[0]["artifact:category-columns"]() : [];
  component.rating_columns = params.models()[0]["artifact:rating-columns"] != undefined ? params.models()[0]["artifact:rating-columns"]() : [];
  component.media_columns = params.models()[0]["artifact:image-columns"] != undefined ? params.models()[0]["artifact:image-columns"]() : [];

  client.get_model_table_metadata({
    mid: component._id,
    aid: "data-table",
    success: function(metadata) {
      var attributes = [];
      for(var i = 0; i != metadata["column-names"].length; ++i)
      {
        var classification = 'Neither';
        if(component.input_columns.indexOf(i) !== -1)
        {
          classification = 'Input';
        }
        else if(component.output_columns.indexOf(i) !== -1)
        {
          classification = 'Output';
        }
        attributes.push({
          name:metadata["column-names"][i], 
          type:metadata["column-types"][i], 
          input:false,
          output:false,
          category:false,
          rating:false,
          image: component.media_columns.indexOf(i) !== -1,
          Classification: classification,
          Categorical: component.category_columns.indexOf(i) !== -1,
          Editable: component.rating_columns.indexOf(i) !== -1,
          hidden: component.media_columns.indexOf(i) !== -1,
          selected: false,
          lastSelected: false,
          disabled: false,
          tooltip: ""
        });
      }
      mapping.fromJS(attributes, component.attributes);
    }
  });

  component.cancel = function() {
  };

  component.finish = function() {
    var input_columns = [];
    var output_columns = [];
    var rating_columns = [];
    var category_columns = [];
    var image_columns = [];
    for(var i = 0; i != component.attributes().length; ++i) {
      if(component.attributes()[i].Classification() == 'Input')
        input_columns.push(i);
      if(component.attributes()[i].Classification() == 'Output')
        output_columns.push(i);
      if(component.attributes()[i].Categorical())
        category_columns.push(i);
      if(component.attributes()[i].Editable())
        rating_columns.push(i);
      if(component.attributes()[i].image())
        image_columns.push(i);
    }

    //dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
    bookmark_manager;
    var bookmarker = bookmark_manager.create(params.projects()[0]._id(), component._id);
    bookmarker.getState(function(state){
      // Check if there are filters in the bookmark
      var filters = state.allFilters;
      if(filters != undefined)
      {
        // Iterate over all filters and find ones that no longer match their bookmarked categorical/numeric type
        var switchedVariables = [];
        var switchedVariableNames = [];
        for(var i=0; i < filters.length; i++)
        {
          var filter = filters[i];
          var switchedToCategorical = category_columns.indexOf(filter.index) > -1 && filter.type == 'numeric';
          var switchedToNumeric = category_columns.indexOf(filter.index) == -1 && filter.type == 'category';
          if(switchedToCategorical || switchedToNumeric)
          {
            switchedVariables.push(i);
            switchedVariableNames.push(filter.name);
          }
        }
        if(switchedVariables.length)
        {
          // Alert user
          var message = "You made changes to the Categorial attribute of the following variables: ";
          message += switchedVariableNames.join(", ");
          message +=  ". If you continue, filters for these variables will be reset. Do you want to continue?";
          dialog.confirm({
            title: "Reset Filters?",
            message: message,
            ok: function()
            {
              save_new_parameters();
            }
          });
        }
        else
        {
          save_new_parameters();
        }
      }
      else
      {
        save_new_parameters();
      }

      function save_new_parameters(){
        client.put_model_parameter({
          mid: component._id,
          aid: "input-columns",
          value: input_columns,
          input: true,
          success: function() {
            client.put_model_parameter({
              mid: component._id,
              aid: "output-columns",
              value: output_columns,
              input: true,
              success: function() {
                client.put_model_parameter({
                  mid: component._id,
                  aid: "rating-columns",
                  value: rating_columns,
                  input: true,
                  success: function() {
                    client.put_model_parameter({
                      mid: component._id,
                      aid: "category-columns",
                      value: category_columns,
                      input: true,
                      success: function() {
                        client.put_model_parameter({
                          mid: component._id,
                          aid: "image-columns",
                          value: image_columns,
                          input: true,
                          success: function() {
                            document.location.reload(true);
                          }
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }

    });
  };

  return component;
}

export default {
  viewModel: constructor,
  template: columnUI,
};

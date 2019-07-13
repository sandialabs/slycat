"use strict";
/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

import jquery_ui_css from "jquery-ui/themes/base/all.css";
import slycat_additions_css from "css/slycat-additions.css";
import ui_css from "../css/ui.css";

import api_root from "js/slycat-api-root";
import client from "js/slycat-web-client";
import bookmark_manager from "js/slycat-bookmark-manager";
import * as dialog from "js/slycat-dialog";
import URI from "urijs";
import * as chunker from "js/chunker";
import slycat_color_maps from "js/slycat-color-maps";

import "jquery-ui";
// disable-selection and draggable required for jquery.layout resizing functionality
import "jquery-ui/ui/disable-selection";
import "jquery-ui/ui/widgets/draggable";
// resizable required for CCA barplotGroupInputs
import "jquery-ui/ui/widgets/resizable";
import "layout";

import "js/jquery.scrollintoview.min";

// These need to imported after jquery-ui's CSS because they import their own CSS,
// which needs to override the CSS from jquery-ui.
import React from "react";
import ReactDOM from "react-dom";
import CCAControlsBar from "./components/CCAControlsBar";
import CCABarplot from "./components/CCABarplot";
import CCATable from "./components/CCATable";
import CCAScatterplot from "./components/CCAScatterplot";

import { Provider } from 'react-redux';
import thunkMiddleware from 'redux-thunk';
import { createLogger } from 'redux-logger';
import { createStore, applyMiddleware } from 'redux';
import cca_reducer from './reducers';
import { fetchVariableValuesIfNeeded, } from './actions'


// Wait for document ready
$(document).ready(function() {

  //////////////////////////////////////////////////////////////////////////////////////////
  // Setup global variables.
  //////////////////////////////////////////////////////////////////////////////////////////

  var bookmarker = null;
  var store = null;

  // A default state
  // Commented out properties are set later because they depend on model
  // data that hasn't been downloaded yet.
  let redux_state_tree = {
    derived: // Object that will hold state computed from model data
    { 
      // table_metadata: table_metadata,
      model_id: URI(window.location).segment(-1),
      // input_columns: model["artifact:input-columns"],
      // output_columns: model["artifact:output-columns"],
      // other_columns: null,
      // color_variables: null,
      // x_loadings: x_loadings,
      // y_loadings: y_loadings,
      // r2: r2,
      // wilks: wilks,
      // indices: null,
      column_data: { // Object that will hold the values for columns
        // 0: { // Column index
        //   isFetching: false, // Ajax request for data state
        //   values: [], // All values for the column in an array
        // }
      }, 
    }, 
    colormap: 'night', // String reprsenting current color map
    simulations_selected: [], // Array containing which simulations are selected. Empty for none.
    cca_component_selected: 0, // Number indicating the index of the selected CCA component.
    cca_component_sorted: null, // Number indicating the index of the sorted CCA component. Set to 'null' for no sort?
    cca_component_sort_direction: 'ascending', // String indicating sort direction of sorted CCA component. Set to 'null' for no sort?
    // variable_selected: table_metadata["column-count"] - 1, // Number indicating the index of the selected variable. One always must be selected.
    variable_sorted: null, // Number indicating the index of the sorted variable. Set to 'null' for no sort?
    variable_sort_direction: 'ascending', // String indicating the sort direction of the sorted variable. Set to 'null' for no sort?
    scatterplot_font_family: 'Arial', // String formatted as a valid font-family CSS property.
    scatterplot_font_size: '14px', // String formatted as a valid font-size CSS property.
  }


  //////////////////////////////////////////////////////////////////////////////////////////
  // Get the model and other model data
  //////////////////////////////////////////////////////////////////////////////////////////
  function doPoll(){
    // Return a new promise.
    return new Promise(function try_get_model(resolve, reject) {
      client.get_model(
      {
        mid: redux_state_tree.derived.model_id,
        success : function(model)
        {          
          // When state is waiting or running, wait 5 seconds and try again
          if(model["state"] === "waiting" || model["state"] === "running") {
            setTimeout(function(){try_get_model(resolve, reject)}, 5000);
          }

          // Reject closed with no results and failes models
          if(model["state"] === "closed" && model["result"] === null)
            reject("Closed with no result.");
          if(model["result"] === "failed")
            reject("Failed.");
          
          // Otherwise resolve the promise
          resolve(model);
        },
        error: dialog.ajax_error("Error retrieving model."),
      });
    });
  }
  let get_model_promise = doPoll();

  // We have a completed model
  get_model_promise.then(function(model){
    $('.slycat-navbar-alert').remove();
    redux_state_tree.derived.model = model;
    redux_state_tree.derived.input_columns = model["artifact:input-columns"];
    redux_state_tree.derived.output_columns = model["artifact:output-columns"];
  }).catch(function(error){
    console.log("promise rejected");
    throw error;
  });

  let bookmarker_promise = new Promise(function(resolve, reject){
    get_model_promise.then(function(){
      // Create the bookmarker now that we have the project
      bookmarker = bookmark_manager.create(
        redux_state_tree.derived.model.project, 
        redux_state_tree.derived.model_id);
      // Retrieve bookmarked state information ...
      bookmarker.getState(function(bookmark)
      {
        // Even though getState is asynchronous, it will always
        // return a state. Returns empty state when it errors.

        // If we have a serialized redux state, load it
        if (bookmark.redux_state_tree !== undefined)
        {
          redux_state_tree = Object.assign({}, redux_state_tree, bookmark.redux_state_tree);
        }
        // Otherwise initialize it with whatever we can find in the bookmark
        else 
        {
          let bookmark_state_tree = {};
          
          bookmark["colormap"] !== undefined ? bookmark_state_tree.colormap = bookmark["colormap"] : null;
          bookmark["simulation-selection"] !== undefined ? bookmark_state_tree.simulations_selected = bookmark["simulation-selection"] : null;
          bookmark["cca-component"] !== undefined ? bookmark_state_tree.cca_component_selected = bookmark["cca-component"] : null;
          bookmark["sort-cca-component"] !== undefined ? bookmark_state_tree.cca_component_sorted = bookmark["sort-cca-component"] : null;
          bookmark["sort-direction-cca-component"] !== undefined ? bookmark_state_tree.cca_component_sort_direction = bookmark["sort-direction-cca-component"] : null;
          bookmark["variable-selection"] !== undefined ? bookmark_state_tree.variable_selected = bookmark["variable-selection"] : null;
          bookmark["sort-variable"] !== undefined ? bookmark_state_tree.variable_sorted = bookmark["sort-variable"] : null;
          bookmark["sort-order"] !== undefined ? bookmark_state_tree.variable_sort_direction = bookmark["sort-order"] : null;

          redux_state_tree = Object.assign({}, redux_state_tree, bookmark_state_tree);
        }
        resolve(bookmark);
      });
    })
  });

  bookmarker_promise.then(function(bookmark){
    console.log('bookmarker_promise then: ' + bookmark);
  });

  // Load data table metadata.
  let table_metadata_promise = new Promise(function(resolve, reject) {
    client.get_model_table_metadata({
      mid: redux_state_tree.derived.model_id,
      aid: "data-table",
      index: "Index",
      success: function(table_metadata)
      {
        redux_state_tree.derived.table_metadata = table_metadata;
        redux_state_tree.variable_selected = table_metadata["column-count"] - 1;
        resolve();
      },
      error: reject
    });
  });

  Promise.all([
    table_metadata_promise, 
    get_model_promise])
  .then(function(){
    let other_columns = [];
    for(var i = 0; i != redux_state_tree.derived.table_metadata["column-count"] - 1; ++i)
    {
      if($.inArray(i, redux_state_tree.derived.input_columns) == -1 
         && $.inArray(i, redux_state_tree.derived.output_columns) == -1)
        other_columns.push(i);
    }
    redux_state_tree.derived.other_columns = other_columns;

    let color_variables = [];
    // Last column is the index, so it goes first
    color_variables.push(redux_state_tree.derived.table_metadata["column-count"] - 1);
    // Then we add inputs
    for(var i = 0; i < redux_state_tree.derived.input_columns.length; i++)
    {
      color_variables.push(redux_state_tree.derived.input_columns[i]);
    }
    // Followed by outputs
    for(var i = 0; i < redux_state_tree.derived.output_columns.length; i++)
    {
      color_variables.push(redux_state_tree.derived.output_columns[i]);
    }
    // Finally the others
    for(var i = 0; i != redux_state_tree.derived.table_metadata["column-count"] - 1; ++i)
    {
      if($.inArray(i, redux_state_tree.derived.input_columns) == -1 && $.inArray(i, redux_state_tree.derived.output_columns) == -1 && redux_state_tree.derived.table_metadata["column-types"][i] != "string")
        color_variables.push(i);
    }
    redux_state_tree.derived.color_variables = color_variables;
  });

  // Load the x_loadings artifact.
  let x_loadings_promise = new Promise(function(resolve, reject) {
    chunker.get_model_array_attribute({
      api_root : api_root,
      mid : redux_state_tree.derived.model_id,
      aid : "input-structure-correlation",
      array : 0,
      attribute : 0,
      success : function(result)
      {
        redux_state_tree.derived.x_loadings = result;
        resolve();
      },
      error : reject,
    });
  });

  // Load the y_loadings artifact.
  let y_loadings_promise = new Promise(function(resolve, reject) {
    chunker.get_model_array_attribute({
      api_root : api_root,
      mid : redux_state_tree.derived.model_id,
      aid : "output-structure-correlation",
      array : 0,
      attribute : 0,
      success : function(result)
      {
        redux_state_tree.derived.y_loadings = result;
        resolve();
      },
      error : reject
    });
  });

  // Load the r^2 statistics artifact.
  let r2_promise = new Promise(function(resolve, reject) {
    chunker.get_model_array_attribute({
      api_root : api_root,
      mid : redux_state_tree.derived.model_id,
      aid : "cca-statistics",
      array : 0,
      attribute : 0,
      success : function(result)
      {
        redux_state_tree.derived.r2 = result;
        resolve();
      },
      error : reject
    });
  });

  // Load the Wilks statistics artifact.
  let wilks_promise = new Promise(function(resolve, reject) {
    chunker.get_model_array_attribute({
      api_root : api_root,
      mid : redux_state_tree.derived.model_id,
      aid : "cca-statistics",
      array : 0,
      attribute : 1,
      success : function(result)
      {
        redux_state_tree.derived.wilks = result;
        resolve();
      },
      error : reject
    });
  });

  // Load the canonical-indices artifact.
  let indices_promise = new Promise(function(resolve, reject) {
    chunker.get_model_array_attribute({
      api_root : api_root,
      mid : redux_state_tree.derived.model_id,
      aid : "canonical-indices",
      array : 0,
      attribute : 0,
      success : function(result)
      {
        redux_state_tree.derived.indices = result;
        // console.log('indices_promise success');
        resolve();
      },
      error : function()
      {
        // If there's an error retrieving the indices, we generate them
        // once we have table_metadata
        // console.log('indices_promise error');
        table_metadata_promise
          .then(function(){
            var count = redux_state_tree.derived.table_metadata["row-count"];
            let indices = new Int32Array(count);
            for(var i = 0; i != count; ++i)
              indices[i] = i;
            redux_state_tree.derived.indices = indices;
            resolve();
          })
          .catch(function(error){
            reject();
            throw error;
          })
        ;
      }
    });
  });

  // Load the canonical-variables artifacts.
  let x_promise = new Promise(function(resolve, reject) {
    chunker.get_model_array_attribute({
      api_root : api_root,
      mid : redux_state_tree.derived.model_id,
      aid : "canonical-variables",
      array : 0,
      attribute : 0,
      success : function(result)
      {
        redux_state_tree.derived.x = result;
        resolve();
      },
      error : reject
    });
  });

  let y_promise = new Promise(function(resolve, reject) {
    chunker.get_model_array_attribute({
      api_root : api_root,
      mid : redux_state_tree.derived.model_id,
      aid : "canonical-variables",
      array : 0,
      attribute : 1,
      success : function(result)
      {
        redux_state_tree.derived.y = result;
        resolve();
      },
      error : reject
    });
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  // Once all promises have resolved, set up redux
  //////////////////////////////////////////////////////////////////////////////////////////
  Promise.all([
      get_model_promise,
      bookmarker_promise,
      table_metadata_promise,
      x_loadings_promise,
      y_loadings_promise,
      r2_promise,
      wilks_promise,
      indices_promise,
      x_promise,
      y_promise,
    ])
    .then(function(arrayOfResults) {
      // console.log("Promise.all([...]) then");
      setup_redux();
    })
    .catch(function(error){
      // console.log("Promise.all([...]) catch");
      throw error;
    })
  ;

  function setup_redux()
  {
    // If the model isn't ready or failed, we're done.
    if(redux_state_tree.derived.model["state"] == "waiting" || redux_state_tree.derived.model["state"] == "running")
      return;
    if(redux_state_tree.derived.model["state"] == "closed" && redux_state_tree.derived.model["result"] === null)
      return;
    if(redux_state_tree.derived.model["result"] == "failed")
      return;
    
    // Create logger for redux
    const loggerMiddleware = createLogger();

    // Create Redux store and set its initial state
    store = createStore(
      cca_reducer, 
      redux_state_tree,
      applyMiddleware(
        thunkMiddleware, // Lets us dispatch() functions
        loggerMiddleware, // Neat middleware that logs actions. 
                          // Logger must be the last middleware in chain, 
                          // otherwise it will log thunk and promise, 
                          // not actual actions.
      )
    );

    store.dispatch(
      fetchVariableValuesIfNeeded(
        store.getState().variable_selected,
      )
    );

    // Save Redux state to bookmark whenever it changes
    const bookmarkReduxStateTree = () => {
      bookmarker.updateState({
        redux_state_tree: 
        // Remove derived property from state tree because it should be computed
        // from model data each time the model is loaded. Otherwise it has the 
        // potential of becoming huge. Plus we shouldn't be storing model data
        // in the bookmark, just UI state.
        // Passing 'undefined' removes it from bookmark. Passing 'null' actually
        // sets it to null, so I think it's better to remove it entirely.
        { ...store.getState(), derived: undefined }
      });
    };
    store.subscribe(bookmarkReduxStateTree);

    render_components();
  }

  // ToDo: hook this up to numerous pieces of code that try to download model data.
  function artifact_missing()
  {
    $(".load-status").css("display", "none");

    dialog.dialog(
    {
      title: "Load Error",
      message: "Oops, there was a problem retrieving data from the model. This likely means that there was a problem during computation.",
    });
  }

  //////////////////////////////////////////////////////////////////////////////////////////
  // Setup page layout.
  //////////////////////////////////////////////////////////////////////////////////////////

  // Layout resizable panels ...
  $("#cca-model").layout(
  {
    applyDefaultStyles: false,
    north:
    {
      size: 39,
      resizable: false,
    },
    west:
    {
      size: $("#cca-model").width() / 2,
      resizeWhileDragging: false,
      onresize_end: function() { 
        if($("#barplot-table").data("cca-barplot")) {
          $("#barplot-table").barplot("resize_canvas"); 
        }
      },
    },
    center:
    {
      resizeWhileDragging: false,
      onresize_end: function() { 
        if($("#scatterplot").data("cca-scatterplot")) {
          $("#scatterplot").scatterplot("option", {width: $("#scatterplot-pane").width(), height: $("#scatterplot-pane").height()}); 
        }
      },
    },
    south:
    {
      size: $("body").height() / 2,
      resizeWhileDragging: false,
      onresize_end: function()
      {
        if(self.cca_table)
          self.cca_table.resize_canvas();
      },
    },
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  // Render React components
  //////////////////////////////////////////////////////////////////////////////////////////
  function render_components()
  {
    const cca_barplot = 
      (<Provider store={store}>
        <CCABarplot />
      </Provider>)
    ;

    self.cca_barplot = ReactDOM.render(
      cca_barplot,
      document.getElementById('barplot-table')
    );

    // ToDo: This needs to respond to color theme changes.
    $("#scatterplot-pane").css("background", slycat_color_maps.get_background(store.getState().colormap).toString());

    const cca_scatterplot = 
      (<Provider store={store}>
        <CCAScatterplot
          width={$("#scatterplot-pane").width()}
          height={$("#scatterplot-pane").height()}
          border={{top: 40, right: 150, bottom: 40, left: 40}}
          label_offset={{x: 25, y: 25}}
          drag_threshold={3}
          pick_distance={3}
          font_size={'14px'}
          font_family={'Arial'}
        />
      </Provider>)
    ;

    self.cca_scatterplot = ReactDOM.render(
      cca_scatterplot,
      document.getElementById('scatterplot-pane')
    );

    const cca_table = 
      (<Provider store={store}>
        <CCATable 
          aid="data-table"
        />
      </Provider>)
    ;

    self.cca_table = ReactDOM.render(
      cca_table,
      document.getElementById('table-pane')
    );

    const color_variable_dropdown_items = [];
    for(let color_variable of redux_state_tree.derived.color_variables) {
      color_variable_dropdown_items.push({
        key: color_variable, 
        name: redux_state_tree.derived.table_metadata['column-names'][color_variable]
      });
    }

    const cca_controls_bar = 
      (<Provider store={store}>
        <CCAControlsBar 
          // selection={store.getState().simulations_selected}
          // mid={model._id}
          aid={"data-table"}
          // model_name={window.model_name}
          // metadata={table_metadata}
          color_variables={color_variable_dropdown_items}
          // indices={indices}
        />
      </Provider>)
    ;

    self.CCAControlsBarComponent = ReactDOM.render(
      cca_controls_bar,
      document.getElementById('cca-controls-bar')
    );
  }
});

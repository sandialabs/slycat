/* eslint-disable no-undefined */
/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . 
   Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, 
   the U.S. Government  retains certain rights in this software. */

import $ from "jquery";
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
import "layout-jquery3";

// These need to imported after jquery-ui's CSS because they import their own CSS,
// which needs to override the CSS from jquery-ui.
import React from "react";
import { createRoot } from "react-dom/client";
import CCAControlsBar from "./components/CCAControlsBar";
import CCABarplot from "./components/CCABarplot";
import CCATable from "./components/CCATable";
import CCAScatterplot from "./components/CCAScatterplot";

import { Provider } from "react-redux";
import { thunk } from "redux-thunk";
import { createLogger } from "redux-logger";
import { createStore, applyMiddleware } from "redux";
import cca_reducer from "./reducers";
import {
  fetchVariableValuesIfNeeded,
  setScatterplotWidth,
  setScatterplotHeight,
  setTableHeight,
  setTableWidth,
  setBarplotHeight,
  setBarplotWidth,
} from "./actions";

// Wait for document ready
$(document).ready(function () {
  //////////////////////////////////////////////////////////////////////////////////////////
  // Setup global variables.
  //////////////////////////////////////////////////////////////////////////////////////////

  let layout = null;
  var bookmarker = null;
  var store = null;

  // A default state
  // Commented out properties are set later because they depend on model
  // data that hasn't been downloaded yet.
  let redux_state_tree = {
    // Object that will hold state computed from model data
    derived: {
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
      // indices: null, // Array
      // x: null, // Array
      // y: null, // Array
      // v: null, // Array
      // scatterplot_width: null, // Width of scatterplot
      // scatterplot_height: null, // Height of scatterplot
      // table_width: null, // Width of table
      // table_height: null, // Height of table
      // barplot_width: null, // Width of barplot
      // barplot_height: null, // Height of barplot
      column_data: {
        // Object that will hold the values for columns
        // 0: { // Column index
        //   isFetching: false, // Ajax request for data state
        //   values: [], // All values for the column in an array
        // }
      },
      // Set "embed" to true if the "embed" query parameter is present
      embed: URI(window.location).query(true).embed !== undefined,
      hideControls: URI(window.location).query(true).hideControls !== undefined,
      hideTable: URI(window.location).query(true).hideTable !== undefined,
      hideBarplot: URI(window.location).query(true).hideBarplot !== undefined,
    },
    colormap: "night", // String reprsenting current color map
    simulations_selected: [], // Array containing which simulations are selected. Empty for none.
    cca_component_selected: 0, // Number indicating the index of the selected CCA component.
    cca_component_sorted: null, // Number indicating the index of the sorted CCA component. Set to 'null' for no sort?
    cca_component_sort_direction: "ascending", // String indicating sort direction of sorted CCA component. Set to 'null' for no sort?
    // variable_selected: table_metadata["column-count"] - 1, // Number indicating the index of the selected variable. One always must be selected.
    variable_sorted: null, // Number indicating the index of the sorted variable. Set to 'null' for no sort?
    variable_sort_direction: "ascending", // String indicating the sort direction of the sorted variable. Set to 'null' for no sort?
    scatterplot_font_family: "Arial", // String formatted as a valid font-family CSS property.
    scatterplot_font_size: "14px", // String formatted as a valid font-size CSS property.
  };

  //////////////////////////////////////////////////////////////////////////////////////////
  // Get the model
  //////////////////////////////////////////////////////////////////////////////////////////
  function doPoll() {
    // Return a new promise.
    return new Promise(function try_get_model(resolve, reject) {
      client.get_model({
        mid: redux_state_tree.derived.model_id,
        success: function (model) {
          // When state is waiting or running, wait 5 seconds and try again
          if (model["state"] === "waiting" || model["state"] === "running") {
            setTimeout(function () {
              try_get_model(resolve, reject);
            }, 5000);
          }

          // Reject closed with no results and failes models
          else if (model["state"] === "closed" && model["result"] === null) {
            reject("Closed with no result.");
          } else if (model["result"] === "failed") {
            reject("Failed.");
          }

          // Otherwise resolve the promise
          else {
            resolve(model);
          }
        },
        error: dialog.ajax_error("Error retrieving model."),
      });
    });
  }
  let get_model_promise = doPoll();

  // We have a completed model, so remove the navbar alert and start setting some derived state
  get_model_promise
    .then(function (model) {
      $(".slycat-navbar-alert").remove();
      redux_state_tree.derived.model = model;
      redux_state_tree.derived.input_columns = model["artifact:input-columns"];
      redux_state_tree.derived.output_columns = model["artifact:output-columns"];
    })
    .catch(function (error) {
      console.log("promise rejected");
      throw error;
    });

  //////////////////////////////////////////////////////////////////////////////////////////
  // Setup page layout.
  //////////////////////////////////////////////////////////////////////////////////////////

  // Layout resizable panels ...
  get_model_promise.then(function () {
    layout = $("#cca-model").layout({
      applyDefaultStyles: false,
      north: {
        size: 39,
        resizable: false,
      },
      west: {
        size: $("#cca-model").width() / 2,
        resizeWhileDragging: false,
        onresize_end: function () {
          if (store) {
            store.dispatch(setBarplotWidth($("#barplot-pane").width()));
            store.dispatch(setBarplotHeight($("#barplot-pane").height()));
          }
        },
      },
      center: {
        resizeWhileDragging: false,
        onresize_end: function () {
          if (store) {
            store.dispatch(setScatterplotWidth($("#scatterplot-pane").width()));
            store.dispatch(setScatterplotHeight($("#scatterplot-pane").height()));
          }
        },
      },
      south: {
        size: $("body").height() / 2,
        resizeWhileDragging: false,
        onresize_end: function () {
          if (store) {
            store.dispatch(setTableWidth($("#table-pane").width()));
            store.dispatch(setTableHeight($("#table-pane").height()));
          }
        },
      },
    });

    redux_state_tree.derived.scatterplot_width = $("#scatterplot-pane").width();
    redux_state_tree.derived.scatterplot_height = $("#scatterplot-pane").height();
    redux_state_tree.derived.table_width = $("#table-pane").width();
    redux_state_tree.derived.table_height = $("#table-pane").height();
    redux_state_tree.derived.barplot_width = $("#barplot-pane").width();
    redux_state_tree.derived.barplot_height = $("#barplot-pane").height();
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  // Get other model data
  //////////////////////////////////////////////////////////////////////////////////////////

  // Create a bookmarker and get state from it
  let bookmarker_promise = new Promise(function (resolve, reject) {
    get_model_promise.then(function () {
      // Create the bookmarker now that we have the project
      bookmarker = bookmark_manager.create(
        redux_state_tree.derived.model.project,
        redux_state_tree.derived.model_id,
      );
      // Retrieve bookmarked state information ...
      bookmarker.getState(function (bookmark) {
        // Even though getState is asynchronous, it will always
        // return a state. Returns empty state when it errors.

        // If we have a serialized redux state, load it
        if (bookmark.redux_state_tree !== undefined) {
          redux_state_tree = Object.assign({}, redux_state_tree, bookmark.redux_state_tree);
        }
        // Otherwise initialize it with whatever we can find in the bookmark
        else {
          let bookmark_state_tree = {};

          if (bookmark["colormap"] !== undefined) {
            bookmark_state_tree.colormap = bookmark["colormap"];
          }
          if (bookmark["simulation-selection"] !== undefined) {
            bookmark_state_tree.simulations_selected = bookmark["simulation-selection"];
          }
          if (bookmark["cca-component"] !== undefined) {
            bookmark_state_tree.cca_component_selected = bookmark["cca-component"];
          }
          if (bookmark["sort-cca-component"] !== undefined) {
            bookmark_state_tree.cca_component_sorted = bookmark["sort-cca-component"];
          }
          if (bookmark["sort-direction-cca-component"] !== undefined) {
            bookmark_state_tree.cca_component_sort_direction =
              bookmark["sort-direction-cca-component"];
          }
          if (bookmark["variable-selection"] !== undefined) {
            bookmark_state_tree.variable_selected = bookmark["variable-selection"];
          }
          if (bookmark["sort-variable"] !== undefined) {
            bookmark_state_tree.variable_sorted = bookmark["sort-variable"];
          }
          if (bookmark["sort-order"] !== undefined) {
            bookmark_state_tree.variable_sort_direction = bookmark["sort-order"];
          }

          redux_state_tree = Object.assign({}, redux_state_tree, bookmark_state_tree);
        }
        resolve(bookmark);
      });
    });
  });

  // Load data table metadata.
  let table_metadata_promise = new Promise(function (resolve, reject) {
    get_model_promise.then(function () {
      client.get_model_table_metadata({
        mid: redux_state_tree.derived.model_id,
        aid: "data-table",
        index: "Index",
        success: function (table_metadata) {
          redux_state_tree.derived.table_metadata = table_metadata;
          if (redux_state_tree.variable_selected === undefined) {
            redux_state_tree.variable_selected = table_metadata["column-count"] - 1;
          }
          resolve();
        },
        error: reject,
      });
    });
  });

  Promise.all([table_metadata_promise, get_model_promise]).then(function () {
    let other_columns = [];
    for (let i = 0; i != redux_state_tree.derived.table_metadata["column-count"] - 1; ++i) {
      if (
        $.inArray(i, redux_state_tree.derived.input_columns) == -1 &&
        $.inArray(i, redux_state_tree.derived.output_columns) == -1
      ) {
        other_columns.push(i);
      }
    }
    redux_state_tree.derived.other_columns = other_columns;

    let color_variables = [];
    // Last column is the index, so it goes first
    color_variables.push(redux_state_tree.derived.table_metadata["column-count"] - 1);
    // Then we add inputs
    for (let i = 0; i < redux_state_tree.derived.input_columns.length; i++) {
      color_variables.push(redux_state_tree.derived.input_columns[i]);
    }
    // Followed by outputs
    for (let i = 0; i < redux_state_tree.derived.output_columns.length; i++) {
      color_variables.push(redux_state_tree.derived.output_columns[i]);
    }
    // Finally the others
    for (let i = 0; i != redux_state_tree.derived.table_metadata["column-count"] - 1; ++i) {
      if (
        $.inArray(i, redux_state_tree.derived.input_columns) == -1 &&
        $.inArray(i, redux_state_tree.derived.output_columns) == -1 &&
        redux_state_tree.derived.table_metadata["column-types"][i] != "string"
      ) {
        color_variables.push(i);
      }
    }
    redux_state_tree.derived.color_variables = color_variables;
  });

  // Load the x_loadings artifact.
  let x_loadings_promise = new Promise(function (resolve, reject) {
    get_model_promise.then(function () {
      chunker.get_model_array_attribute({
        api_root: api_root,
        mid: redux_state_tree.derived.model_id,
        aid: "input-structure-correlation",
        array: 0,
        attribute: 0,
        success: function (result) {
          redux_state_tree.derived.x_loadings = result;
          resolve();
        },
        error: reject,
      });
    });
  });

  // Load the y_loadings artifact.
  let y_loadings_promise = new Promise(function (resolve, reject) {
    get_model_promise.then(function () {
      chunker.get_model_array_attribute({
        api_root: api_root,
        mid: redux_state_tree.derived.model_id,
        aid: "output-structure-correlation",
        array: 0,
        attribute: 0,
        success: function (result) {
          redux_state_tree.derived.y_loadings = result;
          resolve();
        },
        error: reject,
      });
    });
  });

  // Load the r^2 statistics artifact.
  let r2_promise = new Promise(function (resolve, reject) {
    get_model_promise.then(function () {
      chunker.get_model_array_attribute({
        api_root: api_root,
        mid: redux_state_tree.derived.model_id,
        aid: "cca-statistics",
        array: 0,
        attribute: 0,
        success: function (result) {
          redux_state_tree.derived.r2 = result;
          resolve();
        },
        error: reject,
      });
    });
  });

  // Load the Wilks statistics artifact.
  let wilks_promise = new Promise(function (resolve, reject) {
    get_model_promise.then(function () {
      chunker.get_model_array_attribute({
        api_root: api_root,
        mid: redux_state_tree.derived.model_id,
        aid: "cca-statistics",
        array: 0,
        attribute: 1,
        success: function (result) {
          redux_state_tree.derived.wilks = result;
          resolve();
        },
        error: reject,
      });
    });
  });

  // Load the canonical-indices artifact.
  let indices_promise = new Promise(function (resolve, reject) {
    get_model_promise.then(function () {
      chunker.get_model_array_attribute({
        api_root: api_root,
        mid: redux_state_tree.derived.model_id,
        aid: "canonical-indices",
        array: 0,
        attribute: 0,
        success: function (result) {
          redux_state_tree.derived.indices = result;
          // console.log('indices_promise success');
          resolve();
        },
        error: function () {
          // If there's an error retrieving the indices, we generate them
          // once we have table_metadata
          // console.log('indices_promise error');
          table_metadata_promise
            .then(function () {
              var count = redux_state_tree.derived.table_metadata["row-count"];
              let indices = new Int32Array(count);
              for (let i = 0; i != count; ++i) {
                indices[i] = i;
              }
              redux_state_tree.derived.indices = indices;
              resolve();
            })
            .catch(function (error) {
              reject();
              throw error;
            });
        },
      });
    });
  });

  // Load the canonical-variables artifacts.
  let x_promise = new Promise(function (resolve, reject) {
    get_model_promise.then(function () {
      chunker.get_model_array_attribute({
        api_root: api_root,
        mid: redux_state_tree.derived.model_id,
        aid: "canonical-variables",
        array: 0,
        attribute: 0,
        success: function (result) {
          redux_state_tree.derived.x = result;
          resolve();
        },
        error: reject,
      });
    });
  });

  let y_promise = new Promise(function (resolve, reject) {
    get_model_promise.then(function () {
      chunker.get_model_array_attribute({
        api_root: api_root,
        mid: redux_state_tree.derived.model_id,
        aid: "canonical-variables",
        array: 0,
        attribute: 1,
        success: function (result) {
          redux_state_tree.derived.y = result;
          resolve();
        },
        error: reject,
      });
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
    .then(function (arrayOfResults) {
      // console.log("Promise.all([...]) then");
      setup_redux();
    })
    .catch(function (error) {
      // console.log("Promise.all([...]) catch");
      throw error;
    });

  function setup_redux() {
    // If the model isn't ready or failed, we're done.
    if (
      redux_state_tree.derived.model["state"] == "waiting" ||
      redux_state_tree.derived.model["state"] == "running"
    ) {
      return;
    }
    if (
      redux_state_tree.derived.model["state"] == "closed" &&
      redux_state_tree.derived.model["result"] === null
    ) {
      return;
    }
    if (redux_state_tree.derived.model["result"] == "failed") {
      return;
    }

    // Adding middlewares to redux store
    const middlewares = [];
    // Lets us dispatch() functions
    middlewares.push(thunk);
    // Neat middleware that logs actions.
    // Logger must be the last middleware in chain,
    // otherwise it will log thunk and promise,
    // not actual actions.
    // Adding it only in development mode to reduce console messages in prod
    if (process.env.NODE_ENV === `development`) {
      // Create logger for redux
      const loggerMiddleware = createLogger({
        // Setting console level to 'debug' for logger messages
        level: "debug",
        // Enable diff to start showing diffs between prevState and nextState
        // diff: true,
      });
      middlewares.push(loggerMiddleware);
    }

    // Create Redux store and set its initial state
    store = createStore(cca_reducer, redux_state_tree, applyMiddleware(...middlewares));

    store.dispatch(fetchVariableValuesIfNeeded(store.getState().variable_selected));

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
          // eslint-disable-next-line no-undefined
          { ...store.getState(), derived: undefined },
      });
    };
    store.subscribe(bookmarkReduxStateTree);

    // Add the "slycatEmbedded" class to the body if state has embed set to true
    if (store.getState().derived.embed) {
      document.body.classList.add("slycatEmbedded");
      // Add the "hideControls" class to the body if state has hideControls set to true
      if (store.getState().derived.hideControls) {
        document.body.classList.add("hideControls");
        layout.hide("north");
      }
      // Add the "hideTable" class to the body if state has hideTable set to true
      if (store.getState().derived.hideTable) {
        document.body.classList.add("hideTable");
        layout.hide("south");
      }
      // Add the "hideScatterplot" class to the body if state has hideScatterplot set to true.
      // We don't currently support hiding the scatterplot in embedded mode, but we can add the class
      // to the body in case we want to support it in the future.
      if (store.getState().derived.hideScatterplot) {
        document.body.classList.add("hideScatterplot");
        // Neither of these work to hide the scatterplot pane because it's the center pane.
        // layout.hide("center");
        // layout.close("center");
      }
      // Add the "hideBarplot" class to the body if state has hideBarplot set to true
      if (store.getState().derived.hideBarplot) {
        document.body.classList.add("hideBarplot");
        layout.hide("west");
      }
      // Resize the entire layout to fit its container, which probably changed size when the class was added.
      layout.resizeAll();
    }

    render_components();
  }

  // ToDo: hook this up to numerous pieces of code that try to download model data.
  function artifact_missing() {
    $(".load-status").css("display", "none");

    dialog.dialog({
      title: "Load Error",
      message:
        "Oops, there was a problem retrieving data from the model. This likely means that there was a problem during computation.",
    });
  }

  //////////////////////////////////////////////////////////////////////////////////////////
  // Render React components
  //////////////////////////////////////////////////////////////////////////////////////////
  function render_components() {
    const cca_barplot = (
      <Provider store={store}>
        <CCABarplot />
      </Provider>
    );
    const cca_barplot_root = createRoot(document.getElementById("barplot-table"));
    cca_barplot_root.render(cca_barplot);

    const cca_scatterplot = (
      <Provider store={store}>
        <CCAScatterplot
          border={{ top: 40, right: 150, bottom: 40, left: 40 }}
          label_offset={{ x: 25, y: 25 }}
          drag_threshold={3}
          pick_distance={3}
          font_size={"14px"}
          font_family={"Arial"}
        />
      </Provider>
    );
    const cca_scatterplot_root = createRoot(document.getElementById("scatterplot-pane"));
    cca_scatterplot_root.render(cca_scatterplot);

    const cca_table = (
      <Provider store={store}>
        <CCATable aid="data-table" />
      </Provider>
    );
    const cca_table_root = createRoot(document.getElementById("table-pane"));
    cca_table_root.render(cca_table);

    const color_variable_dropdown_items = [];
    for (let color_variable of redux_state_tree.derived.color_variables) {
      color_variable_dropdown_items.push({
        key: color_variable,
        name: redux_state_tree.derived.table_metadata["column-names"][color_variable],
      });
    }

    const cca_controls_bar = (
      <Provider store={store}>
        <CCAControlsBar
          // selection={store.getState().simulations_selected}
          // mid={model._id}
          aid={"data-table"}
          // model_name={window.model_name}
          // metadata={table_metadata}
          color_variables={color_variable_dropdown_items}
          // indices={indices}
        />
      </Provider>
    );
    const cca_controls_root = createRoot(document.getElementById("cca-controls-bar"));
    cca_controls_root.render(cca_controls_bar);
  }
});

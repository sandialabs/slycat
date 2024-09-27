/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

import "jquery-ui/themes/base/all.css";

import "slickgrid/dist/styles/sass/slick.grid.scss";
import "slickgrid/dist/styles/sass/slick-default-theme.scss";
import "slickgrid/dist/styles/sass/slick.headerbuttons.scss";
import "css/slick-slycat-theme.css";
import "css/slycat-additions.css";
import "../css/stickies.css";
import "../css/ui.css";

import api_root from "js/slycat-api-root";
import _ from "lodash";
import ko from "knockout";
import client from "js/slycat-web-client";
import bookmark_manager from "js/slycat-bookmark-manager";
import * as dialog from "js/slycat-dialog";
import NoteManager from "./note-manager";
import FilterManager from "./filter-manager";
import URI from "urijs";
import * as chunker from "js/chunker";
import "./parameter-image-scatterplot";
import "./parameter-image-table";
import $ from "jquery";
import "jquery-ui";
// disable-selection and draggable required for jquery.layout resizing functionality
import "jquery-ui/ui/disable-selection";
import "jquery-ui/ui/widgets/draggable";
// resizable required for stickies.core.js
import "jquery-ui/ui/widgets/resizable";
import "jquery-ui/ui/widget";
import "layout-jquery3";
import "js/slycat-range-slider";
import "./category-select";

import throttle from "redux-throttle";
import ps_reducer from "./reducers";
import { initialState as rootInitialState } from "./store";
import scatterplot_reducer, {
  SLICE_NAME as SCATTERPLOT_SLICE_NAME,
  setScatterplotPaneWidth,
  setScatterplotPaneHeight,
  selectScatterplotPaneWidth,
  selectScatterplotPaneHeight,
  toggleShowHistogram,
  selectAutoScale,
  selectUnselectedPointSize,
  selectUnselectedBorderSize,
  selectSelectedPointSize,
  selectSelectedBorderSize,
  selectFontSize,
  selectFontFamily,
  selectOpenMedia,
} from "./features/scatterplot/scatterplotSlice";
import table_reducer, {
  SLICE_NAME as TABLE_SLICE_NAME,
  setTablePaneWidth,
  setTablePaneHeight,
} from "./features/table/tableSlice";
import data_reducer, {
  SLICE_NAME as DATA_SLICE_NAME,
  selectSelectedSimulations,
  selectHiddenSimulations,
  selectManuallyHiddenSimulations,
  setSelectedSimulations,
  setHiddenSimulations,
} from "./features/data/dataSlice";
import {
  setXValues,
  setYValues,
  setVValues,
  setMediaValues,
  setXIndex,
  setYIndex,
  setVIndex,
  setMediaIndex,
  setUserRole,
  setTableStatistics,
  setTableMetadata,
} from "./actions";

import { setSyncCameras } from "./vtk-camera-synchronizer";

import {
  DEFAULT_UNSELECTED_POINT_SIZE,
  DEFAULT_UNSELECTED_BORDER_SIZE,
  DEFAULT_SELECTED_POINT_SIZE,
  DEFAULT_SELECTED_BORDER_SIZE,
  DEFAULT_SCATTERPLOT_MARGIN_TOP,
  DEFAULT_SCATTERPLOT_MARGIN_RIGHT,
  DEFAULT_SCATTERPLOT_MARGIN_BOTTOM,
  DEFAULT_SCATTERPLOT_MARGIN_LEFT,
} from "components/ScatterplotOptions";
import d3 from "d3";
import { v4 as uuidv4 } from "uuid";
import slycat_color_maps from "js/slycat-color-maps";
import watch from "redux-watch";
import combinedReduction from "combined-reduction";
import { configureStore } from "@reduxjs/toolkit";
import {
  selectXColumnName,
  selectYColumnName,
  selectVColumnName,
  selectScatterplotMarginLeft,
  selectScatterplotMarginRight,
  selectScatterplotMarginTop,
  selectScatterplotMarginBottom,
  selectAxesVariables,
} from "./selectors";

import React, { StrictMode } from "react";
import { Provider } from "react-redux";
import { createRoot } from "react-dom/client";
import PSControlsBar from "./Components/PSControlsBar";
import PSTable from "./Components/PSTable";

let table_metadata = null;

// Wait for document ready
$(document).ready(function () {
  //////////////////////////////////////////////////////////////////////////////////////////
  // Setup global variables.
  //////////////////////////////////////////////////////////////////////////////////////////

  var model = null;
  var model_id = URI(window.location).segment(-1);
  var input_columns = null;
  var output_columns = null;
  var image_columns = null;
  var rating_columns = null;
  var category_columns = null;
  var other_columns = null;
  var xy_pairs = null;

  var bookmarker = null;
  var bookmark = null;
  var note_manager = null;
  var filter_manager = null;
  var filter_expression = null;

  var table_statistics = null;
  var indices = null;
  var x_index = null;
  var y_index = null;
  var v_index = null;
  var images_index = null; // Currently selected media column
  var x = null;
  var y = null;
  var v = null;
  var images = null;
  var selected_simulations = null;
  var hidden_simulations = null;
  var manually_hidden_simulations = null;
  var colormap = null;
  var colorscale = null;
  var auto_scale = null;
  var filtered_v = null;
  var open_images = null;
  var video_sync = null;
  var video_sync_time = null;

  var threeD_sync = null;

  var table_ready = false;
  var scatterplot_ready = false;
  var controls_ready = false;
  var sliders_ready = false;
  var image_uri = document.createElement("a");
  var layout = null;

  var filterxhr = null;

  var axes_font_size = null;
  var axes_font_family = null;
  var axes_variables_scale = {};
  var variable_aliases = {};

  var unselected_point_size = DEFAULT_UNSELECTED_POINT_SIZE;
  var unselected_border_size = DEFAULT_UNSELECTED_BORDER_SIZE;
  var selected_point_size = DEFAULT_SELECTED_POINT_SIZE;
  var selected_border_size = DEFAULT_SELECTED_BORDER_SIZE;

  var scatterplot_margin_top = DEFAULT_SCATTERPLOT_MARGIN_TOP;
  var scatterplot_margin_right = DEFAULT_SCATTERPLOT_MARGIN_RIGHT;
  var scatterplot_margin_bottom = DEFAULT_SCATTERPLOT_MARGIN_BOTTOM;
  var scatterplot_margin_left = DEFAULT_SCATTERPLOT_MARGIN_LEFT;

  var custom_color_variable_range = {
    min: undefined,
    max: undefined,
  };

  let tableReadyPromise = new Promise((resolve) => {
    window.resolveTableReady = resolve;
  });

  let scatterplotReadyPromise = new Promise((resolve) => {
    window.resolveScatterplotReady = resolve;
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  // Setup page layout.
  //////////////////////////////////////////////////////////////////////////////////////////

  layout = $("#parameter-image-plus-layout").layout({
    north: {
      size: 39,
      resizable: false,
    },
    center: { resizeWhileDragging: false },
    west: {
      // Sliders
      initClosed: true,
      size: $("#parameter-image-plus-layout").width() / 4,
      onresize_end: function (pane_name, pane_element, pane_state, pane_options, layout_name) {
        filter_manager.slidersPaneHeight(pane_state.innerHeight);
      },
    },
    south: {
      size: $("#parameter-image-plus-layout").height() / 4,
      resizeWhileDragging: false,
    },
    east: {
      size: $("#parameter-image-plus-layout").width() / 2,
      resizeWhileDragging: false,
      onresize_end: function () {
        $("#table").css("height", $("#table-pane").height());
        if ($("#table").data("parameter_image-table")) {
          $("#table").table("resize_canvas");
        }
      },
    },
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  // Load the model
  //////////////////////////////////////////////////////////////////////////////////////////
  function doPoll() {
    $.ajax({
      type: "GET",
      url: api_root + "models/" + model_id,
      success: function (result) {
        model = result;
        bookmarker = bookmark_manager.create(model.project, model._id);

        input_columns = model["artifact:input-columns"];
        output_columns = model["artifact:output-columns"];
        image_columns = model["artifact:image-columns"];
        rating_columns = model["artifact:rating-columns"] ?? [];
        category_columns = model["artifact:category-columns"] ?? [];
        xy_pairs = model["artifact:xy-pairs"] ?? [];
        filter_manager = new FilterManager(
          model_id,
          bookmarker,
          layout,
          input_columns,
          output_columns,
          image_columns,
          rating_columns,
          category_columns,
        );
        if (filter_manager.active_filters_ready()) {
          active_filters_ready();
        } else {
          filter_manager.active_filters_ready.subscribe(function (newValue) {
            if (newValue) {
              active_filters_ready();
              // Terminating subscription
              this.dispose();
            }
          });
        }
        if (model["state"] === "waiting" || model["state"] === "running") {
          setTimeout(doPoll, 5000);
          return;
        }
        if (model["state"] === "closed" && model["result"] === null) return;
        if (model["result"] === "failed") return;
        $(".slycat-navbar-alert").remove();
        model_loaded();
      },
      error: function (request, status, reason_phrase) {
        window.alert("Error retrieving model: " + reason_phrase);
      },
    });
  }
  doPoll();

  //////////////////////////////////////////////////////////////////////////////////////////
  // Once the model has been loaded, retrieve metadata / bookmarked state
  //////////////////////////////////////////////////////////////////////////////////////////

  // Retrieve variable alias labels
  function get_variable_aliases(resolve, reject) {
    // If the model has project_data, try to get aliases from it
    if (model.project_data && model.project_data[0]) {
      client
        .get_project_data_fetch({ did: model.project_data[0] })
        .then((project_data) => {
          if (project_data["artifact:variable_aliases"]) {
            variable_aliases = project_data["artifact:variable_aliases"];
          }
          // console.log("Set aliases from project_data");
          resolve();
        })
        .catch(() => {
          // Disabling this alert and replacing with log entry because it comes up every time user opens the model.
          // Now I am writing to model's artifact if I can't get to the project data,
          // so we don't need this alert anymore.
          // window.alert(
          //   'Ooops, this model had project data in the past but it is no longer there. ' +
          //   'Original variable aliases can not be loaded. ' +
          //   'But we will try to load any aliases that were created after the project data disappeared. '
          // );
          console.log(
            "Ooops, this model had project data in the past but it is no longer there. " +
              "Original variable aliases can not be loaded. " +
              "But we will try to load any aliases that were created after the project data disappeared.",
          );
          // Something went wrong. We have a pointer to project data, but can't retrieve it.
          // Might have gotten deleted. So let's try to load aliases from the model's attributes
          // as a last-ditch effort.
          if (model["artifact:variable_aliases"] !== undefined) {
            variable_aliases = model["artifact:variable_aliases"];
          }
          resolve();
        });
    }
    // Otherwise try to get the aliases from the model's attributes
    else if (model["artifact:variable_aliases"] !== undefined) {
      variable_aliases = model["artifact:variable_aliases"];
      // console.log('Set aliases from model');
      resolve();
    }
    // Otherwise leave variable_aliases as empty
    else {
      // console.log('We do not have aliases on project_data or model, so leaving blank.');
      resolve();
    }
  }

  var createReduxStorePromise;
  var getTableMetadataPromise;

  function model_loaded() {
    // If the model isn't ready or failed, we're done.
    if (model["state"] == "waiting" || model["state"] == "running") return;
    if (model["state"] == "closed" && model["result"] === null) return;
    if (model["result"] == "failed") return;
    // Display progress as the load happens ...
    $(".load-status").text("Loading data.");

    getTableMetadataPromise = new Promise((resolve, reject) => {
      $.ajax({
        url: api_root + "models/" + model_id + "/arraysets/data-table/metadata?arrays=0",
        contentType: "application/json",
        success: function (metadata) {
          var raw_metadata = metadata.arrays[0];
          // Mapping data from new metadata format to old table_metadata format
          table_metadata = {};
          table_metadata["row-count"] = raw_metadata.shape[0];

          // This is going to be one short for now since there is no index. Perhaps just add one for now?
          table_metadata["column-count"] = raw_metadata.attributes.length + 1;

          table_metadata["column-names"] = [];
          table_metadata["column-types"] = [];
          for (var i = 0; i < raw_metadata.attributes.length; i++) {
            table_metadata["column-names"].push(raw_metadata.attributes[i].name);
            table_metadata["column-types"].push(raw_metadata.attributes[i].type);
          }

          // Adding Index column
          table_metadata["column-names"].push("Index");
          table_metadata["column-types"].push("int64");

          filter_manager.set_table_metadata(table_metadata);
          // console.debug(`Loading table statistics for all columns after table metadata has been loaded.`);
          load_table_statistics(d3.range(table_metadata["column-count"] - 1), function () {
            table_statistics[table_metadata["column-count"] - 1] = {
              max: table_metadata["row-count"] - 1,
              min: 0,
            };
            metadata_loaded();
          });
          // console.debug(`about to call resolve`);
          resolve();
        },
        error: artifact_missing,
      });
    });

    // Load data table metadata.
    createReduxStorePromise = new Promise((resolve, reject) => {
      // Retrieve bookmarked state information ...
      bookmarker.getState(function (state) {
        bookmark = state;

        let variable_aliases_promise = new Promise(get_variable_aliases);
        variable_aliases_promise.then(() => {
          // Additional middleware for redux store
          // Create throttle for redux. Allows throttling of actions.
          const defaultWait = 500;
          const defaultThrottleOption = {
            // https://lodash.com/docs#throttle
            leading: true,
            trailing: true,
          };
          const throttleMiddleware = throttle(defaultWait, defaultThrottleOption);

          // Add unique IDs to bookmarked open_media, as these are now required.
          let bookmarked_open_media = bookmark["open-images-selection"] ?? [];
          for (let media of bookmarked_open_media) {
            if (!("uid" in media)) {
              media.uid = uuidv4();
            }
          }

          // Create redux store initial state.
          // First set sensible defaults for model without any bookmark state.
          // Then overwrite that with any state that we can get from legacy bookmark data.
          // Next overwrite that with any state that we can get from new bookmark data (i.e., bookmark.state).
          // Finally merge in derived state slice with data retrieved from slycat api.

          const legacyBookmarkState = {
            colormap: bookmark["colormap"],
            open_media: bookmarked_open_media,
            video_sync: bookmark["video-sync"],
            video_sync_time: bookmark["video-sync-time"],
            x_index: x_index,
            y_index: y_index,
            v_index: v_index,
            [SCATTERPLOT_SLICE_NAME]: {
              auto_scale: bookmark["auto-scale"],
            },
            [DATA_SLICE_NAME]: {
              selected_simulations:
                bookmark.state?.["selected_simulations"] ?? bookmark["simulation-selection"],
              hidden_simulations:
                bookmark.state?.["hidden_simulations"] ?? bookmark["hidden-simulations"],
              manually_hidden_simulations:
                bookmark.state?.["manually_hidden_simulations"] ??
                bookmark["manually-hidden-simulations"],
            },
          };

          const derivedState = {
            derived: {
              variableAliases: variable_aliases,
              media_columns: image_columns,
              rating_variables: rating_columns,
              xy_pairs: xy_pairs,
              // Set "embed" to true if the "embed" query parameter is present
              embed: URI(window.location).query(true).embed !== undefined,
              hideControls: URI(window.location).query(true).hideControls !== undefined,
              hideTable: URI(window.location).query(true).hideTable !== undefined,
              hideScatterplot: URI(window.location).query(true).hideScatterplot !== undefined,
              hideFilters: URI(window.location).query(true).hideFilters !== undefined,
            },
          };

          const preloadedState = _.merge(
            {},
            rootInitialState,
            legacyBookmarkState,
            bookmark.state,
            derivedState,
          );

          // Create reducer that combines root-level ps_reducer and adds scatterplot_reducer, table_reducer, and other new reducers.
          // This allows mixing our legacy Redux root-level ps_reducer with Redux Toolkit
          // createSlice scatterplot_reducer, table_reducer, and other new reducers.
          const reducer = combinedReduction(ps_reducer, {
            [SCATTERPLOT_SLICE_NAME]: scatterplot_reducer,
            [TABLE_SLICE_NAME]: table_reducer,
            [DATA_SLICE_NAME]: data_reducer,
          });

          window.store = configureStore({
            reducer: reducer,
            middleware: (getDefaultMiddleware) =>
              getDefaultMiddleware({
                serializableCheck: {
                  // Ignore these action types
                  ignoredActions: [
                    "SET_X_VALUES",
                    "SET_Y_VALUES",
                    "SET_V_VALUES",
                    "UPDATE_THREE_D_CAMERAS",
                  ],
                  // Ignore these field paths in all actions
                  // ignoredActionPaths: ["meta.arg", "payload.timestamp"],
                  // Ignore these paths in the state
                  ignoredPaths: ["derived.xValues", "derived.yValues", "derived.vValues"],
                },
              }).concat(throttleMiddleware),
            devTools: process.env.NODE_ENV !== "production",
            preloadedState: preloadedState,
          });

          // Save Redux state to bookmark whenever it changes
          const bookmarkReduxStateTree = () => {
            bookmarker.updateState({
              state:
                // Remove derived property from state tree because it should be computed
                // from model data each time the model is loaded. Otherwise it has the
                // potential of becoming huge. Plus we shouldn't be storing model data
                // in the bookmark, just UI state.
                // Passing 'undefined' removes it from bookmark. Passing 'null' actually
                // sets it to null, so I think it's better to remove it entirely.
                // eslint-disable-next-line no-undefined
                { ...window.store.getState(), derived: undefined },
            });
          };
          window.store.subscribe(bookmarkReduxStateTree);

          // Set local variables based on Redux store
          axes_font_size = selectFontSize(store.getState());
          axes_font_family = selectFontFamily(store.getState());
          axes_variables_scale = _.cloneDeep(selectAxesVariables(store.getState()));
          unselected_point_size = selectUnselectedPointSize(store.getState());
          unselected_border_size = selectUnselectedBorderSize(store.getState());
          selected_point_size = selectSelectedPointSize(store.getState());
          selected_border_size = selectSelectedBorderSize(store.getState());
          scatterplot_margin_top = selectScatterplotMarginTop(store.getState());
          scatterplot_margin_right = selectScatterplotMarginRight(store.getState());
          scatterplot_margin_bottom = selectScatterplotMarginBottom(store.getState());
          scatterplot_margin_left = selectScatterplotMarginLeft(store.getState());
          open_images = _.cloneDeep(selectOpenMedia(store.getState()));
          auto_scale = selectAutoScale(store.getState());
          selected_simulations = _.cloneDeep(selectSelectedSimulations(store.getState()));
          hidden_simulations = _.cloneDeep(selectHiddenSimulations(store.getState()));
          manually_hidden_simulations = _.cloneDeep(
            selectManuallyHiddenSimulations(store.getState()),
          );

          // Setting the user's role in redux state
          // Get the slycat-navbar knockout component since it already calculates the user's role
          let navbar = ko.contextFor(
            document.getElementById("slycat-navbar-container").children[0],
          ).$component;
          // Get the role from slycat-navbar component
          const relation = navbar.relation();
          // Save it to redux state
          window.store.dispatch(setUserRole(relation));

          // Add the "slycatEmbedded" class to the body if state has embed set to true
          if (window.store.getState().derived.embed) {
            document.body.classList.add("slycatEmbedded");
            // Add the "hideControls" class to the body if state has hideControls set to true
            if (window.store.getState().derived.hideControls) {
              document.body.classList.add("hideControls");
              layout.hide("north");
            }
            // Add the "hideTable" class to the body if state has hideTable set to true
            if (window.store.getState().derived.hideTable) {
              document.body.classList.add("hideTable");
              layout.hide("south");
            }
            // Add the "hideScatterplot" class to the body if state has hideScatterplot set to true.
            // We don't currently support hiding the scatterplot in embedded mode, but we can add the class
            // to the body in case we want to support it in the future.
            if (window.store.getState().derived.hideScatterplot) {
              document.body.classList.add("hideScatterplot");
              // Neither of these work to hide the scatterplot pane because it's the center pane.
              // layout.hide("center");
              // layout.close("center");
            }
            // Add the "hideFilters" class to the body if state has hideFilters set to true
            if (window.store.getState().derived.hideFilters) {
              document.body.classList.add("hideFilters");
              layout.hide("west");
            }
            // Resize the entire layout to fit its container, which probably changed size when the class was added.
            layout.resizeAll();
          }

          // set this in callback for now to keep FilterManager isolated but avoid a duplicate GET bookmark AJAX call
          filter_manager.set_bookmark(bookmark);
          filter_manager.notify_store_ready();
          resolve();
          setup_controls();
          setup_scatterplot();
          setup_table();
          metadata_loaded();
        });

        // instantiate this in callback for now to keep NoteManager isolated but avoid a duplicate GET bookmark AJAX call
        note_manager = new NoteManager(model_id, bookmarker, bookmark);
      });
    });

    Promise.all([getTableMetadataPromise, createReduxStorePromise]).then(() => {
      // Dispatch update to table_metadata in Redux
      // console.debug(`getTableMetadataPromise`);
      window.store.dispatch(setTableMetadata(table_metadata));
    });

    // Wait until the redux store has been created
    createReduxStorePromise.then(() => {
      // Wait for the table and scatterplot to be ready,
      // otherwise jquery complains about some of the callbacks
      // setting table and scatterplot options before they are ready.
      // Once we get rid of the scatterplot and table jquery widgets,
      // we can get rid of this.
      Promise.all([tableReadyPromise, scatterplotReadyPromise]).then(() => {
        // Subscribing to changes in various states
        [
          { objectPath: "colormap", callback: selected_colormap_changed },
          { objectPath: "scatterplot.auto_scale", callback: auto_scale_option_changed },
          { objectPath: "data.selected_simulations", callback: selected_simulations_changed },
          { objectPath: "x_index", callback: x_index_changed },
          { objectPath: "y_index", callback: y_index_changed },
          { objectPath: "v_index", callback: v_index_changed },
          { objectPath: "media_index", callback: media_index_changed },
          { objectPath: "variableRanges", callback: variable_ranges_changed },
          { objectPath: "video_sync", callback: video_sync_changed },
          { objectPath: "threeD_sync", callback: threeD_sync_changed },
          { objectPath: "video_sync_time", callback: video_sync_time_changed },
          { objectPath: "data.hidden_simulations", callback: hidden_simulations_changed },
          {
            objectPath: "data.manually_hidden_simulations",
            callback: manually_hidden_simulations_changed,
          },
        ].forEach((subscription) => {
          window.store.subscribe(
            watch(
              window.store.getState,
              subscription.objectPath,
              _.isEqual,
            )((newVal, oldVal, objectPath) => {
              subscription.callback(newVal, oldVal, objectPath);
            }),
          );
        });
      });

      // Set size of scatterplot pane in Redux
      window.store.dispatch(setScatterplotPaneWidth(layout.state.center.innerWidth));
      window.store.dispatch(setScatterplotPaneHeight(layout.state.center.innerHeight));

      // Set size of table pane in Redux
      window.store.dispatch(setTablePaneWidth(layout.state.south.innerWidth));
      window.store.dispatch(setTablePaneHeight(layout.state.south.innerHeight));

      // Update scatterplot and Redux each time the scatterplot pane is resized
      layout.center.options.onresize_end = (
        pane_name,
        pane_element,
        pane_state,
        pane_options,
        layout_name,
      ) => {
        const width = pane_state.innerWidth;
        const height = pane_state.innerHeight;

        if ($("#scatterplot").data("parameter_image-scatterplot")) {
          $("#scatterplot").scatterplot("option", {
            width: width,
            height: height,
          });
        }
        window.store.dispatch(setScatterplotPaneWidth(width));
        window.store.dispatch(setScatterplotPaneHeight(height));
      };

      // Update table pane in Redux each time the table pane is resized
      layout.south.options.onresize_end = (pane_name, pane_element, pane_state, pane_options) => {
        const width = pane_state.innerWidth;
        const height = pane_state.innerHeight;
        window.store.dispatch(setTablePaneWidth(width));
        window.store.dispatch(setTablePaneHeight(height));
      };
    });
  }

  function artifact_missing() {
    $(".load-status").css("display", "none");

    dialog.dialog({
      title: "Load Error",
      message:
        "Oops, there was a problem retrieving data from the model. This likely means that there was a problem during computation.",
    });
  }

  //////////////////////////////////////////////////////////////////////////////////////////
  // Setup the rest of the UI as data is received.
  //////////////////////////////////////////////////////////////////////////////////////////

  function metadata_loaded() {
    if (table_metadata) {
      other_columns = [];
      for (var i = 0; i != table_metadata["column-count"] - 1; ++i) {
        if ($.inArray(i, input_columns) == -1 && $.inArray(i, output_columns) == -1) {
          other_columns.push(i);
        }
      }
      filter_manager.set_other_columns(other_columns);
    }

    setup_table();

    if (!indices && table_metadata) {
      var count = table_metadata["row-count"];
      indices = new Int32Array(count);
      for (var i = 0; i != count; ++i) indices[i] = i;
    }

    setup_controls();
    filter_manager.set_table_statistics(table_statistics);

    if (table_metadata && bookmark) {
      // Choose some columns for the X and Y axes.
      var x_y_variables = [];

      // First add inputs and outputs to possible columns
      x_y_variables.push.apply(x_y_variables, input_columns);
      x_y_variables.push.apply(x_y_variables, output_columns);

      for (var i = 0; i < table_metadata["column-count"] - 1; i++) {
        // Only use non-string columns
        // TODO: check if we need to only do ono strings for some reason
        if (table_metadata["column-types"][i] != "string") x_y_variables.push(i);
      }

      // Set x and y variables accoding to what's in the bookmarked redux state,
      // fall back to bookmarked legacy state, then to a sensible default.
      x_index = Number(bookmark.state?.x_index ?? bookmark["x-selection"] ?? x_y_variables[0]);
      y_index = Number(
        bookmark.state?.y_index ??
          bookmark["y-selection"] ??
          x_y_variables[1 % x_y_variables.length],
      );

      // Wait until the redux store has been created
      createReduxStorePromise.then(() => {
        // Dispatch update to x and y indexes in Redux
        window.store.dispatch(setXIndex(x_index));
        window.store.dispatch(setYIndex(y_index));
      });

      video_sync = false;
      if ("video-sync" in bookmark) {
        video_sync = bookmark["video-sync"];
      }
      video_sync_time = 0;
      if ("video-sync-time" in bookmark) {
        video_sync_time = bookmark["video-sync-time"];
      }

      // Wait until the redux store has been created
      createReduxStorePromise.then(() => {
        threeD_sync = false;
        if ("threeD_sync" in window.store.getState()) {
          threeD_sync = window.store.getState().threeD_sync;
        }
        setSyncCameras(threeD_sync);
        setup_controls();
      });

      chunker.get_model_array_attribute({
        api_root: api_root,
        mid: model_id,
        aid: "data-table",
        array: 0,
        attribute: x_index,
        success: function (result) {
          x = result;
          if (table_metadata["column-types"][x_index] == "string") {
            x = x[0];
          }
          // Wait until the redux store has been created
          createReduxStorePromise.then(() => {
            // Dispatch update to x values in Redux
            window.store.dispatch(setXValues(x));
            setup_scatterplot();
            setup_table();
          });
        },
        error: artifact_missing,
      });

      chunker.get_model_array_attribute({
        api_root: api_root,
        mid: model_id,
        aid: "data-table",
        array: 0,
        attribute: y_index,
        success: function (result) {
          y = result;
          if (table_metadata["column-types"][y_index] == "string") {
            y = y[0];
          }
          // Wait until the redux store has been created
          createReduxStorePromise.then(() => {
            // Dispatch update to y values in Redux
            window.store.dispatch(setYValues(y));
            setup_scatterplot();
            setup_table();
          });
        },
        error: artifact_missing,
      });

      v_index = table_metadata["column-count"] - 1;
      if ("variable-selection" in bookmark) {
        v_index = Number(bookmark["variable-selection"]);
      }

      // Wait until the redux store has been created
      createReduxStorePromise.then(() => {
        // Dispatch update to v index in Redux
        window.store.dispatch(setVIndex(v_index));
      });

      if (v_index == table_metadata["column-count"] - 1) {
        var count = table_metadata["row-count"];
        v = new Float64Array(count);
        for (var i = 0; i != count; ++i) v[i] = i;

        // Wait until the redux store has been created
        createReduxStorePromise.then(() => {
          // Dispatch update to v values in Redux
          window.store.dispatch(setVValues(v));
          // console.log(`window.store.dispatch(setVValues(v));`);
          update_current_colorscale();
          setup_scatterplot();
          setup_table();
        });
      } else {
        chunker.get_model_array_attribute({
          api_root: api_root,
          mid: model_id,
          aid: "data-table",
          array: 0,
          attribute: v_index,
          success: function (result) {
            v = result;
            if (table_metadata["column-types"][v_index] == "string") {
              v = v[0];
            }
            // Wait until the redux store has been created
            createReduxStorePromise.then(() => {
              // Dispatch update to v values in Redux
              window.store.dispatch(setVValues(v));
              update_current_colorscale();
              setup_scatterplot();
              setup_table();
            });
          },
          error: artifact_missing,
        });
      }

      images_index = -1;
      // Set images index from bookmark if it's there
      if ("images-selection" in bookmark) {
        images_index = bookmark["images-selection"];
      }
      // Wait until the redux store has been created
      createReduxStorePromise.then(() => {
        // Dispatch update to media index in Redux
        window.store.dispatch(setMediaIndex(images_index));
      });
      // We don't want to set it to the first column because we have a
      // None option that users can select to get rid of media sets.
      // // Otherwise set it to the first images column if we have any
      // else if(image_columns.length > 0)
      // {
      //   images_index = image_columns[0];
      // }
      setup_table();
      if (image_columns.length > 0 && images_index > -1) {
        $.ajax({
          type: "GET",
          url:
            api_root +
            "models/" +
            model_id +
            "/arraysets/data-table/data?hyperchunks=0/" +
            images_index +
            "/0:" +
            table_metadata["row-count"],
          success: function (result) {
            images = result[0];
            // Wait until the redux store has been created
            createReduxStorePromise.then(() => {
              // Dispatch update to media values in Redux
              window.store.dispatch(setMediaValues(images));
              setup_scatterplot();
              //setup_table();
            });
          },
          error: artifact_missing,
        });
      } else {
        images = undefined;
        setup_scatterplot();
      }
      setup_controls();
    }
  }

  function setup_table() {
    if (
      !table_ready &&
      table_metadata &&
      colorscale &&
      bookmark &&
      x_index != null &&
      y_index != null &&
      images_index !== null &&
      selected_simulations != null &&
      hidden_simulations != null &&
      input_columns != null &&
      output_columns != null &&
      other_columns != null &&
      image_columns != null &&
      window.store !== undefined
    ) {
      table_ready = true;

      $("#table-pane .load-status").css("display", "none");

      var table_options = {
        api_root: api_root,
        mid: model_id,
        aid: "data-table",
        metadata: table_metadata,
        inputs: input_columns,
        outputs: output_columns,
        others: other_columns,
        images: image_columns,
        "image-variable": images_index,
        "x-variable": x_index,
        "y-variable": y_index,
        "row-selection": selected_simulations,
        hidden_simulations: hidden_simulations,
        colorscale: colorscale,
      };

      if ("sort-variable" in bookmark && "sort-order" in bookmark) {
        table_options["sort-variable"] = bookmark["sort-variable"];
        var sort_order = bookmark["sort-order"];

        // Mapping between old grammar and new one
        if (sort_order == "ascending") sort_order = "asc";
        else if (sort_order == "descending") sort_order = "desc";

        table_options["sort-order"] = bookmark["sort-order"];
      }

      if ("variable-selection" in bookmark) {
        table_options["variable-selection"] = [bookmark["variable-selection"]];
      } else {
        table_options["variable-selection"] = [table_metadata["column-count"] - 1];
      }

      $("#table").table(table_options);

      // Log changes to the table sort order ...
      $("#table").bind("variable-sort-changed", function (event, variable, order) {
        variable_sort_changed(variable, order);
      });

      // Changing the table row selection updates the scatterplot...
      // Log changes to the table row selection ...
      $("#table").bind("row-selection-changed", function (event, selection) {
        // The table selection is an array buffer which can't be
        // serialized as JSON, so convert it to an array.
        var temp = [];
        for (var i = 0; i != selection.length; ++i) temp.push(selection[i]);

        selected_simulations_changed(temp);
        $("#scatterplot").scatterplot("option", "selection", temp);
      });

      // Resolve the tableReadyPromise
      window.resolveTableReady();

      // Changing the scatterplot selection updates the table row selection ...
      $("#scatterplot").bind("selection-changed", function (event, selection) {
        $("#table").table("option", "row-selection", selection);
      });

      const react_controls_root = createRoot(document.getElementById("ps-table"));
      react_controls_root.render(
        <StrictMode>
          <Provider store={window.store}>
            <PSTable
              api_root={api_root}
              mid={model_id}
              aid={"data-table"}
              metadata={table_metadata}
              inputs={input_columns}
              outputs={output_columns}
              others={other_columns}
              images={image_columns}
              image_variable={images_index}
              x_variable={x_index}
              y_variable={y_index}
              row_selection={selected_simulations}
              hidden_simulations={hidden_simulations}
              colorscale={colorscale}
            />
          </Provider>
        </StrictMode>,
      );
    }
  }

  function setup_scatterplot() {
    // Setup the scatterplot ...
    if (
      !scatterplot_ready &&
      bookmark &&
      indices &&
      x &&
      y &&
      v &&
      images !== null &&
      colorscale &&
      selected_simulations != null &&
      hidden_simulations != null &&
      auto_scale != null &&
      open_images !== null &&
      video_sync !== null &&
      video_sync_time !== null &&
      threeD_sync !== null &&
      window.store !== undefined
    ) {
      scatterplot_ready = true;

      $("#scatterplot-pane .load-status").css("display", "none");

      $("#scatterplot-pane").css(
        "background",
        slycat_color_maps.get_background(store.getState().colormap).toString(),
      );

      $("#scatterplot").scatterplot({
        model: model,
        indices: indices,
        x_label: selectXColumnName(window.store.getState()),
        y_label: selectYColumnName(window.store.getState()),
        v_label: selectVColumnName(window.store.getState()),
        x: x,
        y: y,
        v: v,
        x_string: table_metadata["column-types"][x_index] == "string",
        y_string: table_metadata["column-types"][y_index] == "string",
        v_string: table_metadata["column-types"][v_index] == "string",
        x_index: x_index,
        y_index: y_index,
        v_index: v_index,
        images: images,
        width: selectScatterplotPaneWidth(window.store.getState()),
        height: selectScatterplotPaneHeight(window.store.getState()),
        colorscale: colorscale,
        selection: selected_simulations,
        open_images: open_images,
        gradient: slycat_color_maps.get_gradient_data(store.getState().colormap),
        hidden_simulations: hidden_simulations,
        "auto-scale": auto_scale,
        "video-sync": video_sync,
        "video-sync-time": video_sync_time,
        threeD_sync: threeD_sync,
        axes_font_size: axes_font_size,
        axes_font_family: axes_font_family,
        axes_variables_scale: axes_variables_scale,
        canvas_square_size: unselected_point_size,
        canvas_square_border_size: unselected_border_size,
        canvas_selected_square_size: selected_point_size,
        canvas_selected_square_border_size: selected_border_size,
        margin_top: scatterplot_margin_top,
        margin_right: scatterplot_margin_right,
        margin_bottom: scatterplot_margin_bottom,
        margin_left: scatterplot_margin_left,
      });

      $("#scatterplot").bind("selection-changed", function (event, selection) {
        selected_simulations_changed(selection);
      });

      // Changing the x variable updates the scatterplot ...
      $("#table").bind("x-selection-changed", function (event, variable) {
        update_scatterplot_x(variable);
      });

      // Changing the y variable updates the scatterplot ...
      $("#table").bind("y-selection-changed", function (event, variable) {
        update_scatterplot_y(variable);
      });

      // Changing the images variable updates the scatterplot ...
      $("#table").bind("images-selection-changed", function (event, variable) {
        handle_image_variable_change(variable);
      });

      // Jumping to simulation ...
      $("#scatterplot").bind("jump_to_simulation", function (event, index) {
        // Alerts the table
        $("#table").table("option", "jump_to_simulation", parseInt(index));
        video_sync_time_changed(video_sync_time);
      });

      window.resolveScatterplotReady();
    }
  }

  function setup_controls() {
    if (
      !controls_ready &&
      bookmark &&
      table_metadata &&
      image_columns !== null &&
      x_index !== null &&
      y_index !== null &&
      selected_simulations !== null &&
      hidden_simulations !== null &&
      indices &&
      window.store !== undefined
    ) {
      controls_ready = true;
      filter_manager.notify_controls_ready();
      var axes_variables = [];
      var color_variables = [];

      for (var i = 0; i < table_metadata["column-count"]; i++) {
        if (image_columns.indexOf(i) == -1 && table_metadata["column-count"] - 1 > i) {
          axes_variables.push(i);
        }
        if (image_columns.indexOf(i) == -1) {
          color_variables.push(i);
        }
      }

      const controls_bar = (
        <PSControlsBar
          store={window.store}
          axes_variables={axes_variables}
          indices={indices}
          mid={model_id}
          aid={"data-table"}
          model={model}
          model_name={window.model_name}
          x_variables={axes_variables}
          y_variables={axes_variables}
          image_variables={image_columns}
          color_variables={color_variables}
          write_data={writeData}
        />
      );
      const react_controls_root = createRoot(document.getElementById("react-controls"));
      react_controls_root.render(controls_bar);
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////
  // Event handlers.
  //////////////////////////////////////////////////////////////////////////////////////////

  function writeData(selection, variable, value) {
    var hyperslices = "";
    var data = "[";
    for (var i = 0; i < selection.length; i++) {
      if (i > 0) {
        hyperslices += "|";
        data += ",";
      }
      hyperslices += selection[i];
      data += "[" + value + "]";
    }
    data += "]";
    var blob = new Blob([data], { type: "text/html" });
    var formdata = new FormData();
    formdata.append("data", blob);
    formdata.append("hyperchunks", 0 + "/" + variable + "/" + hyperslices);

    $.ajax({
      type: "PUT",
      url: api_root + "models/" + model_id + "/arraysets/data-table/data",
      data: formdata,
      processData: false,
      contentType: false,
      success: function (results) {
        // Let's pass the edited variable to the table so it knows which column's
        // ranked_indices to invalidate
        $("#table").table("update_data", variable);

        if (variable == x_index) update_scatterplot_x(variable);
        if (variable == y_index) update_scatterplot_y(variable);

        // console.debug(`Loading table statistics after a variable has been edited.`);
        load_table_statistics([variable], function (new_table_statistics) {
          // Not sure why we wait for new table statistics before calling
          // update_v since we don't do that for updating x and y.
          // But it's been in the code for very long so I'm leaving it as is.
          if (variable == v_index) {
            update_v(variable);
          }
          // Update filter manager with new table statistics
          filter_manager.set_table_statistics(new_table_statistics);
          // Let filter manager know that a variable has been changed so it can possibly
          // update categorical unique values or numeric min/max
          // filter_manager.load_unique_categories();
          filter_manager.notify_variable_value_edited(variable);
        });
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.log("writing array data error");
      },
    });
  }

  function selected_colormap_changed(colormap, oldColormap, objectPath) {
    update_current_colorscale();

    // Changing the color map updates the table with a new color scale ...
    $("#table").table("option", "colorscale", colorscale);

    // Changing the color scale updates the scatterplot ...
    $("#scatterplot-pane").css("background", slycat_color_maps.get_background(colormap).toString());
    $("#scatterplot").scatterplot("option", {
      colorscale: colorscale,
      gradient: slycat_color_maps.get_gradient_data(colormap),
    });

    $.ajax({
      type: "POST",
      url: api_root + "events/models/" + model_id + "/select/colormap/" + colormap,
    });

    bookmarker.updateState({ colormap: colormap });
  }

  function handle_color_variable_change(variable) {
    v_index = Number(variable);

    if (v_index == table_metadata["column-count"] - 1) {
      var count = table_metadata["row-count"];
      for (var i = 0; i != count; ++i) v[i] = i;
      update_widgets_after_color_variable_change();
    } else {
      update_v(variable);
    }

    $.ajax({
      type: "POST",
      url: api_root + "events/models/" + model_id + "/select/variable/" + variable,
    });

    bookmarker.updateState({ "variable-selection": variable });

    // Dispatch update to v index in Redux
    window.store.dispatch(setVIndex(v_index));
  }

  function handle_image_variable_change(variable) {
    images_index = Number(variable);
    images = [];

    // Dispatch update to media values in Redux
    window.store.dispatch(setMediaIndex(images_index));

    if (images_index > -1) {
      // Get entire data column for current image variable and pass it to scatterplot and dendrogram
      $.ajax({
        type: "GET",
        url:
          api_root +
          "models/" +
          model_id +
          "/arraysets/data-table/data?hyperchunks=0/" +
          images_index +
          "/0:" +
          table_metadata["row-count"],
        success: function (result) {
          images = result[0];
          // Passing new images to scatterplot
          $("#scatterplot").scatterplot("option", "images", images);
          // Dispatch update to media values in Redux
          window.store.dispatch(setMediaValues(images));
        },
        error: artifact_missing,
      });
    } else {
      // Passing new images to scatterplot
      $("#scatterplot").scatterplot("option", "images", images);
      // Dispatch update to media values in Redux
      window.store.dispatch(setMediaValues(images));
    }

    // Log changes to and bookmark the images variable ...
    images_selection_changed(images_index);
  }

  function images_selection_changed(variable) {
    $.ajax({
      type: "POST",
      url: api_root + "events/models/" + model_id + "/select/images/" + variable,
    });
    bookmarker.updateState({ "images-selection": variable });
  }

  function update_v(variable) {
    chunker.get_model_array_attribute({
      api_root: api_root,
      mid: model_id,
      aid: "data-table",
      array: 0,
      attribute: variable,
      success: function (result) {
        v = result;
        if (table_metadata["column-types"][variable] == "string") {
          v = v[0];
        }
        // Dispatch update to v values in Redux
        window.store.dispatch(setVValues(v));
        update_widgets_after_color_variable_change();
      },
      error: artifact_missing,
    });
  }

  function update_widgets_after_color_variable_change() {
    update_current_colorscale();
    $("#table").table("option", "colorscale", colorscale);
    $("#scatterplot").scatterplot("option", "v_index", v_index);
    $("#scatterplot").scatterplot("update_color_scale_and_v", {
      v: v,
      v_string: table_metadata["column-types"][v_index] == "string",
      colorscale: colorscale,
    });
    $("#scatterplot").scatterplot("option", "v_label", selectVColumnName(window.store.getState()));
  }

  function update_widgets_when_hidden_simulations_change() {
    // Logging every hidden simulation is too slow, so just log the count instead.
    $.ajax({
      type: "POST",
      url: api_root + "events/models/" + model_id + "/hidden/count/" + hidden_simulations.length,
    });
    bookmarker.updateState({
      "hidden-simulations": hidden_simulations,
    });

    if (auto_scale) {
      update_current_colorscale();
      if ($("#table").data("parameter_image-table"))
        $("#table").table("option", {
          hidden_simulations: hidden_simulations,
          colorscale: colorscale,
        });
      // TODO this will result in 2 updates to canvas, one to redraw points according to hidden simulations and another to color them according to new colorscale. Need to combine this to a single update when converting to canvas.
      if ($("#scatterplot").data("parameter_image-scatterplot"))
        $("#scatterplot").scatterplot("option", {
          hidden_simulations: hidden_simulations,
          colorscale: colorscale,
        });
    } else {
      if ($("#table").data("parameter_image-table"))
        $("#table").table("option", "hidden_simulations", hidden_simulations);
      if ($("#scatterplot").data("parameter_image-scatterplot"))
        $("#scatterplot").scatterplot("option", "hidden_simulations", hidden_simulations);
    }
  }

  function set_custom_color_variable_range() {
    // console.log(`set_custom_color_variable_range`);
    const variableRanges = window.store.getState().variableRanges[v_index];
    custom_color_variable_range.min = variableRanges?.min ?? undefined;
    custom_color_variable_range.max = variableRanges?.max ?? undefined;
  }

  function update_current_colorscale() {
    set_custom_color_variable_range();
    // Check if numeric or string variable
    var v_type = table_metadata["column-types"][v_index];
    if (auto_scale) {
      filtered_v = filterValues(v);
    } else {
      filtered_v = v;
    }

    if (v_type != "string") {
      let axes_variables = store.getState().axesVariables[v_index];
      let v_axis_type = axes_variables ?? "Linear";
      // console.log(`v_axis_type is ${v_axis_type}`);

      // console.debug(`store.getState().colormap is %o`, store.getState().colormap);
      const colormap = store.getState().colormap;
      const min = custom_color_variable_range.min ?? d3.min(filtered_v);
      const max = custom_color_variable_range.max ?? d3.max(filtered_v);
      colorscale =
        v_axis_type == "Log"
          ? slycat_color_maps.get_color_scale_log(colormap, min, max)
          : slycat_color_maps.get_color_scale(colormap, min, max);
    } else {
      var uniqueValues = d3.set(filtered_v).values().sort();
      colorscale = slycat_color_maps.get_color_scale_ordinal(
        store.getState().colormap,
        uniqueValues,
      );
    }
  }

  // Filters source values by removing hidden_simulations
  function filterValues(source) {
    var self = this;
    hidden_simulations.sort(d3.ascending);
    var length = hidden_simulations.length;

    var filtered = cloneArrayBuffer(source);

    for (var i = length - 1; i >= 0; i--) {
      filtered.splice(hidden_simulations[i], 1);
    }

    return filtered;
  }

  // Clones an ArrayBuffer or Array
  function cloneArrayBuffer(source) {
    // Array.apply method of turning an ArrayBuffer into a normal
    // array is very fast (around 5ms for 250K) but
    // doesn't work in WebKit with arrays longer than about 125K
    // if(source.length > 1)
    // {
    //   return Array.apply( [], source );
    // }
    // else if(source.length == 1)
    // {
    //   return [source[0]];
    // }
    // return [];

    // For loop method is much slower (around 300ms for 250K)
    // but works in WebKit. Might be able to speed things up by
    // using ArrayBuffer.subarray() method to make smallery
    // arrays and then Array.apply those.
    let clone = [];
    for (let i = 0; i < source.length; i++) {
      clone.push(source[i]);
    }

    return clone;
  }

  function variable_sort_changed(variable, order) {
    $.ajax({
      type: "POST",
      url: api_root + "events/models/" + model_id + "/select/sort-order/" + variable + "/" + order,
    });
    bookmarker.updateState({ "sort-variable": variable, "sort-order": order });
  }

  function selected_simulations_changed(selection, old_selection, objectPath) {
    // console.log("selected_simulations_changed");
    // Logging every selected item is too slow, so just log the count instead.
    $.ajax({
      type: "POST",
      url: api_root + "events/models/" + model_id + "/select/simulation/count/" + selection.length,
    });
    selected_simulations = _.cloneDeep(selection);

    // If we have an old_selection it means this came from Redux, so we don't need to update Redux again.
    // But we do need to let the other non-React components know about the new selection.
    if (old_selection !== undefined) {
      $("#scatterplot").scatterplot("option", "selection", _.cloneDeep(selection));
      $("#table").table("option", "row-selection", _.cloneDeep(selection));
    } else {
      // Dispatch update to selected_simulations in Redux
      window.store.dispatch(setSelectedSimulations(selection));
    }
  }

  function x_index_changed(variable) {
    // Update legacy table and scatterplot components when x variable changes in Redux.
    // These need to be removed when we convert these components to React.
    // Update table
    $("#table").table("option", "x-variable", variable);
    // Update scatterplot
    update_scatterplot_x(variable);

    // Log changes to the x variable ...
    $.ajax({
      type: "POST",
      url: api_root + "events/models/" + model_id + "/select/x/" + variable,
    });
    bookmarker.updateState({ "x-selection": variable });
    x_index = Number(variable);
  }

  function y_index_changed(variable) {
    // Update legacy table and scatterplot components when y variable changes in Redux.
    // These need to be removed when we convert these components to React.
    // Update table
    $("#table").table("option", "y-variable", variable);
    // Update scatterplot
    update_scatterplot_y(variable);

    // Log changes to the y variable ...
    $.ajax({
      type: "POST",
      url: api_root + "events/models/" + model_id + "/select/y/" + variable,
    });
    bookmarker.updateState({ "y-selection": variable });
    y_index = Number(variable);

    // Hide histogram if it's being displayed.
    // There is probably a better place to put this.
    if (window.store.getState().scatterplot.show_histogram) {
      window.store.dispatch(toggleShowHistogram());
    }
  }

  function v_index_changed(variable) {
    // Update legacy table and scatterplot components when v variable changes in Redux.
    // These need to be removed when we convert these components to React.
    // Update table
    $("#table").table("option", "variable-selection", [Number(variable)]);
    // Handle changes to the color variable ...
    handle_color_variable_change(variable);
  }

  function media_index_changed(variable) {
    // Update legacy table and scatterplot components when media variable changes in Redux.
    // These need to be removed when we convert these components to React.
    // Update table
    $("#table").table("option", "image-variable", variable);
    // Update scatterplot
    handle_image_variable_change(variable);
  }

  function variable_ranges_changed(variable_ranges) {
    // Update legacy table and scatterplot components when variable ranges change in Redux.
    // These need to be removed when we convert these components to React.
    // Alert scatterplot that it might need to update its axes
    $("#scatterplot").scatterplot("update_axes_ranges");
    // Update the color scale
    update_current_colorscale();
    $("#table").table("option", "colorscale", colorscale);
    $("#scatterplot").scatterplot("option", "colorscale", colorscale);
  }

  function video_sync_changed(video_sync_value) {
    video_sync = video_sync_value;
    $("#scatterplot").scatterplot("option", "video-sync", video_sync);
    $.ajax({
      type: "POST",
      url: api_root + "events/models/" + model_id + "/video-sync/" + video_sync,
    });
    bookmarker.updateState({ "video-sync": video_sync });
  }

  function threeD_sync_changed(threeD_sync_value) {
    threeD_sync = threeD_sync_value;
    $("#scatterplot").scatterplot("option", "threeD_sync", threeD_sync);
    setSyncCameras(threeD_sync);
    $.ajax({
      type: "POST",
      url: api_root + "events/models/" + model_id + "/threeD_sync/" + threeD_sync,
    });
  }

  function auto_scale_option_changed(auto_scale_value, old_auto_scale_value, objectPath) {
    auto_scale = auto_scale_value;
    if (hidden_simulations.length > 0) {
      update_current_colorscale();
      $("#table").table("option", "colorscale", colorscale);
      // TODO this will result in 2 updates to canvas, one to redraw points accourding to scale
      // and another to color them according to new colorscale. Need to combine this to a single
      // update when converting to canvas.
      $("#scatterplot").scatterplot("option", { colorscale: colorscale, "auto-scale": auto_scale });
    } else {
      $("#scatterplot").scatterplot("option", "auto-scale", auto_scale);
    }
    $.ajax({
      type: "POST",
      url: api_root + "events/models/" + model_id + "/auto-scale/" + auto_scale,
    });
  }

  function video_sync_time_changed(video_sync_time_value) {
    $("#scatterplot").scatterplot("option", "video-sync-time", video_sync_time_value);

    video_sync_time = video_sync_time_value;
    $.ajax({
      type: "POST",
      url: api_root + "events/models/" + model_id + "/video-sync-time/" + video_sync_time,
    });
    bookmarker.updateState({ "video-sync-time": video_sync_time });
  }

  function hidden_simulations_changed(hidden_simulations_value) {
    hidden_simulations = _.cloneDeep(hidden_simulations_value);
    update_widgets_when_hidden_simulations_change();
  }

  function manually_hidden_simulations_changed(manually_hidden_simulations_value) {
    manually_hidden_simulations = _.cloneDeep(manually_hidden_simulations_value);
    bookmarker.updateState({
      "manually-hidden-simulations": manually_hidden_simulations,
    });
  }

  function update_scatterplot_x(variable) {
    chunker.get_model_array_attribute({
      api_root: api_root,
      mid: model_id,
      aid: "data-table",
      array: 0,
      attribute: variable,
      success: function (result) {
        const x = table_metadata["column-types"][variable] == "string" ? result[0] : result;
        // Dispatch update to x values in Redux
        window.store.dispatch(setXValues(x));
        $("#scatterplot").scatterplot("option", {
          x_index: variable,
          x_string: table_metadata["column-types"][variable] == "string",
          x: x,
          x_label: selectXColumnName(window.store.getState()),
        });
      },
      error: artifact_missing,
    });
  }

  function update_scatterplot_y(variable) {
    chunker.get_model_array_attribute({
      api_root: api_root,
      mid: model_id,
      aid: "data-table",
      array: 0,
      attribute: variable,
      success: function (result) {
        const y = table_metadata["column-types"][variable] == "string" ? result[0] : result;
        // Dispatch update to y values in Redux
        window.store.dispatch(setYValues(y));
        $("#scatterplot").scatterplot("option", {
          y_index: variable,
          y_string: table_metadata["column-types"][variable] == "string",
          y: y,
          y_label: selectYColumnName(window.store.getState()),
        });
      },
      error: artifact_missing,
    });
  }

  function load_table_statistics(columns, callback) {
    client.get_model_arrayset_metadata({
      mid: model_id,
      aid: "data-table",
      statistics: "0/" + columns.join("|"),
      success: function (metadata) {
        if (table_statistics === null) {
          table_statistics = new Array();
        }
        var statistics = metadata.statistics;
        for (var i = 0; i != statistics.length; ++i) {
          table_statistics[statistics[i].attribute] = {
            min: statistics[i].min,
            max: statistics[i].max,
          };
        }
        // Wait until the redux store has been created
        createReduxStorePromise.then(() => {
          // Update table_statistics in Redux
          window.store.dispatch(setTableStatistics(table_statistics));
        });
        callback(table_statistics);
      },
    });
  }

  function active_filters_ready() {
    // console.debug(`ui.js active_filters_ready`);
    var filter;
    var allFilters = filter_manager.allFilters;
    for (var i = 0; i < allFilters().length; i++) {
      filter = allFilters()[i];
      if (filter.type() == "numeric") {
        filter.max.subscribe(function (newValue) {
          filters_changed(newValue);
        });
        filter.min.subscribe(function (newValue) {
          filters_changed(newValue);
        });
        filter.rateLimitedHigh.subscribe(function (newValue) {
          filters_changed(newValue);
        });
        filter.rateLimitedLow.subscribe(function (newValue) {
          filters_changed(newValue);
        });
        filter.invert.subscribe(function (newValue) {
          filters_changed(newValue);
        });
      } else if (filter.type() == "category") {
        filter.selected.subscribe(function (newValue) {
          filters_changed(newValue);
        });
      }
      filter.nulls.subscribe(function (newValue) {
        filters_changed(newValue);
      });
    }

    // Call filters_changed whenever active_filters change.
    // This is needed so that the scatterplot and table update each time an active filter
    // is removed.
    filter_manager.active_filters.subscribe(function (newValue) {
      filters_changed(newValue);
    });
  }

  function filters_changed(newValue) {
    // console.debug(`ui.js filters_changed, newValues is %o`, newValue);
    var allFilters = filter_manager.allFilters;
    var active_filters = filter_manager.active_filters;
    var filter_var, selected_values;
    var new_filters = [];

    for (var i = 0; i < allFilters().length; i++) {
      let filter = allFilters()[i];
      if (filter.active()) {
        filter_var = "a" + filter.index();
        if (filter.type() == "numeric") {
          if (filter.invert()) {
            new_filters.push(
              "(" +
                filter_var +
                " >= " +
                filter.high() +
                " and " +
                filter_var +
                " <= " +
                filter.max() +
                " or " +
                filter_var +
                " <= " +
                filter.low() +
                " and " +
                filter_var +
                " >= " +
                filter.min() +
                ")",
            );
          } else if (!filter.invert()) {
            new_filters.push(
              "(" +
                filter_var +
                " <= " +
                filter.high() +
                " and " +
                filter_var +
                " >= " +
                filter.low() +
                ")",
            );
          }
        } else if (filter.type() == "category") {
          selected_values = [];
          var optional_quote = "";
          if (filter.selected().length == 0) {
            selected_values.push('""');
          } else {
            for (var j = 0; j < filter.selected().length; j++) {
              optional_quote =
                table_metadata["column-types"][filter.index()] == "string" ? '"' : "";
              selected_values.push(optional_quote + filter.selected()[j].value() + optional_quote);
            }
          }
          new_filters.push("(" + filter_var + " in [" + selected_values.join(", ") + "])");
        }
        if (filter.nulls()) {
          new_filters[new_filters.length - 1] =
            "(" + new_filters[new_filters.length - 1] + " or " + filter_var + " == nan" + ")";
        }
      }
    }
    filter_expression = new_filters.join(" and ");

    // We have one or more filters
    if (!(filter_expression == null || filter_expression == "")) {
      // Abort existing ajax request
      if (filterxhr && filterxhr.readyState != 4) {
        filterxhr.abort();
        console.log("aborted");
      }
      filterxhr = $.ajax({
        type: "POST",
        url: api_root + "models/" + model_id + "/arraysets/data-table/data",
        data: JSON.stringify({ hyperchunks: "0/index(0)|" + filter_expression + "/..." }),
        contentType: "application/json",
        success: function (data) {
          var filter_indices = data[0];
          var filter_status = data[1];

          // Clear hidden_simulations
          while (hidden_simulations.length > 0) {
            hidden_simulations.pop();
          }

          for (var i = 0; i < filter_status.length; i++) {
            // Add if it's being filtered out
            if (!filter_status[i]) {
              hidden_simulations.push(filter_indices[i]);
            }
          }

          hidden_simulations.sort((a, b) => a - b);

          window.store.dispatch(setHiddenSimulations(hidden_simulations));
          update_widgets_when_hidden_simulations_change();
        },
        error: function (request, status, reason_phrase) {
          console.log("error", request, status, reason_phrase);
        },
      });
    }
    // We have no more filters, so revert to any manually hidden simulations
    else {
      // Abort any remaining filter xhr calls since the last filter was closed
      // and we don't want long calls to come back now and filter anything.
      if (filterxhr) {
        filterxhr.abort();
      }

      // Clear hidden_simulations
      while (hidden_simulations.length > 0) {
        hidden_simulations.pop();
      }

      // Revert to manually hidden simulations
      for (var i = 0; i < manually_hidden_simulations.length; i++) {
        hidden_simulations.push(manually_hidden_simulations[i]);
      }

      window.store.dispatch(setHiddenSimulations(hidden_simulations));
      update_widgets_when_hidden_simulations_change();
    }
  }
});

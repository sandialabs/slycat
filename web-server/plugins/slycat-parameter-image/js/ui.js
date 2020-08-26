/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

import jquery_ui_css from "jquery-ui/themes/base/all.css";

import slick_grid_css from "slickgrid/slick.grid.css";
import slick_default_theme_css from "slickgrid/slick-default-theme.css";
import slick_headerbuttons_css from "slickgrid/plugins/slick.headerbuttons.css";
import slick_slycat_theme_css from "css/slick-slycat-theme.css";
import slycat_additions_css from "css/slycat-additions.css";
import stickies_css from "../css/stickies.css";
import ui_css from "../css/ui.css";

import api_root from "js/slycat-api-root";
import _ from "lodash";
import ko from "knockout";
import mapping from "knockout-mapping";
import client from "js/slycat-web-client";
import bookmark_manager from "js/slycat-bookmark-manager";
import * as dialog from "js/slycat-dialog";
import NoteManager from "./note-manager";
import FilterManager from "./filter-manager";
// import d3 from "d3";
import URI from "urijs";
import * as chunker from "js/chunker";
import "./parameter-image-scatterplot";
import "./parameter-controls";
import "./parameter-image-table";
import "./color-switcher";
import $ from "jquery";
import "jquery-ui";
// disable-selection and draggable required for jquery.layout resizing functionality
import "jquery-ui/ui/disable-selection";
import "jquery-ui/ui/widgets/draggable";
// resizable required for stickies.core.js
import "jquery-ui/ui/widgets/resizable";
import "jquery-ui/ui/widget";
import "layout";
import "js/slycat-range-slider"; 
import "./category-select";

import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { createLogger } from 'redux-logger';
import throttle from "redux-throttle";
import ps_reducer from './reducers';
import { 
  updateThreeDSync,
  setXValues,
  setYValues,
  setVValues,
  setXIndex,
  setYIndex,
  setVIndex,
} from './actions';

import slycat_threeD_color_maps from "js/slycat-threeD-color-maps";

import { setSyncCameras, } from './vtk-camera-synchronizer';

import { 
  DEFAULT_UNSELECTED_POINT_SIZE,
  DEFAULT_UNSELECTED_BORDER_SIZE,
  DEFAULT_SELECTED_POINT_SIZE,
  DEFAULT_SELECTED_BORDER_SIZE,
  } from 'components/ScatterplotOptions';
import { 
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_FAMILY,
  } from './Components/ControlsButtonVarOptions';
import d3 from 'd3';
import { v4 as uuidv4 } from 'uuid';

let table_metadata = null;

export function get_variable_label(variable)
{
  if(window.store.getState().derived.variableAliases[variable] !== undefined)
  {
    return window.store.getState().derived.variableAliases[variable];
  }
  
  return table_metadata["column-names"][variable]
}

// Wait for document ready
$(document).ready(function() {

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

  var custom_color_variable_range = {
    min: undefined,
    max: undefined
  }

  //////////////////////////////////////////////////////////////////////////////////////////
  // Setup page layout.
  //////////////////////////////////////////////////////////////////////////////////////////

  layout = $("#parameter-image-plus-layout").layout(
  {
    north:
    {
      size: 39,
      resizable: false,
    },
    center:
    {

    },
    west:
    {
      // Sliders
      initClosed: true,
      size: $("#parameter-image-plus-layout").width() / 4,
      onresize_end: function(pane_name, pane_element, pane_state, pane_options, layout_name)
      {
        filter_manager.slidersPaneHeight( pane_state.innerHeight );
      }
    },
    south:
    {
      size: $("#parameter-image-plus-layout").height() / 4,
      resizeWhileDragging: false,
      onresize_end: function()
      {
        $("#table").css("height", $("#table-pane").height());
        if($("#table").data("parameter_image-table")) {
          $("#table").table("resize_canvas");
        }
      }
    },
  });

  $("#model-pane").layout(
  {
    center:
    {
      resizeWhileDragging: false,
      onresize_end: function() 
      {
        if($("#scatterplot").data("parameter_image-scatterplot")) {
          $("#scatterplot").scatterplot("option", {
            width: $("#scatterplot-pane").width(),
            height: $("#scatterplot-pane").height()
          });
        }
      }
    }
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  // Load the model
  //////////////////////////////////////////////////////////////////////////////////////////
  function doPoll(){
    $.ajax(
    {
      type : "GET",
      url : api_root + "models/" + model_id,
      success : function(result)
      {
        model = result;
        bookmarker = bookmark_manager.create(model.project, model._id);

        input_columns = model["artifact:input-columns"];
        output_columns = model["artifact:output-columns"];
        image_columns = model["artifact:image-columns"];
        rating_columns = model["artifact:rating-columns"] == undefined ? [] : model["artifact:rating-columns"];
        category_columns = model["artifact:category-columns"] == undefined ? [] : model["artifact:category-columns"];
        filter_manager = new FilterManager(model_id, bookmarker, layout, input_columns, output_columns, image_columns, rating_columns, category_columns);
        if(filter_manager.active_filters_ready())
        {
          active_filters_ready();
        }
        else
        {
          filter_manager.active_filters_ready.subscribe(function(newValue) {
            if(newValue)
            {
              active_filters_ready();
              // Terminating subscription
              this.dispose();
            }
          });
        }
        if(model["state"] === "waiting" || model["state"] === "running") {
          setTimeout(doPoll, 5000);
          return;
        }
        if(model["state"] === "closed" && model["result"] === null)
          return;
        if(model["result"] === "failed")
          return;
        $('.slycat-navbar-alert').remove();
        model_loaded();
      },
      error: function(request, status, reason_phrase)
      {
        window.alert("Error retrieving model: " + reason_phrase);
      }
    });
  }
  doPoll();

  //////////////////////////////////////////////////////////////////////////////////////////
  // Once the model has been loaded, retrieve metadata / bookmarked state
  //////////////////////////////////////////////////////////////////////////////////////////
  
  // Retrieve variable alias labels
  function get_variable_aliases(resolve, reject)
  {
    // If the model has project_data, try to get aliases from it
    if(model.project_data && model.project_data[0])
    {
      client.get_project_data_fetch({did: model.project_data[0]}).then((project_data) => {
        if(project_data['artifact:variable_aliases']) {
          variable_aliases = project_data['artifact:variable_aliases'];
        }
        console.log('Set aliases from project_data');
        resolve();
      }).catch(() => {
          // Disabling this alert and replacing with log entry because it comes up every time user opens the model.
          // Now I am writing to model's artifact if I can't get to the project data, 
          // so we don't need this alert anymore.
          // window.alert(
          //   'Ooops, this model had project data in the past but it is no longer there. ' +
          //   'Original variable aliases can not be loaded. ' +
          //   'But we will try to load any aliases that were created after the project data disappeared. '
          // );
          console.log(
            'Ooops, this model had project data in the past but it is no longer there. ' +
            'Original variable aliases can not be loaded. ' +
            'But we will try to load any aliases that were created after the project data disappeared.'
          );
          // Something went wrong. We have a pointer to project data, but can't retrieve it.
          // Might have gotten deleted. So let's try to load aliases from the model's attributes 
          // as a last-ditch effort.
          if(model['artifact:variable_aliases'] !== undefined)
          {
            variable_aliases = model['artifact:variable_aliases'];
          }
          resolve();
        }
      );
    }
    // Otherwise try to get the aliases from the model's attributes
    else if(model['artifact:variable_aliases'] !== undefined)
    {
      variable_aliases = model['artifact:variable_aliases'];
      // console.log('Set aliases from model');
      resolve();
    }
    // Otherwise leave variable_aliases as empty
    else
    {
      // console.log('We do not have aliases on project_data or model, so leaving blank.');
      resolve();
    }
  }

  var createReduxStorePromise;

  function model_loaded()
  {
    // If the model isn't ready or failed, we're done.
    if(model["state"] == "waiting" || model["state"] == "running")
      return;
    if(model["state"] == "closed" && model["result"] === null)
      return;
    if(model["result"] == "failed")
      return;
    // Display progress as the load happens ...
    $(".load-status").text("Loading data.");

    // Load data table metadata.
    createReduxStorePromise = new Promise((resolve, reject) => {
      $.ajax({
        url : api_root + "models/" + model_id + "/arraysets/data-table/metadata?arrays=0",
        contentType : "application/json",
        success: function(metadata)
        {
          var raw_metadata = metadata.arrays[0];
          // Mapping data from new metadata format to old table_metadata format
          table_metadata = {};
          table_metadata["row-count"] = raw_metadata.shape[0];

          // This is going to be one short for now since there is no index. Perhaps just add one for now?
          table_metadata["column-count"] = raw_metadata.attributes.length + 1;

          table_metadata["column-names"] = [];
          table_metadata["column-types"] = [];
          for(var i = 0; i < raw_metadata.attributes.length; i++)
          {
            table_metadata["column-names"].push(raw_metadata.attributes[i].name);
            table_metadata["column-types"].push(raw_metadata.attributes[i].type);
          }

          // Adding Index column
          table_metadata["column-names"].push("Index");
          table_metadata["column-types"].push("int64");

          filter_manager.set_table_metadata(table_metadata);
          load_table_statistics(d3.range(table_metadata["column-count"]-1), function(){
            table_statistics[table_metadata["column-count"]-1] = {"max": table_metadata["row-count"]-1, "min": 0};
            metadata_loaded();
          });
        },
        error: artifact_missing
      });

      // Retrieve bookmarked state information ...
      bookmarker.getState(function(state)
      {
        bookmark = state;
        
        let variable_aliases_promise = new Promise(get_variable_aliases);
        variable_aliases_promise.then(() => {
          // Create logger for redux
          const loggerMiddleware = createLogger();

          // Create throttle for redux
          const defaultWait = 500
          const defaultThrottleOption = { // https://lodash.com/docs#throttle
            leading: true,
            trailing: true
          }
          const throttleMiddleware = throttle(defaultWait, defaultThrottleOption);

          // Add unique IDs to bookmarked open_media, as these are now required.
          let bookmarked_open_media = bookmark["open-images-selection"] ? bookmark["open-images-selection"] : [];
          for(let media of bookmarked_open_media)
          {
            if(!('uid' in media))
            {
              media.uid = uuidv4();
            }
          }

          // Create Redux store and set its state based on what's in the bookmark
          const state_tree = {
            fontSize: DEFAULT_FONT_SIZE,
            fontFamily: DEFAULT_FONT_FAMILY,
            axesVariables: {},
            threeD_sync: bookmark.threeD_sync ? bookmark.threeD_sync : false,
            // First colormap is default
            threeDColormap: Object.keys(slycat_threeD_color_maps.color_maps)[0],
            threeD_background_color: [0.7 * 255, 0.7 * 255, 0.7 * 255],
            unselected_point_size: unselected_point_size,
            unselected_border_size: unselected_border_size,
            selected_point_size: selected_point_size,
            selected_border_size: selected_border_size,
            variableRanges: {},
            open_media: bookmarked_open_media,
          }
          window.store = createStore(
            ps_reducer, 
            {
              ...state_tree, 
              ...bookmark.state, 
              derived: {
                variableAliases: variable_aliases,
                xValues: [],
                yValues: [],
              }
            },
            applyMiddleware(
              thunkMiddleware, // Lets us dispatch() functions
              loggerMiddleware, // Neat middleware that logs actions. 
                                // Logger must be the last middleware in chain, 
                                // otherwise it will log thunk and promise, 
                                // not actual actions.
              throttleMiddleware, // Allows throttling of actions
            )
          );

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
              { ...window.store.getState(), derived: undefined }
            });
          };
          window.store.subscribe(bookmarkReduxStateTree);

          // Set local variables based on Redux store
          axes_font_size = store.getState().fontSize;
          axes_font_family = store.getState().fontFamily;
          axes_variables_scale = store.getState().axesVariables;
          unselected_point_size = store.getState().unselected_point_size;
          unselected_border_size = store.getState().unselected_border_size;
          selected_point_size = store.getState().selected_point_size;
          selected_border_size = store.getState().selected_border_size;
          open_images = store.getState().open_media;

          // set this in callback for now to keep FilterManager isolated but avoid a duplicate GET bookmark AJAX call
          filter_manager.set_bookmark(bookmark);
          filter_manager.notify_store_ready();
          resolve();
          setup_controls();
          setup_colorswitcher();
          metadata_loaded();
        });
        
        // instantiate this in callback for now to keep NoteManager isolated but avoid a duplicate GET bookmark AJAX call
        note_manager = new NoteManager(model_id, bookmarker, bookmark);
      });
    });
  }

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
  // Setup the rest of the UI as data is received.
  //////////////////////////////////////////////////////////////////////////////////////////

  function setup_colorswitcher()
  {
    var colormap = bookmark["colormap"] !== undefined ? bookmark["colormap"] : "night";

    $("#color-switcher").colorswitcher({colormap:colormap});

    $("#color-switcher").bind("colormap-changed", function(event, colormap)
    {
      selected_colormap_changed(colormap);
    });
  }

  function metadata_loaded()
  {
    if(table_metadata)
    {
      other_columns = [];
      for(var i = 0; i != table_metadata["column-count"] - 1; ++i)
      {
        if($.inArray(i, input_columns) == -1 && $.inArray(i, output_columns) == -1)
        {
          other_columns.push(i);
        }
      }
      filter_manager.set_other_columns(other_columns);
    }

    setup_table();

    if(!indices && table_metadata)
    {
      var count = table_metadata["row-count"];
      indices = new Int32Array(count);
      for(var i = 0; i != count; ++i)
        indices[i] = i;
    }

    setup_controls();
    filter_manager.set_table_statistics(table_statistics);
    filter_manager.build_sliders();

    if(table_metadata && bookmark)
    {
      // Choose some columns for the X and Y axes.
      var x_y_variables = [];

      // First add inputs and outputs to possible columns
      x_y_variables.push.apply(x_y_variables, input_columns);
      x_y_variables.push.apply(x_y_variables, output_columns);

      for(var i = 0; i < table_metadata["column-count"]-1; i++)
      {
        // Only use non-string columns
        if(table_metadata["column-types"][i] != 'string')
          x_y_variables.push(i);
      }

      x_index = x_y_variables[0];
      y_index = x_y_variables[1 % x_y_variables.length];
      if("x-selection" in bookmark)
        x_index = Number(bookmark["x-selection"]);
      if("y-selection" in bookmark)
        y_index = Number(bookmark["y-selection"]);
      
      // Wait until the redux store has been created
      createReduxStorePromise.then(() => {
        // Dispatch update to x and y indexex in Redux
        window.store.dispatch(setXIndex(x_index));
        window.store.dispatch(setYIndex(y_index));
      });

      auto_scale = true;
      if("auto-scale" in bookmark)
      {
        auto_scale = bookmark["auto-scale"];
      }
      video_sync = false;
      if("video-sync" in bookmark)
      {
        video_sync = bookmark["video-sync"];
      }
      video_sync_time = 0;
      if("video-sync-time" in bookmark)
      {
        video_sync_time = bookmark["video-sync-time"];
      }

      threeD_sync = false;
      if("threeD_sync" in bookmark)
      {
        threeD_sync = bookmark["threeD_sync"];
      }
      setSyncCameras(threeD_sync);

      // Set state of selected and hidden simulations
      selected_simulations = [];
      if("simulation-selection" in bookmark)
        selected_simulations = bookmark["simulation-selection"];
      hidden_simulations = [];
      if("hidden-simulations" in bookmark)
        hidden_simulations = bookmark["hidden-simulations"];
      manually_hidden_simulations = [];
      if("manually-hidden-simulations" in bookmark)
        manually_hidden_simulations = bookmark["manually-hidden-simulations"];

      chunker.get_model_array_attribute({
        api_root : api_root,
        mid : model_id,
        aid : "data-table",
        array : 0,
        attribute : x_index,
        success : function(result)
        {
          x = result;
          if(table_metadata["column-types"][x_index]=="string")
          {
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
        error : artifact_missing
      });

      chunker.get_model_array_attribute({
        api_root : api_root,
        mid : model_id,
        aid : "data-table",
        array : 0,
        attribute : y_index,
        success : function(result)
        {
          y = result;
          if(table_metadata["column-types"][y_index]=="string")
          {
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
        error : artifact_missing
      });

      v_index = table_metadata["column-count"] - 1;
      if("variable-selection" in bookmark)
      {
        v_index = Number(bookmark["variable-selection"]);
      }

      // Wait until the redux store has been created
      createReduxStorePromise.then(() => {
        // Dispatch update to v index in Redux
        window.store.dispatch(setVIndex(v_index));
      });

      if(v_index == table_metadata["column-count"] - 1)
      {
        var count = table_metadata["row-count"];
        v = new Float64Array(count);
        for(var i = 0; i != count; ++i)
          v[i] = i;

        // Wait until the redux store has been created
        createReduxStorePromise.then(() => {
          // Dispatch update to v values in Redux
          window.store.dispatch(setVValues(v));
          // console.log(`window.store.dispatch(setVValues(v));`);
          update_current_colorscale();
          setup_scatterplot();
          setup_table();
        });
        
      }
      else
      {
        chunker.get_model_array_attribute({
          api_root : api_root,
          mid : model_id,
          aid : "data-table",
          array : 0,
          attribute : v_index,
          success : function(result)
          {
            v = result;
            if(table_metadata["column-types"][v_index]=="string")
            {
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
          error : artifact_missing
        });
      }

      images_index = -1;
      // Set images index from bookmark if it's there
      if("images-selection" in bookmark)
      {
        images_index = bookmark["images-selection"];
      }
      // We don't want to set it to the first column because we have a 
      // None option that users can select to get rid of media sets.
      // // Otherwise set it to the first images column if we have any
      // else if(image_columns.length > 0)
      // {
      //   images_index = image_columns[0];
      // }
      setup_table();
      if(image_columns.length > 0 && images_index > -1)
      {
        $.ajax(
        {
          type : "GET",
          url : api_root + "models/" + model_id + "/arraysets/data-table/data?hyperchunks=0/" + images_index + "/0:" + table_metadata["row-count"],
          success : function(result)
          {
            images = result[0];
            setup_scatterplot();
            //setup_table();
          },
          error: artifact_missing
        });
      }
      else
      {
        images = undefined;
        setup_scatterplot();
      }
      setup_controls();
      filter_manager.build_sliders();
    }
  }

  function setup_table()
  {
    if( !table_ready && table_metadata && colorscale
      && bookmark && (x_index != null) && (y_index != null) && (images_index !== null)
      && (selected_simulations != null) && (hidden_simulations != null)
      && input_columns != null && output_columns != null && other_columns != null && image_columns != null && rating_columns != null && category_columns != null
      && window.store !== undefined
      )
    {
      table_ready = true;

      $("#table-pane .load-status").css("display", "none");

      var table_options =
      {
        api_root : api_root,
        mid : model_id,
        aid : "data-table",
        metadata : table_metadata,
        inputs : input_columns,
        outputs : output_columns,
        others : other_columns,
        images : image_columns,
        ratings : rating_columns,
        categories : category_columns,
        "image-variable" : images_index,
        "x-variable" : x_index,
        "y-variable" : y_index,
        "row-selection" : selected_simulations,
        hidden_simulations : hidden_simulations,
      };

      var colormap = bookmark["colormap"] !== undefined ? bookmark["colormap"] : "night";
      table_options.colorscale = colorscale;

      if("sort-variable" in bookmark && "sort-order" in bookmark)
      {
        table_options["sort-variable"] = bookmark["sort-variable"];
        var sort_order = bookmark["sort-order"];

        // Mapping between old grammar and new one
        if(sort_order == "ascending")
          sort_order = "asc";
        else if(sort_order == "descending")
          sort_order = "desc";

        table_options["sort-order"] = bookmark["sort-order"];
      }

      if("variable-selection" in bookmark)
      {
        table_options["variable-selection"] = [bookmark["variable-selection"]];
      }
      else
      {
        table_options["variable-selection"] = [table_metadata["column-count"] - 1];
      }

      $("#table").table(table_options);

      // Log changes to the table sort order ...
      $("#table").bind("variable-sort-changed", function(event, variable, order)
      {
        variable_sort_changed(variable, order);
      });

      // Log changes to the x variable ...
      $("#table").bind("x-selection-changed", function(event, variable)
      {
        x_selection_changed(variable);
      });

      // Log changes to the y variable ...
      $("#table").bind("y-selection-changed", function(event, variable)
      {
        y_selection_changed(variable);
      });

      // Changing the table row selection updates the scatterplot and controls ...
      // Log changes to the table row selection ...
      $("#table").bind("row-selection-changed", function(event, selection)
      {
        // The table selection is an array buffer which can't be
        // serialized as JSON, so convert it to an array.
        var temp = [];
        for(var i = 0; i != selection.length; ++i)
          temp.push(selection[i]);

        selected_simulations_changed(temp);
        $("#scatterplot").scatterplot("option", "selection", temp);
        $("#controls").controls("option", "selection", temp);
      });

      // Changing the scatterplot selection updates the table row selection and controls ..
      $("#scatterplot").bind("selection-changed", function(event, selection)
      {
        $("#table").table("option", "row-selection", selection);
        $("#controls").controls("option", "selection", selection);
      });

      // Changing the x variable updates the table ...
      $("#controls").bind("x-selection-changed", function(event, variable)
      {
        $("#table").table("option", "x-variable", variable);
      });

      // Changing the y variable updates the table ...
      $("#controls").bind("y-selection-changed", function(event, variable)
      {
        $("#table").table("option", "y-variable", variable);
      });

      // Changing the image variable updates the table ...
      $("#controls").bind("images-selection-changed", function(event, variable)
      {
        $("#table").table("option", "image-variable", variable);
      });

      // Handle table variable selection ...
      $("#table").bind("variable-selection-changed", function(event, selection)
      {
        // Changing the table variable updates the controls ...
        $("#controls").controls("option", "color-variable", selection[0]);

        // Handle changes to the table variable selection ...
        handle_color_variable_change(selection[0]);
      });

      // Handle color variable selection ...
      $("#controls").bind("color-selection-changed", function(event, variable)
      {
        // Changing the color variable updates the table ...
        $("#table").table("option", "variable-selection", [Number(variable)]);

        // Handle changes to the color variable ...
        handle_color_variable_change(variable);
      });
    }
  }

  function setup_scatterplot()
  {
    // Setup the scatterplot ...
    if(!scatterplot_ready && bookmark && indices && x && y && v && images !== null && colorscale
      && (selected_simulations != null) && (hidden_simulations != null) && auto_scale != null
      && (open_images !== null) && (video_sync !== null) && (video_sync_time !== null) && (threeD_sync !== null)
      && window.store !== undefined
      )
    {
      scatterplot_ready = true;

      $("#scatterplot-pane .load-status").css("display", "none");

      var colormap = bookmark["colormap"] !== undefined ? bookmark["colormap"] : "night";

      $("#scatterplot-pane").css("background", $("#color-switcher").colorswitcher("get_background", colormap).toString());

      $("#scatterplot").scatterplot({
        model: model,
        indices: indices,
        x_label: get_variable_label(x_index),
        y_label: get_variable_label(y_index),
        v_label: get_variable_label(v_index),
        x: x,
        y: y,
        v: v,
        x_string: table_metadata["column-types"][x_index]=="string",
        y_string: table_metadata["column-types"][y_index]=="string",
        v_string: table_metadata["column-types"][v_index]=="string",
        x_index: x_index,
        y_index: y_index,
        v_index: v_index,
        images: images,
        width: $("#scatterplot-pane").width(),
        height: $("#scatterplot-pane").height(),
        colorscale: colorscale,
        selection: selected_simulations,
        open_images: open_images,
        gradient: $("#color-switcher").colorswitcher("get_gradient_data", colormap),
        hidden_simulations: hidden_simulations,
        "auto-scale" : auto_scale,
        "video-sync" : video_sync,
        "video-sync-time" : video_sync_time,
        threeD_sync : threeD_sync,
        axes_font_size : axes_font_size,
        axes_font_family : axes_font_family,
        axes_variables_scale : axes_variables_scale,
        canvas_square_size : unselected_point_size,
        canvas_square_border_size : unselected_border_size,
        canvas_selected_square_size : selected_point_size,
        canvas_selected_square_border_size : selected_border_size,
        });

      $("#scatterplot").bind("selection-changed", function(event, selection)
      {
        selected_simulations_changed(selection);
      });

      // Changing the x variable updates the scatterplot ...
      $("#table").bind("x-selection-changed", function(event, variable)
      {
        update_scatterplot_x(variable);
      });
      $("#controls").bind("x-selection-changed", function(event, variable)
      {
        update_scatterplot_x(variable);
      });

      // Changing the y variable updates the scatterplot ...
      $("#table").bind("y-selection-changed", function(event, variable)
      {
        update_scatterplot_y(variable);
      });
      $("#controls").bind("y-selection-changed", function(event, variable)
      {
        update_scatterplot_y(variable);
      });

      // Changing the images variable updates the scatterplot ...
      $("#table").bind("images-selection-changed", function(event, variable)
      {
        handle_image_variable_change(variable);
      });
      $("#controls").bind("images-selection-changed", function(event, variable)
      {
        handle_image_variable_change(variable);
      });

      // Changing the video sync time updates the controls and logs it ...
      $("#scatterplot").bind("video-sync-time", function(event, video_sync_time)
      {
        $("#controls").controls("option", "video-sync-time", video_sync_time);
        video_sync_time_changed(video_sync_time);
      });

      // Jumping to simulation ...
      $("#scatterplot").bind("jump_to_simulation", function(event, index)
      {
        // Alerts the table
        $("#table").table("option", "jump_to_simulation", parseInt(index));
        video_sync_time_changed(video_sync_time);
      });
    }
  }

  function setup_controls()
  {
    if(
      !controls_ready && bookmark && table_metadata && (image_columns !== null) && (rating_columns != null)
      && (category_columns != null) && (x_index != null) && (y_index != null) && auto_scale != null
      && (images_index !== null) && (selected_simulations != null) && (hidden_simulations != null)
      && indices && (open_images !== null) & (video_sync !== null) && (video_sync_time !== null)
      && (threeD_sync !== null) && window.store !== undefined
      && table_statistics
      )
    {
      controls_ready = true;
      filter_manager.notify_controls_ready();
      var numeric_variables = [];
      var axes_variables = [];
      var color_variables = [];

      for(var i = 0; i < table_metadata["column-count"]; i++)
      {
        if(table_metadata["column-types"][i] != 'string')
        {
          numeric_variables.push(i);
        }
        if( image_columns.indexOf(i) == -1 && table_metadata["column-count"]-1 > i )
        {
          axes_variables.push(i);
        }
        if( image_columns.indexOf(i) == -1 )
        {
          color_variables.push(i);
        }
      }

      var color_variable = table_metadata["column-count"] - 1;
      if("variable-selection" in bookmark)
      {
        color_variable = [bookmark["variable-selection"]];
      }
      
      $("#controls").controls({
        "mid" : model_id,
        "model": model,
        "model_name": window.model_name,
        "aid" : "data-table",
        "metadata": table_metadata,
        "table_statistics": table_statistics,
        // clusters : clusters,
        "x_variables": axes_variables,
        "y_variables": axes_variables,
        "axes_variables": axes_variables,
        "image_variables": image_columns,
        "color_variables": color_variables,
        "rating_variables" : rating_columns,
        "category_variables" : category_columns,
        "selection" : selected_simulations,
        // cluster_index : cluster_index,
        "x-variable" : x_index,
        "y-variable" : y_index,
        "image-variable" : images_index,
        "color-variable" : color_variable,
        "auto-scale" : auto_scale,
        "hidden_simulations" : hidden_simulations,
        "indices" : indices,
        "video-sync" : video_sync,
        "video-sync-time" : video_sync_time,
        "threeD_sync" : threeD_sync,
      });

      // Changing the x variable updates the controls ...
      $("#table").bind("x-selection-changed", function(event, variable)
      {
        $("#controls").controls("option", "x-variable", variable);
      });

      // Changing the y variable updates the controls ...
      $("#table").bind("y-selection-changed", function(event, variable)
      {
        $("#controls").controls("option", "y-variable", variable);
      });

      // Changing the image variable updates the controls ...
      $("#table").bind("images-selection-changed", function(event, variable)
      {
        $("#controls").controls("option", "image-variable", variable);
      });

      $("#controls").bind("update_axes_ranges", function()
      {
        // console.log(`variable-ranges-changed`);
        // Alert scatterplot that it might need to update its axes
        $("#scatterplot").scatterplot("update_axes_ranges");
        // Update the color scale
        update_current_colorscale();
        $("#table").table("option", "colorscale", colorscale);
        $("#scatterplot").scatterplot("option", "colorscale", colorscale);
      })

      // Changing the value of a variable updates the database, table, and scatterplot ...
      $("#controls").bind("set-value", function(event, props)
      {
        writeData(props.selection, props.variable, props.value);
        function writeData(selection, variable, value)
        {
          var hyperslices = "";
          var data = "[";
          for(var i=0; i<selection.length; i++)
          {
            if(i>0)
            {
              hyperslices += "|";
              data += ",";
            }
            hyperslices += selection[i];
            data += "[" + value + "]";
          }
          data += "]";
          var blob = new Blob([data], {type: "text/html"});
          var formdata = new FormData();
          formdata.append("data", blob);
          formdata.append("hyperchunks", 0 + "/" + variable + "/" + hyperslices);

          $.ajax({
            type: "PUT",
            url : api_root + "models/" + model_id + "/arraysets/data-table/data",
            data : formdata,
            processData: false,
            contentType: false,
            success : function(results)
            {
              $("#table").table("update_data");

              if(variable == x_index)
                update_scatterplot_x(variable);
              if(variable == y_index)
                update_scatterplot_y(variable);

              load_table_statistics([variable], function(){
                if(variable == v_index)
                {
                  update_v(variable);
                }
              });
            },
            error : function(jqXHR, textStatus, errorThrown)
            {
              console.log("writing array data error");
            },
          });
        }
      });

      // Log changes to the cluster variable ...
      // $("#controls").bind("cluster-selection-changed", function(event, variable)
      // {
      //   variable = parseInt(variable);
      //   cluster_selection_changed(variable);
      //   update_dendrogram(variable);
      // });

      // Log changes to the x variable ...
      $("#controls").bind("x-selection-changed", function(event, variable)
      {
        x_selection_changed(variable);
      });

      // Log changes to the y variable ...
      $("#controls").bind("y-selection-changed", function(event, variable)
      {
        y_selection_changed(variable);
      });

      // Changing the auto scale option updates the scatterplot and logs it ...
      $("#controls").bind("auto-scale", function(event, auto_scale)
      {
        auto_scale_option_changed(auto_scale);
      });

      // Changing the video sync option updates the scatterplot and logs it ...
      $("#controls").bind("video-sync", function(event, video_sync)
      {
        video_sync_option_changed(video_sync);
      });

      // Changing the 3d sync option updates the scatterplot and logs it ...
      $("#controls").bind("threeD_sync", function(event, threeD_sync)
      {
        threeD_sync_option_changed(threeD_sync);
      });

      // Changing the video sync time updates the scatterplot and logs it ...
      $("#controls").bind("video-sync-time", function(event, video_sync_time)
      {
        $("#scatterplot").scatterplot("option", "video-sync-time", video_sync_time);
        video_sync_time_changed(video_sync_time);
      });

      // Clicking jump-to-start updates the scatterplot and logs it ...
      $("#controls").bind("jump-to-start", function(event)
      {
        $("#scatterplot").scatterplot("jump_to_start");
      });

      // Clicking frame-forward updates the scatterplot and logs it ...
      $("#controls").bind("frame-forward", function(event)
      {
        $("#scatterplot").scatterplot("frame_forward");
      });

      // Clicking play updates the scatterplot and logs it ...
      $("#controls").bind("play", function(event)
      {
        $("#scatterplot").scatterplot("play");
      });

      // Clicking pause updates the scatterplot and logs it ...
      $("#controls").bind("pause", function(event)
      {
        $("#scatterplot").scatterplot("pause");
      });

      // Clicking frame-back updates the scatterplot and logs it ...
      $("#controls").bind("frame-back", function(event)
      {
        $("#scatterplot").scatterplot("frame_back");
      });

      // Clicking jump-to-end updates the scatterplot and logs it ...
      $("#controls").bind("jump-to-end", function(event)
      {
        $("#scatterplot").scatterplot("jump_to_end");
      });

      // Log changes to hidden selection ...
      $("#controls").bind("hide-selection", function(event, selection)
      {
        for(var i=0; i<selected_simulations.length; i++){
          if($.inArray(selected_simulations[i], hidden_simulations) == -1) {
            hidden_simulations.push(selected_simulations[i]);
          }
        }
        update_widgets_when_hidden_simulations_change();
        manually_hidden_simulations = hidden_simulations.slice();
      });

      // Log changes to hidden selection ...
      $("#controls").bind("hide-unselected", function(event, selection)
      {
        let unselected = _.difference(indices, selected_simulations);
        let visible_unselected = _.difference(unselected, hidden_simulations);
        hidden_simulations.push(...visible_unselected);

        // This is the old way of doing this. Seems wrong because we shouldn't
        // be unhiding selected simulations when users want to hide unselected.
        // This section can be removed once the team agrees this not what we want.

        // // Remove any selected_simulations from hidden_simulations
        // for(var i=0; i<selected_simulations.length; i++){
        //   var index = $.inArray(selected_simulations[i], hidden_simulations);
        //   if(index != -1) {
        //     hidden_simulations.splice(index, 1);
        //   }
        // }

        // Add all non-selected_simulations to hidden_simulations
        // for(var i=0; i<indices.length; i++){
        //   if($.inArray(indices[i], selected_simulations) == -1) {
        //     hidden_simulations.push(indices[i]);
        //   }
        // }

        update_widgets_when_hidden_simulations_change();
        manually_hidden_simulations = hidden_simulations.slice();
      });

      // Log changes to hidden selection ...
      $("#controls").bind("show-unselected", function(event, selection)
      {
        // Remove any non-selected_simulations from hidden_simulations 
        let difference = _.difference(hidden_simulations, selected_simulations);
        _.pullAll(hidden_simulations, difference);
        // console.log("here's what we need to remove from hidden_simulations: " + difference);

        update_widgets_when_hidden_simulations_change();
        manually_hidden_simulations = hidden_simulations.slice();
      });

      // Log changes to hidden selection ...
      $("#controls").bind("show-selection", function(event, selection)
      {
        for(var i=0; i<selected_simulations.length; i++){
          var index = $.inArray(selected_simulations[i], hidden_simulations);
          if(index != -1) {
            hidden_simulations.splice(index, 1);
          }
        }
        update_widgets_when_hidden_simulations_change();
        manually_hidden_simulations = hidden_simulations.slice();
      });

      // Log changes to hidden selection ...
      $("#controls").bind("pin-selection", function(event, selection)
      {
        // Removing any hidden simulations from those that will be pinned
        var simulations_to_pin = [];
        for(var i=0; i<selected_simulations.length; i++){
          var index = $.inArray(selected_simulations[i], hidden_simulations);
          if(index == -1) {
            simulations_to_pin.push(selected_simulations[i]);
          }
        }
        $("#scatterplot").scatterplot("pin", simulations_to_pin);
      });

      // Log changes to selection ...
      $("#controls").bind("select-pinned", function(event, open_images_to_select)
      {
        let pinned_simulations = [];

        for(const open_image of open_images_to_select)
        {
          // Removing any hidden simulations from those that will be selected
          if(!hidden_simulations.includes(open_image.index))
          {
            pinned_simulations.push(open_image.index);
          }
        }

        // Merging unhidden pinned simulations with currently selected simulations
        let to_select = _.union(pinned_simulations, selected_simulations);

        selected_simulations_changed(to_select);
        $("#scatterplot").scatterplot("option", "selection", to_select);
        $("#controls").controls("option", "selection", to_select);
        $("#table").table("option", "row-selection", to_select);
      });

      // Log changes to hidden selection ...
      $("#controls").bind("show-all", function(event, selection)
      {
        while(hidden_simulations.length > 0) {
          hidden_simulations.pop();
        }
        update_widgets_when_hidden_simulations_change();
        manually_hidden_simulations = hidden_simulations.slice();
      });

      // Log changes to hidden selection ...
      $("#controls").bind("close-all", function(event, selection)
      {
        $("#scatterplot").scatterplot("close_all_simulations");
      });

    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////
  // Event handlers.
  //////////////////////////////////////////////////////////////////////////////////////////

  function selected_colormap_changed(colormap)
  {
    // Update color switcher with new colormap
    $("#color-switcher").colorswitcher("option", "colormap", colormap);

    update_current_colorscale();

    // Changing the color map updates the table with a new color scale ...
    $("#table").table("option", "colorscale", colorscale);

    // Changing the color scale updates the scatterplot ...
    $("#scatterplot-pane").css("background", $("#color-switcher").colorswitcher("get_background", colormap).toString());
    $("#scatterplot").scatterplot("option", {
      colorscale:    colorscale,
      gradient: $("#color-switcher").colorswitcher("get_gradient_data", colormap),
    });

    $.ajax(
    {
      type : "POST",
      url : api_root + "events/models/" + model_id + "/select/colormap/" + colormap
    });

    bookmarker.updateState({"colormap" : colormap});
  }

  function handle_color_variable_change(variable)
  {
    v_index = Number(variable);

    if(v_index == table_metadata["column-count"] - 1)
    {
      var count = table_metadata["row-count"];
      for(var i = 0; i != count; ++i)
        v[i] = i;
      update_widgets_after_color_variable_change();
    }
    else
    {
      update_v(variable);
    }

    $.ajax(
    {
      type : "POST",
      url : api_root + "events/models/" + model_id + "/select/variable/" + variable
    });

    bookmarker.updateState({"variable-selection" : variable});

    // Dispatch update to v indexe in Redux
    window.store.dispatch(setVIndex(v_index));
  }

  function handle_image_variable_change(variable)
  {
    images_index = Number(variable);
    images = [];

    if(images_index > -1)
    {
      // Get entire data column for current image variable and pass it to scatterplot and dendrogram
      $.ajax(
      {
        type : "GET",
        url : api_root + "models/" + model_id + "/arraysets/data-table/data?hyperchunks=0/" + images_index + "/0:" + table_metadata["row-count"],
        success : function(result)
        {
          images = result[0];
          // Passing new images to scatterplot
          $("#scatterplot").scatterplot("option", "images", images);
        },
        error: artifact_missing
      });
    }
    else
    {
      // Passing new images to scatterplot
      $("#scatterplot").scatterplot("option", "images", images);
    }

    // Log changes to and bookmark the images variable ...
    images_selection_changed(images_index);
  }

  function images_selection_changed(variable)
  {
    $.ajax(
    {
      type : "POST",
      url : api_root + "events/models/" + model_id + "/select/images/" + variable
    });
    bookmarker.updateState( {"images-selection" : variable} );
  }

  function update_v(variable)
  {
    chunker.get_model_array_attribute({
      api_root : api_root,
      mid : model_id,
      aid : "data-table",
      array : 0,
      attribute : variable,
      success : function(result)
      {
        v = result;
        if(table_metadata["column-types"][variable]=="string")
        {
          v = v[0];
        }
        // Dispatch update to v values in Redux
        window.store.dispatch(setVValues(v));
        update_widgets_after_color_variable_change();
      },
      error : artifact_missing
    });
  }

  function update_widgets_after_color_variable_change()
  {
    update_current_colorscale();
    $("#table").table("option", "colorscale", colorscale);
    $("#scatterplot").scatterplot("option", "v_index", v_index);
    $("#scatterplot").scatterplot("update_color_scale_and_v", {
      v : v, 
      v_string : table_metadata["column-types"][v_index]=="string", 
      colorscale : colorscale
    });
    $("#scatterplot").scatterplot("option", "v_label", get_variable_label(v_index));
  }

  function update_widgets_when_hidden_simulations_change()
  {
    hidden_simulations_changed();

    if(auto_scale)
    {
      update_current_colorscale();
      if($("#table").data("parameter_image-table"))
        $("#table").table("option", {hidden_simulations : hidden_simulations, colorscale : colorscale});
      // TODO this will result in 2 updates to canvas, one to redraw points according to hidden simulations and another to color them according to new colorscale. Need to combine this to a single update when converting to canvas.
      if($("#scatterplot").data("parameter_image-scatterplot"))
        $("#scatterplot").scatterplot("option", {hidden_simulations : hidden_simulations, colorscale : colorscale});
    }
    else
    {
      if($("#table").data("parameter_image-table"))
        $("#table").table("option", "hidden_simulations", hidden_simulations);
      if($("#scatterplot").data("parameter_image-scatterplot"))
        $("#scatterplot").scatterplot("option", "hidden_simulations", hidden_simulations);
    }

    if($("#controls").data("parameter_image-controls"))
      $("#controls").controls("option", "hidden_simulations", hidden_simulations);
  }

  function set_custom_color_variable_range()
  {
    // console.log(`set_custom_color_variable_range`);
    const variableRanges = window.store.getState().variableRanges[v_index];
    custom_color_variable_range.min = variableRanges != undefined ? variableRanges.min : undefined;
    custom_color_variable_range.max = variableRanges != undefined ? variableRanges.max : undefined;
  }

  function update_current_colorscale()
  {
    set_custom_color_variable_range();
    // Check if numeric or string variable
    var v_type = table_metadata["column-types"][v_index];
    if(auto_scale)
    {
      filtered_v = filterValues(v);
    }
    else
    {
      filtered_v = v;
    }

    if(v_type != "string")
    {
      let axes_variables = store.getState().axesVariables[v_index];
      let v_axis_type = axes_variables != undefined ? axes_variables : 'Linear';
      let get_color_scale_function = v_axis_type == 'Log' ? 'get_color_scale_log' : 'get_color_scale';
      // console.log(`v_axis_type is ${v_axis_type}`);

      // console.log(`update_current_colorscale for not strings`);
      colorscale = $("#color-switcher").colorswitcher(
        get_color_scale_function, 
        undefined, 
        custom_color_variable_range.min != undefined ? custom_color_variable_range.min : d3.min(filtered_v), 
        custom_color_variable_range.max != undefined ? custom_color_variable_range.max : d3.max(filtered_v),
      );
    }
    else
    {
      var uniqueValues = d3.set(filtered_v).values().sort();
      colorscale = $("#color-switcher").colorswitcher("get_color_scale_ordinal", undefined, uniqueValues);;
    }
  }

  // Filters source values by removing hidden_simulations
  function filterValues(source)
  {
    var self = this;
    hidden_simulations.sort(d3.ascending);
    var length = hidden_simulations.length;

    var filtered = cloneArrayBuffer(source);

    for(var i=length-1; i>=0; i--)
    {
      filtered.splice(hidden_simulations[i], 1);
    }

    return filtered;
  }

  // Clones an ArrayBuffer or Array
  function cloneArrayBuffer(source)
  {
    if(source.length > 1)
    {
      return Array.apply( [], source );
    }
    else if(source.length == 1)
    {
      return [source[0]];
    }
    return [];
  }

  function variable_sort_changed(variable, order)
  {
    $.ajax(
    {
      type : "POST",
      url : api_root + "events/models/" + model_id + "/select/sort-order/" + variable + "/" + order
    });
    bookmarker.updateState( {"sort-variable" : variable, "sort-order" : order} );
  }

  function selected_simulations_changed(selection)
  {
    // console.log("selected_simulations_changed");
    // Logging every selected item is too slow, so just log the count instead.
    $.ajax(
    {
      type : "POST",
      url : api_root + "events/models/" + model_id + "/select/simulation/count/" + selection.length
    });
    bookmarker.updateState( {"simulation-selection" : selection} );
    selected_simulations = selection;
  }

  function x_selection_changed(variable)
  {
    $.ajax(
    {
      type : "POST",
      url : api_root + "events/models/" + model_id + "/select/x/" + variable
    });
    bookmarker.updateState( {"x-selection" : variable} );
    x_index = Number(variable);

    // Dispatch update to x index in Redux
    window.store.dispatch(setXIndex(x_index));
  }

  function y_selection_changed(variable)
  {
    $.ajax(
    {
      type : "POST",
      url : api_root + "events/models/" + model_id + "/select/y/" + variable
    });
    bookmarker.updateState( {"y-selection" : variable} );
    y_index = Number(variable);

    // Dispatch update to y index in Redux
    window.store.dispatch(setYIndex(y_index));
  }

  function auto_scale_option_changed(auto_scale_value)
  {
    auto_scale = auto_scale_value;
    if(hidden_simulations.length > 0)
    {
      update_current_colorscale();
      $("#table").table("option", "colorscale", colorscale);
      // TODO this will result in 2 updates to canvas, one to redraw points accourding to scale and another to color them according to new colorscale. Need to combine this to a single update when converting to canvas.
      $("#scatterplot").scatterplot("option", {colorscale : colorscale, 'auto-scale' : auto_scale});
    }
    else
    {
      $("#scatterplot").scatterplot("option", "auto-scale", auto_scale);
    }
    $.ajax(
    {
      type : "POST",
      url : api_root + "events/models/" + model_id + "/auto-scale/" + auto_scale
    });
    bookmarker.updateState( {"auto-scale" : auto_scale} );
  }

  function video_sync_option_changed(video_sync_value)
  {
    video_sync = video_sync_value;
    $("#scatterplot").scatterplot("option", "video-sync", video_sync);
    $.ajax(
    {
      type : "POST",
      url : api_root + "events/models/" + model_id + "/video-sync/" + video_sync
    });
    bookmarker.updateState( {"video-sync" : video_sync} );
  }

  function video_sync_time_changed(video_sync_time_value)
  {
    video_sync_time = video_sync_time_value;
    $.ajax(
    {
      type : "POST",
      url : api_root + "events/models/" + model_id + "/video-sync-time/" + video_sync_time
    });
    bookmarker.updateState( {"video-sync-time" : video_sync_time} );
  }

  function threeD_sync_option_changed(threeD_sync_value)
  {
    threeD_sync = threeD_sync_value;
    $("#scatterplot").scatterplot("option", "threeD_sync", threeD_sync);
    setSyncCameras(threeD_sync);
    // Update Redux state
    window.store.dispatch(updateThreeDSync(threeD_sync_value));
    $.ajax(
    {
      type : "POST",
      url : api_root + "events/models/" + model_id + "/threeD_sync/" + threeD_sync
    });
    bookmarker.updateState( {"threeD_sync" : threeD_sync} );
  }

  function hidden_simulations_changed()
  {
    // Logging every hidden simulation is too slow, so just log the count instead.
    $.ajax(
    {
      type : "POST",
      url : api_root + "events/models/" + model_id + "/hidden/count/" + hidden_simulations.length
    });
    bookmarker.updateState( { "hidden-simulations" : hidden_simulations, "manually-hidden-simulations" : manually_hidden_simulations } );
  }

  function update_scatterplot_x(variable)
  {
    chunker.get_model_array_attribute({
      api_root : api_root,
      mid : model_id,
      aid : "data-table",
      array : 0,
      attribute : variable,
      success : function(result)
      {
        const x = table_metadata["column-types"][variable]=="string" ? result[0] : result;
        // Dispatch update to x values in Redux
        window.store.dispatch(setXValues(x));
        $("#scatterplot").scatterplot("option", {
          x_index: variable,
          x_string: table_metadata["column-types"][variable]=="string", 
          x: x, 
          x_label: get_variable_label(variable),
        });
      },
      error : artifact_missing
    });
  }

  function update_scatterplot_y(variable)
  {
    chunker.get_model_array_attribute({
      api_root : api_root,
      mid : model_id,
      aid : "data-table",
      array : 0,
      attribute : variable,
      success : function(result)
      {
        const y = table_metadata["column-types"][variable]=="string" ? result[0] : result;
        // Dispatch update to y values in Redux
        window.store.dispatch(setYValues(y));
        $("#scatterplot").scatterplot("option", {
          y_index: variable,
          y_string: table_metadata["column-types"][variable]=="string", 
          y: y, 
          y_label:get_variable_label(variable),
        });
      },
      error : artifact_missing
    });
  }

  function load_table_statistics(columns, callback)
  {
    client.get_model_arrayset_metadata(
    {
      mid: model_id,
      aid: "data-table",
      statistics: "0/" + columns.join("|"),
      success: function(metadata)
      {
        if(table_statistics === null)
        {
          table_statistics = new Array();
        }
        var statistics = metadata.statistics;
        for(var i = 0; i != statistics.length; ++i)
          table_statistics[statistics[i].attribute] = {min: statistics[i].min, max: statistics[i].max};
        callback();
      }
    });
  }

  function active_filters_ready()
  {
    var filter;
    var allFilters = filter_manager.allFilters;
    for(var i = 0; i < allFilters().length; i++)
    {
      filter = allFilters()[i];
      if(filter.type() == 'numeric')
      {
        filter.max.subscribe(function(newValue){
          filters_changed(newValue);
        });
        filter.min.subscribe(function(newValue){
          filters_changed(newValue);
        });
        filter.rateLimitedHigh.subscribe(function(newValue){
          filters_changed(newValue);
        });
        filter.rateLimitedLow.subscribe(function(newValue){
          filters_changed(newValue);
        });
        filter.invert.subscribe(function(newValue){
          filters_changed(newValue);
        });
      }
      else if(filter.type() == 'category')
      {
        filter.selected.subscribe(function(newValue){
          filters_changed(newValue);
        });
      }
      filter.nulls.subscribe(function(newValue){
        filters_changed(newValue);
      });
    }

    $("#controls").controls("option", "disable_hide_show", filter_manager.active_filters().length > 0);

    filter_manager.active_filters.subscribe(function(newValue) {
      filters_changed(newValue);
      if($("#controls").data("parameter_image-controls"))
      {
        $("#controls").controls("option", "disable_hide_show", newValue.length > 0);
      }
    });
  }

  function filters_changed(newValue)
  {
    var allFilters = filter_manager.allFilters;
    var active_filters = filter_manager.active_filters;
    var filter_var, selected_values;
    var new_filters = [];

    for(var i = 0; i < allFilters().length; i++)
    {
      let filter = allFilters()[i];
      if(filter.active())
      {
        filter_var = 'a' + filter.index();
        if(filter.type() == 'numeric')
        {
          if( filter.invert() )
          {
            new_filters.push( '(' + filter_var + ' >= ' + filter.high() + ' and ' + filter_var + ' <= ' + filter.max() + ' or ' + filter_var + ' <= ' + filter.low() + ' and ' + filter_var + ' >= ' + filter.min() + ')' );
          }
          else if( !filter.invert() )
          {
            new_filters.push( '(' + filter_var + ' <= ' + filter.high() + ' and ' + filter_var + ' >= ' + filter.low() + ')' );
          }
        }
        else if(filter.type() == 'category')
        {
          selected_values = [];
          var optional_quote = "";
          if(filter.selected().length == 0)
          {
            selected_values.push( '""' );
          }
          else
          {
            for(var j = 0; j < filter.selected().length; j++)
            {
              optional_quote = table_metadata["column-types"][filter.index()] == "string" ? '"' : '';
              selected_values.push( optional_quote + filter.selected()[j].value() + optional_quote );
            }
          }
          new_filters.push( '(' + filter_var + ' in [' + selected_values.join(', ') + '])' );
        }
        if( filter.nulls() )
        {
          new_filters[new_filters.length-1] = '(' + new_filters[new_filters.length-1] + ' or ' + filter_var + ' == nan'  + ')';
        }
      }
    }
    filter_expression = new_filters.join(' and ');

    // We have one or more filters
    if( !(filter_expression == null || filter_expression == "") )
    {
      // Abort existing ajax request
      if(filterxhr && filterxhr.readyState != 4)
      {
        filterxhr.abort();
        console.log('aborted');
      }
      filterxhr = $.ajax(
      {
        type : "POST",
        url : api_root + "models/" + model_id + "/arraysets/data-table/data",
        data: JSON.stringify({"hyperchunks": "0/index(0)|" + filter_expression + "/..."}),
        contentType: "application/json",
        success : function(data)
        {
          var filter_indices = data[0];
          var filter_status = data[1];

          // Clear hidden_simulations
          while(hidden_simulations.length > 0) {
            hidden_simulations.pop();
          }

          for(var i=0; i < filter_status.length; i++)
          {
            // Add if it's being filtered out
            if(!filter_status[i])
            {
              hidden_simulations.push( filter_indices[i] );
            }
          }

          hidden_simulations.sort((a, b) => a - b);

          update_widgets_when_hidden_simulations_change();
        },
        error: function(request, status, reason_phrase)
        {
          console.log("error", request, status, reason_phrase);
        }
      });
    }
    // We have no more filters, so revert to any manually hidden simulations
    else
    {
      // Abort any remaining filter xhr calls since the last filter was closed
      // and we don't want long calls to come back now and filter anything.
      if(filterxhr)
      {
        filterxhr.abort();
        console.debug('filter xhr aborted because last filter was closed');
      }

      // Clear hidden_simulations
      while(hidden_simulations.length > 0) {
        hidden_simulations.pop();
      }

      // Revert to manually hidden simulations
      for(var i = 0; i < manually_hidden_simulations.length; i++){
        hidden_simulations.push(manually_hidden_simulations[i]);
      }

      update_widgets_when_hidden_simulations_change();
    }
  }
});
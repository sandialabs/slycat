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
import color_maps from "js/slycat-color-maps";

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
import COLOR_LABELS from 'components/color-labels.js';

import { Provider } from 'react-redux';
import { createStore } from 'redux';
import cca_reducer from './reducers';

// Wait for document ready
$(document).ready(function() {

  //////////////////////////////////////////////////////////////////////////////////////////
  // Setup global variables.
  //////////////////////////////////////////////////////////////////////////////////////////

  var model = {_id: URI(window.location).segment(-1)};
  var input_columns = null;
  var output_columns = null;
  var scale_inputs = null;

  var bookmarker = null;
  var bookmark = null;

  var x_loadings = null;
  var y_loadings = null;
  var indices = null;
  var x = null;
  var y = null;
  var v = null;
  var r2 = null;
  var wilks = null;
  var table_metadata = null;
  var selected_simulations = null;
  var colormap = null;

  var cca_component = null;
  var sort_variable = null;
  var sort_order = null;

  var generate_indices = false;
  var barplot_ready = false;
  var scatterplot_ready = false;
  var table_ready = false;
  // var legend_ready = false;
  var controls_ready = false;
  var previous_state = "";

  var store = null;

  //////////////////////////////////////////////////////////////////////////////////////////
  // Get the model
  //////////////////////////////////////////////////////////////////////////////////////////
  function doPoll(){
    client.get_model(
    {
      mid: model._id,
      success : function(result)
      {
        model = result;
        if(previous_state === ""){
          previous_state = model["state"];
        }
        bookmarker = bookmark_manager.create(model.project, model._id);
        input_columns = model["artifact:input-columns"];
        output_columns = model["artifact:output-columns"];
        scale_inputs = model["artifact:scale-inputs"];

        if(model["state"] === "waiting" || model["state"] === "running") {
          setTimeout(doPoll, 5000);
          return;
        }
        if(model["state"] === "closed" && model["result"] === null)
          return;
        if(model["result"] === "failed")
          return;
        $('.slycat-navbar-alert').remove();
        setup_page();
      },
      error: dialog.ajax_error("Error retrieving model."),
    });
  }
  doPoll();

  //////////////////////////////////////////////////////////////////////////////////////////
  // If the model is ready, start retrieving data, including bookmarked state.
  //////////////////////////////////////////////////////////////////////////////////////////

  function setup_page()
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

    // Load the x_loadings artifact.
    chunker.get_model_array_attribute({
      api_root : api_root,
      mid : model._id,
      aid : "input-structure-correlation",
      array : 0,
      attribute : 0,
      success : function(result)
      {
        x_loadings = result;
        setup_widgets();
      },
      error : artifact_missing
    });

    // Load the y_loadings artifact.
    chunker.get_model_array_attribute({
      api_root : api_root,
      mid : model._id,
      aid : "output-structure-correlation",
      array : 0,
      attribute : 0,
      success : function(result)
      {
        y_loadings = result;
        setup_widgets();
      },
      error : artifact_missing
    });

    // Load the r^2 statistics artifact.
    chunker.get_model_array_attribute({
      api_root : api_root,
      mid : model._id,
      aid : "cca-statistics",
      array : 0,
      attribute : 0,
      success : function(result)
      {
        r2 = result;
        setup_widgets();
      },
      error : artifact_missing
    });

    // Load the Wilks statistics artifact.
    chunker.get_model_array_attribute({
      api_root : api_root,
      mid : model._id,
      aid : "cca-statistics",
      array : 0,
      attribute : 1,
      success : function(result)
      {
        wilks = result;
        setup_widgets();
      },
      error : artifact_missing
    });

    // Load the canonical-indices artifact.
    chunker.get_model_array_attribute({
      api_root : api_root,
      mid : model._id,
      aid : "canonical-indices",
      array : 0,
      attribute : 0,
      success : function(result)
      {
        indices = result;
        setup_widgets();
      },
      error : function()
      {
        generate_indices = true;
        setup_indices();
      }
    });

    // Load the canonical-variables artifacts.
    chunker.get_model_array_attribute({
      api_root : api_root,
      mid : model._id,
      aid : "canonical-variables",
      array : 0,
      attribute : 0,
      success : function(result)
      {
        x = result;
        setup_widgets();
      },
      error : artifact_missing
    });

    chunker.get_model_array_attribute({
      api_root : api_root,
      mid : model._id,
      aid : "canonical-variables",
      array : 0,
      attribute : 1,
      success : function(result)
      {
        y = result;
        setup_widgets();
      },
      error : artifact_missing
    });

    // Load data table metadata.
    client.get_model_table_metadata(
    {
      mid: model._id,
      aid: "data-table",
      index: "Index",
      success: function(metadata)
      {
        table_metadata = metadata;

        // Retrieve bookmarked state information ...
        bookmarker.getState(function(state)
        {
          bookmark = state;

          // Make sure we have good state defaults if they are not in the bookmark
          if (bookmark["simulation-selection"] === undefined)
          {
            bookmark["simulation-selection"] = [];
          }
          if (bookmark["colormap"] === undefined)
          {
            bookmark["colormap"] = "night";
          }
          if (bookmark["cca-component"] === undefined)
          {
            bookmark["cca-component"] = 0;
          }
          if (bookmark["sort-variable"] === undefined)
          {
            bookmark["sort-variable"] = null;
          }
          if (bookmark["sort-order"] === undefined)
          {
            bookmark["sort-order"] = null;
          }
          if (bookmark["variable-selection"] === undefined)
          {
            bookmark["variable-selection"] = table_metadata["column-count"] - 1;
          }

          // Map old style bookmark data to new Redux state tree
          const redux_state_tree = {
            variable_selected: bookmark['variable-selection']
          }

          // Create Redux store and set its state based on what's in the bookmark
          store = createStore(cca_reducer, redux_state_tree);

          // Save Redux state to bookmark whenever it changes
          const bookmarkState = () => {
            bookmarker.updateState(store.getState());
          };
          store.subscribe(bookmarkState);

          selected_simulations = bookmark["simulation-selection"] !== undefined ? bookmark["simulation-selection"] : [];
          colormap = bookmark["colormap"] !== undefined ? bookmark["colormap"] : "night";

          cca_component = bookmark["cca-component"] !== undefined ? bookmark["cca-component"] : 0;

          sort_variable = bookmark["sort-variable"] !== undefined ? bookmark["sort-variable"] : null;
          sort_order = bookmark["sort-order"] !== undefined ? bookmark["sort-order"] : null;

          // setup_colorswitcher();
          setup_v();
          setup_widgets();
        });

        setup_indices();
        setup_v();
        setup_widgets();
      },
      error: artifact_missing
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
  // Setup page layout and forms.
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
    // east:
    // {
    //   size: 130,
    //   resizeWhileDragging: false,
    //   onresize_end: function() { 
    //     if($("#legend").data("cca-legend")) {
    //       $("#legend").legend("option", {width: $("#legend-pane").width(), height: $("#legend-pane").height()}); 
    //     }
    //   },
    // },
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
  // Setup the rest of the UI as data is received.
  //////////////////////////////////////////////////////////////////////////////////////////

  function setup_indices()
  {
    if(generate_indices && table_metadata)
    {
      var count = table_metadata["row-count"];
      indices = new Int32Array(count);
      for(var i = 0; i != count; ++i)
        indices[i] = i;
      setup_widgets();
    }
  }

  function setup_v()
  {
    if(bookmark && table_metadata && (store !== null))
    {
      if(store.getState().variable_selected == table_metadata["column-count"] - 1)
      {
        var count = table_metadata["row-count"];
        v = new Float64Array(count);
        for(var i = 0; i != count; ++i)
          v[i] = i;
        setup_widgets();
      }
      else
      {
        chunker.get_model_array_attribute({
          api_root : api_root,
          mid : model._id,
          aid : "data-table",
          array : 0,
          attribute : store.getState().variable_selected,
          success : function(result)
          {
            v = result;
            setup_widgets();
          },
          error : artifact_missing
        });
      }
    }
  }

  // function setup_colorswitcher()
  // {
  //   // $("#color-switcher").colorswitcher({colormap:colormap});
  // }

  function setup_widgets()
  {
    // // Setup the legend ...
    // if(!legend_ready && bookmark && table_metadata && (colormap !== null))
    // {
    //   legend_ready = true;

    //   $("#legend-pane .load-status").css("display", "none");

    //   $("#legend-pane").css("background", $("#color-switcher").colorswitcher("get_background", colormap).toString());

    //   var v_index = table_metadata["column-count"] - 1;
    //   if("variable-selection" in bookmark)
    //     v_index = bookmark["variable-selection"];

    //   $("#legend").legend({
    //     width: $("#legend-pane").width(),
    //     height: $("#legend-pane").height(),
    //     gradient: $("#color-switcher").colorswitcher("get_gradient_data", colormap),
    //     label: table_metadata["column-names"][v_index],
    //     min: table_metadata["column-min"][v_index],
    //     max: table_metadata["column-max"][v_index],
    //   });
    // }

    // Setup the barplot ...
    if(!barplot_ready && bookmark && table_metadata && r2 && wilks && x_loadings && y_loadings 
      && (cca_component !== null) && (store !== null))
    {
      barplot_ready = true;

      // $("#barplot-pane .load-status").css("display", "none");

      // $("#barplot-table").barplot({
      //   metadata: table_metadata,
      //   inputs: input_columns,
      //   outputs: output_columns,
      //   r2: r2,
      //   wilks: wilks,
      //   x_loadings: x_loadings,
      //   y_loadings: y_loadings,
      //   component: component,
      // });

      // if("variable-selection" in bookmark)
      // {
      //   $("#barplot-table").barplot("option", "variable", bookmark["variable-selection"]);
      // }

      // $("#barplot-table").bind("component-changed", function(event, component)
      // {
      //   selected_component_changed(component);
      // });

      // $("#barplot-table").bind("component-sort-changed", function(event, component, order)
      // {
      //   component_sort_changed(component, order);
      // });

      // if("sort-cca-component" in bookmark && "sort-direction-cca-component" in bookmark)
      // {
      //   $("#barplot-table").barplot("option",
      //   {
      //     "sort": [bookmark["sort-cca-component"], bookmark["sort-direction-cca-component"]]
      //   });
      // }

      const cca_barplot = 
        (<Provider store={store}>
          <CCABarplot 
            metadata={table_metadata}
            inputs={input_columns}
            outputs={output_columns}
            r2={r2}
            wilks={wilks}
            x_loadings={x_loadings}
            y_loadings={y_loadings}
            component={cca_component}
            sort={{component: bookmark["sort-cca-component"], direction: bookmark["sort-direction-cca-component"]}}
            // variable_selection={store.getState().variable_selected}
          />
        </Provider>)
      ;

      self.cca_barplot = ReactDOM.render(
        cca_barplot,
        document.getElementById('barplot-table')
      );
    }

    // Setup the scatterplot ...
    if(!scatterplot_ready && bookmark && table_metadata && indices && x && y && v 
      && (selected_simulations !== null) && (colormap !== null) && (cca_component !== null)
      && (store !== null)
    )
    {
      scatterplot_ready = true;

      // $("#scatterplot-pane .load-status").css("display", "none");
      $("#scatterplot-pane").css("background", color_maps.get_background(colormap).toString());

      // $("#scatterplot").scatterplot({
      //   indices: indices,
      //   x: x[component],
      //   y: y[component],
      //   v: v,
      //   width: $("#scatterplot-pane").width(),
      //   height: $("#scatterplot-pane").height(),
      //   color: $("#color-switcher").colorswitcher("get_color_scale", colormap),
      //   selection: selected_simulations,
      //   });

      // $("#scatterplot").bind("selection-changed", function(event, selection)
      // {
      //   selected_simulations = selection;

      //   // Changing the scatterplot selection updates the table row selection ...
      //   $("#table").table("option", "row-selection", selected_simulations);

      //   selected_simulations_changed(selected_simulations);
      // });

      // // Changing the barplot component updates the scatterplot ...
      // $("#barplot-table").bind("component-changed", function(event, component)
      // {
      //   $("#scatterplot").scatterplot("option", {x : x[component], y : y[component]});
      // });

      const cca_scatterplot = 
        (<Provider store={store}>
          <CCAScatterplot
            indices={indices}
            x={x[cca_component]}
            y={y[cca_component]}
            v={v}
            width={$("#scatterplot-pane").width()}
            height={$("#scatterplot-pane").height()}
            color={color_maps.get_color_scale(colormap)}
            selection={selected_simulations}
            border={{top: 40, right: 150, bottom: 40, left: 40}}
            label_offset={{x: 25, y: 25}}
            drag_threshold={3}
            pick_distance={3}
            gradient={color_maps.get_gradient_data(colormap)}
            v_string={table_metadata["column-types"][store.getState().variable_selected]=="string"}
            v_label={table_metadata["column-names"][store.getState().variable_selected]}
            font_size={'14px'}
            font_family={'Arial'}
          />
        </Provider>)
      ;

      self.cca_scatterplot = ReactDOM.render(
        cca_scatterplot,
        document.getElementById('scatterplot-pane')
      );
    }

    // Setup the table ...
    if(!table_ready && bookmark && table_metadata && (selected_simulations !== null) 
      && (colormap !== null) && (cca_component !== null) && (store !== null)

    )
    {
      table_ready = true;

      // $("#table-pane .load-status").css("display", "none");

      var other_columns = [];
      for(var i = 0; i != table_metadata["column-count"] - 1; ++i)
      {
        if($.inArray(i, input_columns) == -1 && $.inArray(i, output_columns) == -1)
          other_columns.push(i);
      }

      // var table_options =
      // {
      //   api_root : api_root,
      //   mid : model._id,
      //   aid : "data-table",
      //   metadata : table_metadata,
      //   inputs : input_columns,
      //   outputs : output_columns,
      //   others : other_columns,
      //   "row-selection" : selected_simulations,
      // };

      // table_options.colormap = $("#color-switcher").colorswitcher("get_color_scale", colormap);

      // if("sort-variable" in bookmark && "sort-order" in bookmark)
      // {
      //   table_options["sort-variable"] = bookmark["sort-variable"];
      //   table_options["sort-order"] = bookmark["sort-order"];
      // }

      // if("variable-selection" in bookmark)
      // {
      //   table_options["variable-selection"] = [bookmark["variable-selection"]];
      // }
      // else
      // {
      //   table_options["variable-selection"] = [table_metadata["column-count"] - 1];
      // }

      // $("#table").table(table_options);

      // // Log changes to the table sort order ...
      // $("#table").bind("variable-sort-changed", function(event, variable, order)
      // {
      //   variable_sort_changed(variable, order);
      // });

      // // Log changes to the table row selection ...
      // $("#table").bind("row-selection-changed", function(event, selection)
      // {
      //   // The table selection is an array buffer which can't be
      //   // serialized as JSON, so convert it to an array.
      //   var temp = [];
      //   for(var i = 0; i != selection.length; ++i)
      //     temp.push(selection[i]);
      //   selected_simulations = temp;

      //   // Changing the table row selection updates the scatterplot ...
      //   $("#scatterplot").scatterplot("option", "selection",  selected_simulations);

      //   selected_simulations_changed(selected_simulations);
      // });

      const cca_table = 
        <Provider store={store}>
          <CCATable 
            mid={model._id}
            aid="data-table"
            metadata={table_metadata}
            inputs={input_columns}
            outputs={output_columns}
            others={other_columns}
            component={cca_component}
            row_selection={selected_simulations}
            colormap={color_maps.get_color_scale(colormap)}
            sort_variable={sort_variable}
            sort_order={sort_order}
            variable_selection={store.getState().variable_selected}
          />
        </Provider>
      ;

      self.cca_table = ReactDOM.render(
        cca_table,
        document.getElementById('table-pane')
      );
    }

    // Setup controls ...
    if( !controls_ready && bookmark && table_metadata && (selected_simulations != null) )
    {
      controls_ready = true;

      var color_variables = [];
      // Last column is the index, so it goes first
      color_variables.push(table_metadata["column-count"] - 1);
      // Then we add inputs
      for(var i = 0; i < input_columns.length; i++)
      {
        color_variables.push(input_columns[i]);
      }
      // Followed by outputs
      for(var i = 0; i < output_columns.length; i++)
      {
        color_variables.push(output_columns[i]);
      }
      // Finally the others
      for(var i = 0; i != table_metadata["column-count"] - 1; ++i)
      {
        if($.inArray(i, input_columns) == -1 && $.inArray(i, output_columns) == -1 && table_metadata["column-types"][i] != "string")
          color_variables.push(i);
      }

      var color_variable = table_metadata["column-count"] - 1;
      if("variable-selection" in bookmark)
      {
        color_variable = [bookmark["variable-selection"]];
      }

      // $("#controls-pane #controls").controls({
      //   mid : model._id,
      //   model_name: window.model_name,
      //   aid : "data-table",
      //   metadata: table_metadata,
      //   color_variables: color_variables,
      //   "color-variable" : color_variable,
      //   selection : selected_simulations,
      // });

      // Create the React CCAControlsBar component
      const color_variable_dropdown_items = [];
      for(let color_variable of color_variables) {
        color_variable_dropdown_items.push({
          key: color_variable, 
          name: table_metadata['column-names'][color_variable]
        });
      }

      const dropdown = [{
        id: 'color-switcher',
        label: 'Color',
        title: 'Change color scheme',
        state_label: 'color',
        trigger: 'colormap-changed',
        items: COLOR_LABELS,
        selected: colormap,
        single: true,
      }];

      const cca_controls_bar = 
        <CCAControlsBar 
          element={self.element}
          selection={selected_simulations}
          mid={model._id}
          aid={"data-table"}
          model_name={window.model_name}
          metadata={table_metadata}
          color_variables={color_variable_dropdown_items}
          color_variable={color_variable}
          indices={indices}
          dropdown_color={dropdown}
          selection_color={colormap}
        />
      ;

      self.CCAControlsBarComponent = ReactDOM.render(
        cca_controls_bar,
        document.getElementById('cca-controls-bar')
      );
    }

  }

  //////////////////////////////////////////////////////////////////////////////////////////
  // Event handlers.
  //////////////////////////////////////////////////////////////////////////////////////////

  // Changes to the barplot variable ...
  $("#barplot-table").bind("variable-changed", function(event, variable)
  {
    // Log changes to the barplot variable selection ...
    selected_variable_changed(variable);
    // Changing the barplot variable updates the legend ...
    // $("#legend").legend("option", {
    //   min: table_metadata["column-min"][variable],
    //   max: table_metadata["column-max"][variable],
    //   label: table_metadata["column-names"][variable],
    // });
    // Changing the barplot variable updates the scatterplot ...
    update_scatterplot_value(variable);
    // Changing the barplot variable updates the table ...
    $("#table").table("option", "variable-selection", [variable]);
    // Changing the barplot variable updates the controls ...
    // $("#controls").controls("option", "color-variable", variable);
  });

  // Changes to the color map ...
  $("#color-switcher").bind("colormap-changed", function(event, colormap)
  {
    // Log changes to the selected color map ...
    selected_colormap_changed(colormap);
    // Changing the color map updates the legend ...
    // $("#legend-pane").css("background", $("#color-switcher").colorswitcher("get_background", colormap).toString());
    // $("#legend").legend("option", {gradient: $("#color-switcher").colorswitcher("get_gradient_data", colormap)});
    // // Changing the color map updates the scatterplot ...
    // $("#scatterplot-pane").css("background", $("#color-switcher").colorswitcher("get_background", colormap).toString());
    // $("#scatterplot").scatterplot("option", {color: $("#color-switcher").colorswitcher("get_color_scale", colormap)});
    // Changing the colormap updates the table ...
    // $("#table").table("option", "colormap", $("#color-switcher").colorswitcher("get_color_scale", colormap));
  });

  // Changes to the table variable selection ...
  $("#table").bind("variable-selection-changed", function(event, selection)
  {
    // Log changes to the table variable selection ...
    selected_variable_changed(selection[0]);
    // Changing the table variable updates the barplot ...
    $("#barplot-table").barplot("option", "variable", selection[0]);
    // Changing the table variable updates the scatterplot ...
    update_scatterplot_value(selection[0]);
    // Changing the table variable updates the controls ...
    // $("#controls").controls("option", "color-variable", selection[0]);
    // Changing the table variable selection updates the legend ...
    // $("#legend").legend("option", {
    //   min: table_metadata["column-min"][selection[0]],
    //   max: table_metadata["column-max"][selection[0]],
    //   label: table_metadata["column-names"][selection[0]],
    // });
  });

  // // Handle color variable selection ...
  // $("#controls").bind("color-selection-changed", function(event, variable)
  // {
  //   // Log changes to the color variable ...
  //   selected_variable_changed(variable);
  //   // Changing the color variable updates the barplot ...
  //   $("#barplot-table").barplot("option", "variable", variable);
  //   // Changing the color variable updates the legend ...
  //   // $("#legend").legend("option", {
  //   //   min: table_metadata["column-min"][variable],
  //   //   max: table_metadata["column-max"][variable],
  //   //   label: table_metadata["column-names"][variable],
  //   // });
  //   // Changing the barplot variable updates the scatterplot ...
  //   update_scatterplot_value(variable);
  //   // Changing the color variable updates the table ...
  //   $("#table").table("option", "variable-selection", [Number(variable)]);
  // });

  function selected_colormap_changed(colormap)
  {
    client.post_event(
    {
      path: "models/" + model._id + "/select/colormap/" + colormap,
    });
    bookmarker.updateState({"colormap" : colormap});
  }

  function selected_component_changed(component)
  {
    client.post_event(
    {
      path: "models/" + model._id + "/select/component/" + component
    });
    bookmarker.updateState({"cca-component" : component});
  }

  function component_sort_changed(component, order)
  {
    client.post_event(
    {
      path: "models/" + model._id + "/sort/component/" + component + "/" + order
    });
    bookmarker.updateState({"sort-cca-component" : component, "sort-direction-cca-component" : order});
  }

  function selected_variable_changed(variable)
  {
    client.post_event(
    {
      path: "models/" + model._id + "/select/variable/" + variable
    });
    bookmarker.updateState({"variable-selection" : variable});
  }

  function variable_sort_changed(variable, order)
  {
    client.post_event(
    {
      path: "models/" + model._id + "/select/sort-order/" + variable + "/" + order
    });
    bookmarker.updateState( {"sort-variable" : variable, "sort-order" : order} );
  }

  function selected_simulations_changed(selection)
  {
    // Changing the selection updates controls ...
    // $("#controls").controls("option", "selection", selection);

    // Logging every selected item is too slow, so just log the count instead.
    client.post_event(
    {
      path: "models/" + model._id + "/select/simulation/count/" + selection.length
    });
    bookmarker.updateState( {"simulation-selection" : selection} );
  }

  function update_scatterplot_value(attribute)
  {
    if(attribute == table_metadata["column-count"] - 1)
    {
      var count = v.length;
      for(var i = 0; i != count; ++i)
        v[i] = i;
      $("#scatterplot").scatterplot("option", {v : v});
    }
    else
    {
      chunker.get_model_array_attribute({
        api_root : api_root,
        mid : model._id,
        aid : "data-table",
        array : 0,
        attribute : attribute,
        success : function(result)
        {
          v = result;
          $("#scatterplot").scatterplot("option", {v : v});
        },
        error : artifact_missing
      });
    }
  }
});

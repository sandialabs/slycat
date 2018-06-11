/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

import jquery_ui_css from "jquery-ui/themes/base/jquery-ui.css";
import slick_grid_css from "css/slickgrid/slick.grid.css";
import slick_default_theme_css from "css/slickgrid/slick-default-theme.css";
import slick_headerbuttons_css from "css/slickgrid/slick.headerbuttons.css";
import slick_slycat_theme_css from "css/slick-slycat-theme.css";
import slycat_additions_css from "css/slycat-additions.css";
import ui_css from "../css/ui.css";

import server_root from "js/slycat-server-root";
import ko from "knockout";
import client from "js/slycat-web-client-webpack";
import bookmark_manager from "js/slycat-bookmark-manager-webpack";
import * as dialog from "js/slycat-dialog-webpack";
import d3 from "js/d3.min";
import URI from "urijs";
import * as chunker from "js/chunker";

import "js/slycat-job-checker-webpack";
import "./parameter-image-scatterplot";
import "./parameter-controls";
import "./parameter-image-dendrogram";
import "./parameter-image-table";
import "./color-switcher";
import "jquery-ui";
import "js/jquery.layout-latest.min";
import "js/slycat-navbar-webpack"
import * as slycat_model_main from "js/slycat-model-main-webpack";

// Wait for document ready
$(document).ready(function() {

  slycat_model_main.start();
  ko.applyBindings({}, document.getElementsByClassName('slycat-content')[0]);

  //////////////////////////////////////////////////////////////////////////////////////////
  // Setup global variables.
  //////////////////////////////////////////////////////////////////////////////////////////

  var model = null;
  var default_image = null;
  var model_id = URI(window.location).segment(-1);
  var input_columns = null;
  var output_columns = null;
  var image_columns = null;
  var rating_columns = null;
  var category_columns = null;

  var bookmarker = null;
  var bookmark = null;

  var clusters = null; // This is just the list of cluster names
  var cluster_index = null; // This is the index of the currently selected cluster
  var clusters_data = null; // This holds data for each cluster

  var table_metadata = null;
  var table_statistics = null;
  var indices = null;
  var x_index = null;
  var y_index = null;
  var v_index = null;
  var images_index = null;
  var x = null;
  var y = null;
  var v = null;
  var images = null;
  var selected_simulations = null;
  var hidden_simulations = null;
  var colormap = null;
  var colorscale = null;
  var auto_scale = null;
  var filtered_v = null;

  var table_ready = false;
  var scatterplot_ready = false;
  var controls_ready = false;
  var dendrogram_ready = false;
  var cluster_ready = false;

  var image_uri = document.createElement("a");
  var grid_pane = "#parameter-image-plus-layout";
  // image_cache needs to be shared between dendrogram and scatterplot, thus it is passed inside an array to keep it in sync.
  // http://api.jqueryui.com/jquery.widget/
  // All options passed on init are deep-copied to ensure the objects can be modified later without affecting the widget.
  // Arrays are the only exception, they are referenced as-is.
  // This exception is in place to support data-binding, where the data source has to be kept as a reference.
  var image_cache = {};
  var cache_references = [ image_cache ];

  var login_dialog = $("#remote-login-dialog");

  //////////////////////////////////////////////////////////////////////////////////////////
  // Setup page layout.
  //////////////////////////////////////////////////////////////////////////////////////////

  login_dialog.dialog({
    autoOpen: false,
    width: 700,
    height: 300,
    modal: true,
    close: function()
    {
      $("#remote-password", this).val("");
    },
    open: function()
    {
      // Neither of these work on the first instantiation of the dialog.
      // $("#remote-username", this).focus();
      // setTimeout(function(){
      //   $("#remote-username").focus();
      // },1);
    },
  });

  // Enter key in password field triggers click on Login button
  $("#remote-password", login_dialog).keypress(function(event){
    if(event.keyCode == 13)
    {
      $('.ui-dialog-buttonset', login_dialog.parent()).find('button:contains(Login)').trigger('click');
    }
  });

  $("#parameter-image-plus-layout").layout(
  {
    north:
    {
      size: 28,
      resizable: false,
    },
    center:
    {
      // resizeWhileDragging: false,
      // onresize: function() {
      //   $("#scatterplot").scatterplot("option", {
      //     width: $("#scatterplot-pane").width(),
      //     height: $("#scatterplot-pane").height()
      //   });
      // },
    },
    west:
    {
      size: $("#parameter-image-plus-layout").width() / 2,
      resizeWhileDragging : false,
      onresize: function()
      {
        $("#dendrogram-viewer").dendrogram("resize_canvas");
      }
    },
    south:
    {
      size: $("#parameter-image-plus-layout").height() / 4,
      resizeWhileDragging: false,
      onresize: function()
      {
        $("#table").css("height", $("#table-pane").height());
        $("#table").table("resize_canvas");
      }
    },
  });

  $("#model-pane").layout(
  {
    center:
    {
      resizeWhileDragging: false,
      onresize: function() {
        $("#scatterplot").scatterplot("option", {
          width: $("#scatterplot-pane").width(),
          height: $("#scatterplot-pane").height()
        });
      },
    }
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  // Load the model
  //////////////////////////////////////////////////////////////////////////////////////////

  $.ajax(
  {
    type : "GET",
    url : server_root + "models/" + model_id,
    success : function(result)
    {
      model = result;
      bookmarker = bookmark_manager.create(model.project, model._id);
      input_columns = model["artifact:input-columns"];
      output_columns = model["artifact:output-columns"];
      image_columns = model["artifact:image-columns"];
      rating_columns = model["artifact:rating-columns"] == undefined ? [] : model["artifact:rating-columns"];
      category_columns = model["artifact:category-columns"] == undefined ? [] : model["artifact:category-columns"];
      default_image = model["artifact:default-image"];

      if (default_image === null || default_image === undefined)
        default_image = 0;

      model_loaded();
    },
    error: function(request, status, reason_phrase)
    {
      window.alert("Error retrieving model: " + reason_phrase);
    }
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  // Once the model has been loaded, retrieve metadata / bookmarked state
  //////////////////////////////////////////////////////////////////////////////////////////

  var show_checkjob = function() {
    var jc = $('#parameter-image-plus-layout').children()[0];
    var $jc = $(jc);
    $jc.detach();

    $($('#parameter-image-plus-layout').children()).remove();
    $('#parameter-image-plus-layout').append($jc);

    var vm = ko.dataFor($('.slycat-job-checker')[0]);
    vm.set_jid(model['artifact:jid']);
  };

  function model_loaded()
  {
    // If the model isn't ready or failed, we're done.
    if(model["state"] == "waiting" || model["state"] == "running") {
      show_checkjob();
      return;
    }
    if(model["state"] == "closed" && model["result"] === null)
      return;
    if(model["result"] == "failed")
      return;

    // Display progress as the load happens ...
    $(".load-status").text("Loading data.");

    // Load list of clusters.
    $.ajax({
      url : server_root + "models/" + model_id + "/files/clusters",
      contentType : "application/json",
      success: function(result) {
        clusters = result;
        clusters_data = new Array(clusters.length);
        retrieve_current_cluster();
        setup_controls();
        setup_dendrogram();
      },
      error: artifact_missing
    });

    // Load data table metadata.
    $.ajax({
      url : server_root + "models/" + model_id + "/tables/data-table/arrays/0/metadata?index=Index",
      contentType : "application/json",
      success: function(metadata) {
        table_metadata = metadata;
        table_statistics = new Array(metadata["column-count"]);
        table_statistics[metadata["column-count"]-1] = {"max": metadata["row-count"]-1, "min": 0};
        load_table_statistics(d3.range(metadata["column-count"]-1), metadata_loaded);
      },
      error: artifact_missing
    });

    // Retrieve bookmarked state information ...
    bookmarker.getState(function(state)
    {
      bookmark = state;
      cluster_index = bookmark["cluster-index"] !== undefined ? bookmark["cluster-index"] : 0;
      retrieve_current_cluster();
      setup_controls();
      setup_colorswitcher();
      metadata_loaded();
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

  function build_dendrogram_node_options(cluster_index)
  {
    var dendrogram_options = {
      cluster: cluster_index,
    };

    dendrogram_options.collapsed_nodes = bookmark[cluster_index  + "-collapsed-nodes"];
    dendrogram_options.expanded_nodes = bookmark[cluster_index  + "-expanded-nodes"];
    dendrogram_options.selected_nodes = bookmark[cluster_index  + "-selected-nodes"];
    dendrogram_options.highlight = bookmark[cluster_index  + "-selected-row-simulations"];

    return dendrogram_options;
  }

  function retrieve_current_cluster()
  {
    if(!cluster_ready && cluster_index != null && clusters != null)
    {
      cluster_ready = true;

      $.ajax(
      {
        url : server_root + "models/" + model_id + "/files/cluster-" + clusters[cluster_index],
        contentType : "application/json",
        success : function(cluster_data)
        {
          clusters_data[cluster_index] = cluster_data;
          setup_dendrogram();
        },
        error: artifact_missing
      });
    }
  }

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
    setup_table();

    if(!indices && table_metadata)
    {
      var count = table_metadata["row-count"];
      indices = new Int32Array(count);
      for(var i = 0; i != count; ++i)
        indices[i] = i;
    }

    setup_controls();

    if(table_metadata && bookmark)
    {
      // Choose some columns for the X and Y axes.
      var numeric_variables = [];
      for(var i = 0; i < table_metadata["column-count"]-1; i++)
      {
        // Only use non-string columns that are not used for ratings or categories
        if(table_metadata["column-types"][i] != 'string' && rating_columns.indexOf(i) == -1 && category_columns.indexOf(i) == -1)
          numeric_variables.push(i);
      }

      x_index = numeric_variables[0];
      y_index = numeric_variables[1 % numeric_variables.length];
      if("x-selection" in bookmark)
        x_index = Number(bookmark["x-selection"]);
      if("y-selection" in bookmark)
        y_index = Number(bookmark["y-selection"]);
      auto_scale = true;
      if("auto-scale" in bookmark)
      {
        auto_scale = bookmark["auto-scale"];
      }

      // Set state of selected and hidden simulations
      selected_simulations = [];
      if("simulation-selection" in bookmark)
        selected_simulations = bookmark["simulation-selection"];
      hidden_simulations = [];
      if("hidden-simulations" in bookmark)
        hidden_simulations = bookmark["hidden-simulations"];

      chunker.get_model_array_attribute({
        server_root : server_root,
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
          setup_scatterplot();
          setup_table();
        },
        error : artifact_missing
      });

      chunker.get_model_array_attribute({
        server_root : server_root,
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
          setup_scatterplot();
          setup_table();
        },
        error : artifact_missing
      });

      v_index = table_metadata["column-count"] - 1;
      if("variable-selection" in bookmark)
        v_index = Number(bookmark["variable-selection"]);

      if(v_index == table_metadata["column-count"] - 1)
      {
        var count = table_metadata["row-count"];
        v = new Float64Array(count);
        for(var i = 0; i != count; ++i)
          v[i] = i;
        update_current_colorscale();
        setup_scatterplot();
        setup_table();
        setup_dendrogram();
      }
      else
      {
        chunker.get_model_array_attribute({
          server_root : server_root,
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
            update_current_colorscale();
            setup_scatterplot();
            setup_table();
            setup_dendrogram();
          },
          error : artifact_missing
        });
      }

      images_index = image_columns[default_image];
      if("images-selection" in bookmark)
        images_index = bookmark["images-selection"];
      setup_table();
      if(image_columns.length > 0)
      {
        $.ajax(
        {
          type : "GET",
          url : server_root + "models/" + model_id + "/arraysets/data-table/data?hyperchunks=0/" + images_index + "/0:" + table_metadata["row-count"],
          success : function(result)
          {
            images = result[0];
            setup_scatterplot();
            setup_dendrogram();
            //setup_table();
          },
          error: artifact_missing
        });
      }
      else
      {
        images = undefined;
        setup_scatterplot();
        setup_dendrogram();
      }
      setup_controls();
    }
  }

  function setup_dendrogram()
  {
    if(!dendrogram_ready && bookmark && clusters != null && cluster_index != null && clusters_data != null
      && clusters_data[cluster_index] !== undefined && colorscale && v && selected_simulations != null
      && images !== null
      )
    {
      dendrogram_ready = true;
      console.log("dendrogram ready to be initiated.");

      $("#dendrogram-pane .load-status").css("display", "none");

      $("#dendrogram-leaf-backdrop").css({
        "background-color" : $("#color-switcher").colorswitcher("get_background").toString(),
      });

      var dendrogram_options = build_dendrogram_node_options(cluster_index);
      dendrogram_options.clusters = clusters;
      dendrogram_options.cluster_data = clusters_data[cluster_index];
      dendrogram_options.colorscale = colorscale;
      dendrogram_options.color_array = v;
      dendrogram_options.images = images;
      dendrogram_options.cache_references = cache_references;
      dendrogram_options.login_dialog = login_dialog;

      if(bookmark["sort-variable"] != undefined) {
        dendrogram_options.dendrogram_sort_order = false;
      }

      dendrogram_options["highlight"] = selected_simulations;

      $("#dendrogram-viewer").dendrogram(dendrogram_options);

      // Log and bookmark changes to the node selection ...
      $("#dendrogram-viewer").bind("node-selection-changed", function(event, parameters)
      {
        selected_node_changed(parameters);
      });

      // Changing the selected dendrogram node updates the waveform plot ...
      $("#dendrogram-viewer").bind("node-selection-changed", function(event, parameters)
      {
        // Only want to update the waveform plot if the user changed the selected node. It's automatically set at dendrogram creation time, and we want to avoid updating the waveform plot at that time.
        if(parameters.skip_bookmarking != true) {
          // $("#waveform-viewer").waveformplot("option", "selection", getWaveformIndexes(parameters.selection));

          // if(bookmark[$("#cluster-viewer").cluster("option", "cluster") + "-selected-row-simulations"] !== undefined)
          //   $("#waveform-viewer").waveformplot("option", "highlight", bookmark[$("#cluster-viewer").cluster("option", "cluster") + "-selected-row-simulations"]);

          var visible_simulations = getNodeIndexes(parameters.selection, "image-index");

          while(hidden_simulations.length > 0) {
            hidden_simulations.pop();
          }

          for(var i = 0; i < indices.length; i++)
          {
            var index = indices[i];
            if(visible_simulations.indexOf(index) < 0)
            {
              hidden_simulations.push(index);
            }
          }
          update_widgets_when_hidden_simulations_change(true);
        }
      });

      // Bookmark changes to expanded and collapsed nodes ...
      $("#dendrogram-viewer").bind("expanded-collapsed-nodes-changed", function(event, nodes)
      {
        expanded_collapsed_nodes_changed(nodes);
      });

      // Log changes to node toggle ...
      $("#dendrogram-viewer").bind("node-toggled", function(event, node)
      {
        node_toggled(node);
      });

      // Changing the scatterplot selection updates the table row selection and controls ..
      $("#dendrogram-viewer").bind("selection-changed", function(event, selection)
      {
        $("#table").table("option", "row-selection", selection);
        $("#controls").controls("option", "selection", selection);
        $("#scatterplot").scatterplot("option", "selection", selection);
        selected_simulations_changed(selection);
      });
    }
  }

  function setup_table()
  {
    if( !table_ready && table_metadata && (table_statistics.length == table_metadata["column-count"]) && colorscale
      && bookmark && (x_index != null) && (y_index != null) && (images_index !== null)
      && (selected_simulations != null) && (hidden_simulations != null) )
    {
      table_ready = true;

      $("#table-pane .load-status").css("display", "none");

      var other_columns = [];
      for(var i = 0; i != table_metadata["column-count"] - 1; ++i)
      {
        if($.inArray(i, input_columns) == -1 && $.inArray(i, output_columns) == -1
          && $.inArray(i, rating_columns) == -1 && $.inArray(i, category_columns) == -1)
          other_columns.push(i);
      }

      var table_options =
      {
        "server-root" : server_root,
        mid : model_id,
        aid : "data-table",
        metadata : table_metadata,
        statistics : table_statistics,
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
        $("#scatterplot").scatterplot("option", "selection",  temp);
        $("#controls").controls("option", "selection",  temp);
        $("#dendrogram-viewer").dendrogram("option", "highlight", temp);
      });

      // Changing the scatterplot selection updates the table row selection and controls ..
      $("#scatterplot").bind("selection-changed", function(event, selection)
      {
        $("#table").table("option", "row-selection", selection);
        $("#controls").controls("option", "selection", selection);
        $("#dendrogram-viewer").dendrogram("option", "highlight", selection);
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
      )
    {
      scatterplot_ready = true;

      $("#scatterplot-pane .load-status").css("display", "none");

      var colormap = bookmark["colormap"] !== undefined ? bookmark["colormap"] : "night";

      $("#scatterplot-pane").css("background", $("#color-switcher").colorswitcher("get_background", colormap).toString());

      var open_images = [];
      if("open-images-selection" in bookmark)
      {
        open_images = bookmark["open-images-selection"];
      }

      $("#scatterplot").scatterplot({
        indices: indices,
        x_label: table_metadata["column-names"][x_index],
        y_label: table_metadata["column-names"][y_index],
        v_label: table_metadata["column-names"][v_index],
        x: x,
        y: y,
        v: v,
        x_string: table_metadata["column-types"][x_index]=="string",
        y_string: table_metadata["column-types"][y_index]=="string",
        v_string: table_metadata["column-types"][v_index]=="string",
        images: images,
        width: $("#scatterplot-pane").width(),
        height: $("#scatterplot-pane").height(),
        colorscale: colorscale,
        selection: selected_simulations,
        open_images: open_images,
        gradient: $("#color-switcher").colorswitcher("get_gradient_data", colormap),
        hidden_simulations: hidden_simulations,
        "auto-scale" : auto_scale,
        cache_references : cache_references,
        login_dialog : login_dialog,
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

      // Log changes to open images ...
      $("#scatterplot").bind("open-images-changed", function(event, selection)
      {
        open_images_changed(selection);
      });
    }
  }

  function setup_controls()
  {
    if( !controls_ready && table_metadata && (image_columns !== null) && (rating_columns != null)
      && (category_columns != null) && (x_index != null) && (y_index != null) && auto_scale != null
      && (images_index !== null) && (selected_simulations != null) && (hidden_simulations != null)
      && indices
      // && (cluster_index != null) && (clusters != null)
      )
    {
      controls_ready = true;
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
        "server-root" : server_root,
        mid : model_id,
        model_name: model_name,
        aid : "data-table",
        metadata: table_metadata,
        // clusters : clusters,
        x_variables: axes_variables,
        y_variables: axes_variables,
        image_variables: image_columns,
        color_variables: color_variables,
        rating_variables : rating_columns,
        category_variables : category_columns,
        selection : selected_simulations,
        // cluster_index : cluster_index,
        "x-variable" : x_index,
        "y-variable" : y_index,
        "image-variable" : images_index,
        "color-variable" : color_variable,
        "auto-scale" : auto_scale,
        hidden_simulations : hidden_simulations,
        indices : indices,
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

      // Changing the value of a variable updates the database, table, and scatterplot ...
      $("#controls").bind("set-value", function(event, args)
      {
        writeData(args.selection, args.variable, args.value);
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
            url : server_root + "models/" + model_id + "/arraysets/data-table/data",
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
                $("#table").table("option", "statistics", table_statistics);
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

      // Log changes to hidden selection ...
      $("#controls").bind("hide-selection", function(event, selection)
      {
        for(var i=0; i<selected_simulations.length; i++){
          if($.inArray(selected_simulations[i], hidden_simulations) == -1) {
            hidden_simulations.push(selected_simulations[i]);
          }
        }
        update_widgets_when_hidden_simulations_change();
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

      // Log changes to hidden selection ...
      $("#controls").bind("show-all", function(event, selection)
      {
        while(hidden_simulations.length > 0) {
          hidden_simulations.pop();
        }
        update_widgets_when_hidden_simulations_change();
      });
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////
  // Event handlers.
  //////////////////////////////////////////////////////////////////////////////////////////

  function selected_node_changed(parameters)
  {
    if(parameters.node != null && parameters.node["node-index"] != null)
    {
      $.ajax(
      {
        type : "POST",
        url : server_root + "events/models/" + model_id + "/select/node/" + parameters.node["node-index"]
      });
    }
    if(parameters.skip_bookmarking != true)
    {
      var state = {};
      state[ cluster_index + "-selected-nodes" ] = getNodeIndexes(parameters.selection, "node-index");
      state[ cluster_index + "-selected-image-indexes" ] = getNodeIndexes(parameters.selection, "image-index");
      bookmarker.updateState(state);
    }
  }

  function getNodeIndexes(nodes, indexName)
  {
    var node_indexes = [];
    var node_index = null;

    for(var i=0; i<nodes.length; i++)
    {
      node_index = nodes[i][indexName];
      if(node_index != null)
        node_indexes.push(node_index);
    }

    return node_indexes;
  }

  function expanded_collapsed_nodes_changed(nodes){
    var cluster_state = {};
    cluster_state[ cluster_index + "-expanded-nodes"] = nodes.expanded;
    cluster_state[ cluster_index + "-collapsed-nodes"] = nodes.collapsed;
    bookmarker.updateState(cluster_state);
  }

  function node_toggled(node){
    $.ajax(
    {
      type : "POST",
      url : server_root + "events/models/" + model_id + "/toggle/node/" + node["node-index"],
    });
  }

  function selected_colormap_changed(colormap)
  {
    update_current_colorscale();

    // Changing the color map updates the dendrogram with a new color scale and new backdrop ...
    $("#dendrogram-viewer").dendrogram("option", "colorscale", colorscale);
    $("#dendrogram-leaf-backdrop").css({
      "background-color" : $("#color-switcher").colorswitcher("get_background").toString(),
    });

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
      url : server_root + "events/models/" + model_id + "/select/colormap/" + colormap
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
      url : server_root + "events/models/" + model_id + "/select/variable/" + variable
    });

    bookmarker.updateState({"variable-selection" : variable});
  }

  function handle_image_variable_change(variable)
  {
    images_index = Number(variable);

    // Determine cluster variable from image variable
    // TODO this needs improvement because we are not guaranteed unique variable names. List of clusters should provide indexes on the variables, instead of just names.
    cluster_index = clusters.indexOf( table_metadata["column-names"][images_index] );

    // Get entire data column for current image variable and pass it to scatterplot and dendrogram
    $.ajax(
    {
      type : "GET",
      url : server_root + "models/" + model_id + "/arraysets/data-table/data?hyperchunks=0/" + images_index + "/0:" + table_metadata["row-count"],
      success : function(result)
      {
        images = result[0];
        // Passing new images to both scatterplot and dendrogram
        $("#scatterplot").scatterplot("option", "images", images);
        $("#dendrogram-viewer").dendrogram("option", "images", images);
        // Updating dendrogram with new cluster data, which will trigger refresh and thus render new images too
        update_dendrogram(cluster_index);
      },
      error: artifact_missing
    });

    // Log changes to and bookmark the images variable ...
    images_selection_changed(images_index);
    // Log changes to and bookmark the cluster variable ...
    cluster_selection_changed(cluster_index);
  }

  function images_selection_changed(variable)
  {
    $.ajax(
    {
      type : "POST",
      url : server_root + "events/models/" + model_id + "/select/images/" + variable
    });
    bookmarker.updateState( {"images-selection" : variable} );
  }

  function update_v(variable)
  {
    chunker.get_model_array_attribute({
      server_root : server_root,
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
        update_widgets_after_color_variable_change();
      },
      error : artifact_missing
    });
  }

  function update_widgets_after_color_variable_change()
  {
    update_current_colorscale();
    $("#table").table("option", "colorscale", colorscale);
    $("#scatterplot").scatterplot("update_color_scale_and_v", {
      v : v,
      v_string : table_metadata["column-types"][v_index]=="string",
      colorscale : colorscale
    });
    $("#scatterplot").scatterplot("option", "v_label", table_metadata["column-names"][v_index]);
    $("#dendrogram-viewer").dendrogram("option", "color-options", {color_array : v, colorscale : colorscale});
  }

  function update_widgets_when_hidden_simulations_change(skip_dendrogram_update)
  {
    hidden_simulations_changed();
    if(auto_scale)
    {
      update_current_colorscale();
      $("#table").table("option", {hidden_simulations : hidden_simulations, colorscale : colorscale});
      // TODO this will result in 2 updates to canvas, one to redraw points according to hidden simulations and another to color them according to new colorscale. Need to combine this to a single update when converting to canvas.
      $("#scatterplot").scatterplot("option", {hidden_simulations : hidden_simulations, colorscale : colorscale});
      if(!skip_dendrogram_update)
      {
        $("#dendrogram-viewer").dendrogram("option", {hidden_simulations : hidden_simulations, colorscale : colorscale})
      }
    }
    else
    {
      $("#table").table("option", "hidden_simulations", hidden_simulations);
      $("#scatterplot").scatterplot("option", "hidden_simulations", hidden_simulations);
      if(!skip_dendrogram_update)
      {
        $("#dendrogram-viewer").dendrogram("option", "hidden_simulations", hidden_simulations)
      }
    }
    $("#controls").controls("option", "hidden_simulations", hidden_simulations);
  }

  function update_current_colorscale()
  {
    // Check if numeric or string variable
    var v_type = table_metadata["column-types"][v_index];
    if(auto_scale)
      filtered_v = filterValues(v);
    else
      filtered_v = v;

    if(v_type != "string")
    {
      colorscale = $("#color-switcher").colorswitcher("get_color_scale", undefined, d3.min(filtered_v), d3.max(filtered_v));
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
      url : server_root + "events/models/" + model_id + "/select/sort-order/" + variable + "/" + order
    });
    bookmarker.updateState( {"sort-variable" : variable, "sort-order" : order} );
  }

  function selected_simulations_changed(selection)
  {
    // Logging every selected item is too slow, so just log the count instead.
    $.ajax(
    {
      type : "POST",
      url : server_root + "events/models/" + model_id + "/select/simulation/count/" + selection.length
    });
    bookmarker.updateState( {"simulation-selection" : selection} );
    selected_simulations = selection;
  }

  function cluster_selection_changed(variable)
  {
    $.ajax(
    {
      type : "POST",
      url : server_root + "events/models/" + model_id + "/select/cluster/" + variable
    });
    bookmarker.updateState( {"cluster-index" : variable} );
  }

  function update_dendrogram(cluster_index)
  {
    // Retrieve cluster data if it's not already in the cache
    if(clusters_data[cluster_index] === undefined) {
       $.ajax(
      {
        url : server_root + "models/" + model_id + "/files/cluster-" + clusters[cluster_index],
        contentType : "application/json",
        success : function(cluster_data)
        {
          clusters_data[cluster_index] = cluster_data;
          var dendrogram_options = build_dendrogram_node_options(cluster_index);
          dendrogram_options.cluster_data = clusters_data[cluster_index];
          $("#dendrogram-viewer").dendrogram("option", dendrogram_options);
        },
        error: artifact_missing
      });
    } else {
      var dendrogram_options = build_dendrogram_node_options(cluster_index);
      dendrogram_options.cluster_data = clusters_data[cluster_index];
      $("#dendrogram-viewer").dendrogram("option", dendrogram_options);
    }
  }

  function x_selection_changed(variable)
  {
    $.ajax(
    {
      type : "POST",
      url : server_root + "events/models/" + model_id + "/select/x/" + variable
    });
    bookmarker.updateState( {"x-selection" : variable} );
    x_index = Number(variable);
  }

  function y_selection_changed(variable)
  {
    $.ajax(
    {
      type : "POST",
      url : server_root + "events/models/" + model_id + "/select/y/" + variable
    });
    bookmarker.updateState( {"y-selection" : variable} );
    y_index = Number(variable);
  }

  function auto_scale_option_changed(auto_scale_value)
  {
    auto_scale = auto_scale_value;
    if(hidden_simulations.length > 0)
    {
      update_current_colorscale();
      $("#dendrogram-viewer").dendrogram("option", "colorscale", colorscale);
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
      url : server_root + "events/models/" + model_id + "/auto-scale/" + auto_scale
    });
    bookmarker.updateState( {"auto-scale" : auto_scale} );
  }

  function open_images_changed(selection)
  {
    // Logging every open image is too slow, so just log the count instead.
    $.ajax(
    {
      type : "POST",
      url : server_root + "events/models/" + model_id + "/select/openimages/count/" + selection.length
    });
    bookmarker.updateState( {"open-images-selection" : selection} );
  }

  function hidden_simulations_changed()
  {
    // Logging every hidden simulation is too slow, so just log the count instead.
    $.ajax(
    {
      type : "POST",
      url : server_root + "events/models/" + model_id + "/hidden/count/" + hidden_simulations.length
    });
    bookmarker.updateState( {"hidden-simulations" : hidden_simulations} );
  }

  function update_scatterplot_x(variable)
  {
    chunker.get_model_array_attribute({
      server_root : server_root,
      mid : model_id,
      aid : "data-table",
      array : 0,
      attribute : variable,
      success : function(result)
      {
        $("#scatterplot").scatterplot("option", {
          x_string: table_metadata["column-types"][variable]=="string",
          x: table_metadata["column-types"][variable]=="string" ? result[0] : result,
          x_label:table_metadata["column-names"][variable]
        });
      },
      error : artifact_missing
    });
  }

  function update_scatterplot_y(variable)
  {
    chunker.get_model_array_attribute({
      server_root : server_root,
      mid : model_id,
      aid : "data-table",
      array : 0,
      attribute : variable,
      success : function(result)
      {
        $("#scatterplot").scatterplot("option", {
          y_string: table_metadata["column-types"][variable]=="string",
          y: table_metadata["column-types"][variable]=="string" ? result[0] : result,
          y_label:table_metadata["column-names"][variable]
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
        var statistics = metadata.statistics;
        for(var i = 0; i != statistics.length; ++i)
          table_statistics[statistics[i].attribute] = {min: statistics[i].min, max: statistics[i].max};
        callback();
      }
    });
  }

});

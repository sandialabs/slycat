/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

define("slycat-timeseries-model", ["slycat-server-root", 'slycat-web-client', "slycat-bookmark-manager", "slycat-dialog", "knockout", "URI", "slycat-timeseries-controls", "domReady!"], function(server_root, client, bookmark_manager, dialog, ko, URI)
{
  ko.applyBindings({}, document.getElementsByClassName('slycat-content')[0]);

//////////////////////////////////////////////////////////////////////////////////////////
// Setup global variables.
//////////////////////////////////////////////////////////////////////////////////////////

var model = { _id: URI(window.location).segment(-1) };
var cluster_bin_count = null;
var cluster_bin_type = null;
var cluster_type = null;

var bookmarker = null;
var bookmark = null;

var clusters = null; // This is just the list of cluster names
var clusters_data = null; // This holds data for each cluster
var waveforms_data = null; // This holds the waveforms for each cluster
var waveforms_metadata = null; // This holds the waveforms metadata for each cluster
var cluster_index = null;  // This holds the index of the currently selected cluster
var table_metadata = null;

var color_array = null; // This holds the sorted array of values for the color scale
var colorscale = null; // This holds the current color scale
var colormap = null; // This hold the current color map
var color_variables = null; // This holds the indexes of all the color variables
var uniqueValues = null; // This holds the column's unique values for last selected string column

var selected_column = null; // This holds the currently selected column
var selected_column_type = null;  // This holds the data type of the currently selected column
var selected_column_min = null; // This holds the min value of the currently selected column
var selected_column_max = null; // This holds the max value of the currently selected column
var selected_simulations = null; // This hold the currently selected rows

var sort_variable = null; // This holds the sorted variable
var sort_order = null; // This holds the sort order

var collapsed_nodes = null; // This holds the collapsed nodes
var expanded_nodes = null; // This holds the expanded nodes
var selected_nodes = null; // This holds the selected nodes

var controls_ready = false;
var colorswitcher_ready = false;
var dendrogram_ready = false;
var waveformplot_ready = false;
var table_ready = false;
var legend_ready = false;

var selected_waveform_indexes = null;

var image_columns = null; // This holds the media columns

//////////////////////////////////////////////////////////////////////////////////////////
// Setup page layout and forms.
//////////////////////////////////////////////////////////////////////////////////////////

// Setup the resizing layout ...
var bodyLayout = $("#timeseries-model").layout({
  applyDefaultStyles: false,
  north :
  {
    size: 28,
    resizable: false,
    resizeWhileDragging : false,
  },
  west :
  {
    size : $("#timeseries-model").width() / 2,
    resizeWhileDragging : false,
    onresize: function()
    {
      $("#dendrogram-viewer").dendrogram("resize_canvas");
    },
  },
  center :
  {
    resizeWhileDragging: false,
    onresize: function()
    {
      $("#waveform-viewer").waveformplot("resize_canvas");
    },
  },
  east:
  {
    size: 130,
    resizeWhileDragging: false,
    onresize: function() { $("#legend").legend("option", {width: $("#legend-pane").width(), height: $("#legend-pane").height()}); },
  },
  south:
  {
    size: $("#timeseries-model").height() / 3,
    resizeWhileDragging : false,
    onresize: function()
    {
      $("#table").table("resize_canvas");
    },
  },
});

//////////////////////////////////////////////////////////////////////////////////////////
// Get the model
//////////////////////////////////////////////////////////////////////////////////////////
function doPoll() {
  $.ajax(
  {
    type : "GET",
    url : server_root + "models/" + model._id,
    success : function(result)
    {
      model = result;
      bookmarker = bookmark_manager.create(model.project, model._id);
      cluster_bin_count = model["artifact:cluster-bin-count"];
      cluster_bin_type = model["artifact:cluster-bin-type"];
      cluster_type = model["artifact:cluster-type"];
      // If the model isn't ready or failed, we're done.
      if(model["state"] === "waiting" || model["state"] === "running") {
        show_checkjob();
        setTimeout(doPoll, 15000);
        return;
      }

      // Check if model has the image-columns artifact and create one if it doesn't
      if(!model.hasOwnProperty("artifact:image-columns"))
      {
        // Find media columns
        console.log("This model has no artifact:image-columns");
        client.get_model_command({
          mid: model._id,
          type: "timeseries",
          command: "media-columns",
          success: function(media_columns) {
            // console.log("here are the media_columns: " + media_columns);
            client.put_model_parameter({
              mid: model._id,
              aid: "image-columns",
              value: media_columns,
              input: true,
              success: function() {
                // console.log("successfully saved image-columns");
                image_columns = media_columns;
              }
            });
          },
          error: function(error) {
            console.log("error getting model command");
          }
        });
      }
      else
      {
        image_columns = model["artifact:image-columns"];
      }

      $('.slycat-job-checker').remove();

      if(model["state"] == "closed" && model["result"] === null)
        return;
      if(model["result"] == "failed")
        return;
      setup_page();
    },
    error: function(request, status, reason_phrase)
    {
      window.alert("Error retrieving model: " + reason_phrase);
    }
  });
}
doPoll();

//////////////////////////////////////////////////////////////////////////////////////////
// If the model is ready, start retrieving data, including bookmarked state.
//////////////////////////////////////////////////////////////////////////////////////////

function s_to_a(s) {
  if (Array.isArray(s))
    return s;
  else
    return JSON.parse(s);
}

function s_to_o(s) {
  if (typeof(s) === "object")
    return s;
  else
    return JSON.parse(s);
}

var show_checkjob = function() {
  var jc = $('#timeseries-model').children()[0];
  var $jc = $(jc);
  $jc.detach();

  $($('#timeseries-model').children()).remove();
  $('#timeseries-model').append($jc);

  var vm = ko.dataFor($('.slycat-job-checker')[0]);
  vm.set_jid(model['artifact:jid']);
};

function setup_page()
{

  // Display progress as the load happens ...
  $(".load-status").text("Loading data.");

  // Load list of clusters.
  $.ajax({
    url : server_root + "models/" + model._id + "/files/clusters",
    contentType : "application/json",
    success: function(result)
    {
      clusters = result;
      clusters_data = new Array(clusters.length);
      waveforms_data = new Array(clusters.length);
      waveforms_metadata = new Array(clusters.length);
      setup_widgets();
      retrieve_bookmarked_state();
    },
    error: artifact_missing
  });

  // Load data table metadata.
  $.ajax({
    url : server_root + "models/" + model._id + "/tables/inputs/arrays/0/metadata?index=Index",
    contentType : "application/json",
    success: function(metadata)
    {
      table_metadata = metadata;
      setup_widgets();
      setup_colordata();
      retrieve_bookmarked_state();
    },
    error: artifact_missing
  });

  // Retrieve bookmarked state information ...
  function retrieve_bookmarked_state(){
    if(table_metadata !== null && clusters !== null)
    {
      bookmarker.getState(function(state)
      {
        bookmark = state;

        // Set state of selected cluster
        cluster_index = bookmark["cluster-index"] !== undefined ? bookmark["cluster-index"] : 0;

        // Set state of selected simulations
        selected_simulations = [];
        if("simulation-selection" in bookmark)
          selected_simulations = bookmark["simulation-selection"];
        else if("cluster-index" in bookmark && (bookmark["cluster-index"] + "-selected-row-simulations") in bookmark)
        {
          selected_simulations = bookmark[bookmark["cluster-index"] + "-selected-row-simulations"];
        }

        // Set state of selected column
        selected_column = [];
        selected_column_type = [];
        selected_column_min = [];
        selected_column_max = [];
        for(var i=0; i < clusters.length; i++)
        {
          selected_column[i] = bookmark[i + "-column-index"] !== undefined ? bookmark[i + "-column-index"] : table_metadata["column-count"]-1;
          selected_column_type[i] = table_metadata["column-types"][selected_column[i]];
          selected_column_min[i] = table_metadata["column-min"][selected_column[i]];
          selected_column_max[i] = table_metadata["column-max"][selected_column[i]];
        }

        // Set state of color variable
        color_variables = [];
        for(var i = 0; i < table_metadata["column-count"]; i++)
        {
          if(image_columns != undefined && image_columns.indexOf(i) == -1)
            color_variables.push(i);
        }
        // Move index column to top
        color_variables.unshift(color_variables.pop());

        // Set state of selected waveform indexes
        selected_waveform_indexes = [];
        for(var i=0; i < clusters.length; i++)
        {
          selected_waveform_indexes[i] = bookmark[i + "-selected-waveform-indexes"] !== undefined ? bookmark[i + "-selected-waveform-indexes"] : null;
        }

        // Set state of colormap
        colormap = bookmark["colormap"] !== undefined ? bookmark["colormap"] : "night";

        // Set sort variable and order
        sort_variable = bookmark["sort-variable"] != undefined ? bookmark["sort-variable"] : undefined;
        sort_order = bookmark["sort-order"] != undefined ? bookmark["sort-order"] : undefined;

        // Set collapsed, expanded, and selected nodes
        collapsed_nodes = [];
        expanded_nodes = [];
        selected_nodes = [];
        for(var i=0; i < clusters.length; i++)
        {
          collapsed_nodes[i] = bookmark[i + "-collapsed-nodes"];
          expanded_nodes[i] = bookmark[i + "-expanded-nodes"];
          selected_nodes[i] = bookmark[i + "-selected-nodes"];
        }

        setup_widgets();
        setup_colordata();
      });
    }
  }
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

function setup_colordata()
{
  if(bookmark && table_metadata && selected_column != null && cluster_index !== null)
  {
    retrieve_sorted_column({
      column : selected_column[cluster_index],
      callback : function(array){
        setup_widgets();
      },
    });
  }
}

// Retrieve a column of data, sorted by the index. Saves it in color_array and executes callback, passing the column data array to it.
function retrieve_sorted_column(parameters)
{
  //Grabbing all values for current column
  var lastColumn = table_metadata["column-count"]-1;
  var firstRow = table_metadata["column-min"][lastColumn];
  var lastRow  = table_metadata["column-max"][lastColumn]+1;

  $.ajax({
    url : server_root + "models/" + model._id + "/tables/inputs/arrays/0/chunk?rows=" + firstRow + "-" + lastRow + "&columns=" + parameters.column + "&index=Index&sort=" + lastColumn + ":ascending",
    async: true,
    callback: parameters.callback,
    success: function(resp){
      color_array = resp["data"][0];
      this.callback(resp["data"][0]);
    },
    error: function(request, status, reason_phrase){
      window.alert("Error getting color coding values from table-chunker worker: " + reason_phrase);
    }
  });
}

function setup_widgets()
{
  // Setup waveforms ...
  if(
      bookmark && s_to_a(clusters) && cluster_index !== null && waveforms_data[cluster_index] === undefined 
      && waveforms_metadata[cluster_index] === undefined
    )
  {
    waveforms_data[cluster_index] = null;
    waveforms_metadata[cluster_index] = null;
    
    // Load the waveforms.
    get_model_arrayset({
      server_root : server_root + "",
      mid : model._id,
      aid : "preview-" + s_to_a(clusters)[cluster_index],
      success : function(result, metadata)
      {
        waveforms_data[cluster_index] = result;
        waveforms_metadata[cluster_index] = metadata;
        setup_widgets();
      },
      error : artifact_missing
    });
  }

  // Setup clusters data ...
  if(bookmark && s_to_a(clusters) && clusters_data[cluster_index] === undefined)
  { 
    clusters_data[cluster_index] = null;
    $.ajax(
    {
      url : server_root + "models/" + model._id + "/files/cluster-" + s_to_a(clusters)[cluster_index],
      contentType : "application/json",
      success : function(cluster_data)
      {
        clusters_data[cluster_index] = cluster_data;
        setup_widgets();
      },
      error: artifact_missing
    });
  }

  // Setup controls ...
  if(
      !controls_ready && bookmark && s_to_a(clusters) && (cluster_index !== null)
      && (selected_simulations != null) && table_metadata && color_variables !== null
      && selected_waveform_indexes !== null && selected_column !== null && cluster_index !== null
    )
  {
    controls_ready = true;

    $("#cluster-pane .load-status").css("display", "none");

    var controls_options =
    {
      mid : model._id,
      model_name: model_name,
      aid : "inputs",
      metadata: table_metadata,
      highlight: selected_simulations,
      clusters: s_to_a(clusters),
      cluster: cluster_index,
      color_variables: color_variables,
      "color-variable" : selected_column[cluster_index],
      "selection" : selected_waveform_indexes[parseInt(cluster_index, 10)],
      image_columns : image_columns,
    };

    $("#controls").controls(controls_options);

    // Changes to the cluster selection ...
    $("#controls").bind("cluster-changed", function(event, cluster)
    {
      // Handle changes to the cluster selection ...
      selected_cluster_changed(cluster);
    });

    // Changes to the waveform color ...
    $("#controls").bind("color-selection-changed", function(event, variable)
    {
      variable = parseInt(variable);
      selected_variable_changed(variable);
      $("#table").table("option", "variable-selection", [selected_column[cluster_index]]);
    });
  }

  // Setup the color switcher ...
  if(!colorswitcher_ready && bookmark && colormap !== null)
  {
    colorswitcher_ready = true;
    $("#color-switcher").colorswitcher({colormap:colormap});

    update_current_colorscale(setup_widgets);

    $("#color-switcher").bind("colormap-changed", function(event, newColormap)
    {
      selected_colormap_changed(newColormap);
    });
  }

  // Setup the legend ...
  if( 
      !legend_ready && bookmark && table_metadata && cluster_index !== null && colormap !== null && selected_column !== null 
      && selected_column_type !== null && colorscale !== null
    )
  {
    legend_ready = true;

    $("#legend-pane .load-status").css("display", "none");

    $("#legend-pane").css("background", $("#color-switcher").colorswitcher("get_background", colormap).toString());

    $("#legend").legend({
      width: $("#legend-pane").width(),
      height: $("#legend-pane").height(),
      gradient: $("#color-switcher").colorswitcher("get_gradient_data", colormap),
      label: table_metadata["column-names"][selected_column[cluster_index]],
      min: table_metadata["column-min"][selected_column[cluster_index]],
      max: table_metadata["column-max"][selected_column[cluster_index]],
      v_type: selected_column_type[cluster_index],
      uniqueValues : uniqueValues,
    });
  }

  // Setup the waveform plot ...
  if(
      !waveformplot_ready && bookmark && (cluster_index !== null) && (waveforms_data !== null) && (waveforms_data[cluster_index] !== undefined && waveforms_data[cluster_index] !== null)
      && color_array !== null && colorscale !== null && table_metadata !== null && selected_simulations !== null && selected_waveform_indexes !== null
    )
  {
    waveformplot_ready = true;

    $("#waveform-pane .load-status").css("display", "none");

    $("#waveform-pane").css({
      "background-color" : $("#color-switcher").colorswitcher("get_background", colormap).toString(),
      });
    $("#waveform-viewer rect.selectionMask").css({
      "fill"             : $("#color-switcher").colorswitcher("get_background", colormap).toString(),
      "fill-opacity"     : $("#color-switcher").colorswitcher("get_opacity", colormap),
      });

    var waveformplot_options =
    {
      "server-root" : server_root,
      mid : model._id,
      waveforms: waveforms_data[cluster_index],
      color_scale: colorscale,
      color_array: color_array,
      highlight: selected_simulations,
      "selection" : selected_waveform_indexes[parseInt(cluster_index, 10)],
    };

    $("#waveform-viewer").waveformplot(waveformplot_options);

    // Changing the waveform selection ...
    $("#waveform-viewer").bind("waveform-selection-changed", function(event, waveform_indexes)
    {
      // Log changes to the waveform selection
      selected_simulations_changed(waveform_indexes);
      // Updates the dendrogram ...
      $("#dendrogram-viewer").dendrogram("option", "highlight", waveform_indexes);
      // Updates the controls ...
      $("#controls").controls("option", "highlight", waveform_indexes);
      // Updates the table row selection ...
      $("#table").table("option", "row-selection", waveform_indexes);
    });
  }

  // Setup the table ...
  if( 
      !table_ready && bookmark && table_metadata && cluster_index !== null && selected_simulations !== null && colormap !== null && colorscale !== null
      && selected_column !== null && selected_column_type !== null && selected_column_min !== null && selected_column_max !== null
      && sort_variable !== null && sort_order !== null && image_columns !== null
    )
  {
    table_ready = true;

    $("#table-pane .load-status").css("display", "none");

    var table_options =
    {
      "server-root" : server_root,
      mid : model._id,
      aid : "inputs",
      metadata : table_metadata,
      colorscale : colorscale,
      colormap : colormap,
      "variable-selection" : [selected_column[cluster_index]],
      "row-selection" : selected_simulations,
      "sort-variable" : sort_variable,
      "sort-order" : sort_order,
      image_columns : image_columns,
    };

    $("#table").table(table_options);

    // Changing the table row selection ...
    $("#table").bind("row-selection-changed", function(event, waveform_indexes)
    {
      // Log changes to the table row selection
      selected_simulations_changed(waveform_indexes);
      // Update the controls ...
      $("#controls").controls("option", "highlight", waveform_indexes);
      // Update the waveform plot ...
      $("#waveform-viewer").waveformplot("option", "highlight", waveform_indexes);
      // Changing the table row selection updates the dendrogram ...
      $("#dendrogram-viewer").dendrogram("option", "highlight", waveform_indexes);
    });

    // Changing table's sort order ...
    $("#table").bind("variable-sort-changed", function(event, variable, order)
    {
      // Log changes to the table sort order ...
      variable_sort_changed(variable, order);
      // Updated the dendrogram sort control
      $("#dendrogram-viewer").dendrogram("option", "dendrogram_sort_order", variable == null && order == null ? true : false);
    });

    // Changing the table variable selection logs it, updates the waveform plot and dendrogram...
    $("#table").bind("variable-selection-changed", function(event, parameters)
    {
      selected_variable_changed(parameters.variable[0]);
      $("#controls").controls("option", "color-variable", selected_column[cluster_index]);
    });
  }

  // Setup the dendrogram ...
  if(
      !dendrogram_ready && bookmark && s_to_a(clusters) && cluster_index !==  null && clusters_data[cluster_index] !== undefined && clusters_data[cluster_index] !== null
      && color_array !== null && colorscale !== null && selected_simulations !== null && colormap !== null && selected_column_min !== null && selected_column_max !== null
      && sort_variable !== null
    )
  {
    dendrogram_ready = true;

    $("#dendrogram-pane .load-status").css("display", "none");

    $("#dendrogram-sparkline-backdrop").css({
      "background-color" : $("#color-switcher").colorswitcher("get_background", colormap).toString(),
      });

    var dendrogram_options = build_dendrogram_node_options(cluster_index);
    dendrogram_options["server-root"]=server_root;
    dendrogram_options.mid = model._id;
    dendrogram_options.clusters = s_to_a(clusters);
    dendrogram_options.cluster_data = s_to_o(clusters_data[cluster_index]);
    dendrogram_options.color_scale = colorscale;
    dendrogram_options.color_array = color_array;

    if(sort_variable != undefined) {
      dendrogram_options.dendrogram_sort_order = false;
    }

    // Respond to note selection changes. This needs to be above the instantiation of the dendrogram
    // because the table needs to know which node is selected in order for it to initialize. If this
    // event handler is registered after the dendrogram is initialized, its first node-selection-changed
    // event never makes it to the table and we end up with a blank table.
    $("#dendrogram-viewer").bind("node-selection-changed", function(event, parameters)
    {
      selected_node_changed(parameters);
    });

    $("#dendrogram-viewer").dendrogram(dendrogram_options);

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

    // Changing the dendrogram waveform selection ...
    $("#dendrogram-viewer").bind("waveform-selection-changed", function(event, waveform_indexes)
    {
      // Log changes to the waveform selection
      selected_simulations_changed(waveform_indexes);
      // Update the controls ...
      $("#controls").controls("option", "highlight", waveform_indexes);
      // Update the waveform plot ...
      $("#waveform-viewer").waveformplot("option", "highlight", waveform_indexes);
      // Update the table row selection ...
      $("#table").table("option", "row-selection", waveform_indexes);
    });

    // Changing the sort order to dendrogram order updates the table ...
    $("#dendrogram-viewer").bind("sort-by-dendrogram-order", function(event){
      $("#table").table("option", "sort-variable", null);
    });

    // Changes to the cluster selection ...
    $("#dendrogram-viewer").bind("cluster-changed", function(event, cluster)
    {
      // Handle changes to the cluster selection ...
      selected_cluster_changed(cluster);
    });
  }
}

//////////////////////////////////////////////////////////////////////////////////////////
// Event handlers.
//////////////////////////////////////////////////////////////////////////////////////////

function selected_colormap_changed(newColormap)
{
  colormap = newColormap;

  // First we change background colors, gradients, and other things that don't require recalculating the colorscale
  $("#legend-pane").css("background", $("#color-switcher").colorswitcher("get_background", colormap).toString());
  $("#legend").legend("option", {gradient: $("#color-switcher").colorswitcher("get_gradient_data", colormap)});

  $("#dendrogram-sparkline-backdrop").css({
    "background-color" : $("#color-switcher").colorswitcher("get_background", colormap).toString(),
    });

  $("#waveform-pane").css({
    "background-color" : $("#color-switcher").colorswitcher("get_background", colormap).toString(),
    });
  $("#waveform-viewer rect.selectionMask").css({
    "fill"             : $("#color-switcher").colorswitcher("get_background", colormap).toString(),
    "fill-opacity"     : $("#color-switcher").colorswitcher("get_opacity", colormap),
    });

  // Now we get the new colorscale and update components
  update_waveform_dendrogram_table_legend_on_selected_variable_changed();

  $.ajax(
  {
    type : "POST",
    url : server_root + "events/models/" + model._id + "/select/colormap/" + colormap
  });
  bookmarker.updateState({"colormap" : colormap});
}

function selected_cluster_changed(cluster)
{
  cluster_index = cluster;

  // Changing the cluster updates the dendrogram and waveformplot ...
  update_dendrogram(cluster_index);
  update_waveformplot(cluster_index);

  // Changing the cluster updates the table variable selection ...
  $("#table").table("option", "variable-selection", [selected_column[cluster_index]]);
  $("#controls").controls("option", "color-variable", selected_column[cluster_index]);
  update_waveform_dendrogram_table_legend_on_selected_variable_changed();

  $.ajax(
  {
    type : "POST",
    url : server_root + "events/models/" + model._id + "/select/cluster/" + cluster_index
  });
  bookmarker.updateState({"cluster-index" : cluster_index});
}

function selected_node_changed(parameters)
{
  selected_waveform_indexes[parseInt(cluster_index, 10)] = getWaveformIndexes(parameters.selection);
  selected_nodes[cluster_index] = getNodeIndexes(parameters.selection);

  // Only want to update the controls if the user changed the selected node. It's automatically set at dendrogram creation time, and we want to avoid updating the controls at that time.
  // Only want to update the waveform plot if the user changed the selected node. It's automatically set at dendrogram creation time, and we want to avoid updating the waveform plot at that time.
  if(parameters.skip_bookmarking != true) {
    // Changing the selected dendrogram node updates the controls ...
    $("#controls").controls("option", "selection", selected_waveform_indexes[parseInt(cluster_index, 10)]);
    $("#controls").controls("option", "highlight", selected_simulations);

    // Changing the selected dendrogram node updates the waveform plot ...
    $("#waveform-viewer").waveformplot("option", "selection", selected_waveform_indexes[parseInt(cluster_index, 10)]);
    $("#waveform-viewer").waveformplot("option", "highlight", selected_simulations);

    // Update bookmark
    var state = {};
    state[ cluster_index + "-selected-nodes" ] = selected_nodes[cluster_index];
    state[ cluster_index + "-selected-waveform-indexes" ] = selected_waveform_indexes[parseInt(cluster_index, 10)];
    bookmarker.updateState(state);    
  }

  // Changing the selected dendrogram node updates the table ...
  $("#table").table("option", "row-selection-silent", selected_simulations);
  $("#table").table("option", "selection", parameters.selection);

  // Post analytics
  if(parameters.node != null && parameters.node["node-index"] != null)
  {
    $.ajax(
    {
      type : "POST",
      url : server_root + "events/models/" + model._id + "/select/node/" + parameters.node["node-index"],
    });
  }
}

function selected_simulations_changed(selection)
{
  selected_simulations = selection;
  // Logging every selected item is too slow, so just log the count instead.
  $.ajax(
  {
    type : "POST",
    url : server_root + "events/models/" + model._id + "/select/simulation/count/" + selected_simulations.length
  });
  var bookmark_selected_simulations = {};
  bookmark_selected_simulations["simulation-selection"] = selected_simulations;
  bookmarker.updateState(bookmark_selected_simulations);
}

function selected_variable_changed(variable)
{
  selected_column[cluster_index] = variable;
  selected_column_type[cluster_index] = table_metadata["column-types"][selected_column[cluster_index]];
  selected_column_min[cluster_index] = table_metadata["column-min"][selected_column[cluster_index]];
  selected_column_max[cluster_index] = table_metadata["column-max"][selected_column[cluster_index]];
  
  update_waveform_dendrogram_table_legend_on_selected_variable_changed();

  $.ajax(
  {
    type : "POST",
    url : server_root + "events/models/" + model._id + "/select/variable/" + selected_column[cluster_index]
  });
  var selected_variable = {};
  selected_variable[cluster_index + "-column-index"] = selected_column[cluster_index];
  bookmarker.updateState(selected_variable);
}

function update_current_colorscale(callback)
{
  if(selected_column_type[cluster_index] != "string")
  {
    colorscale = $("#color-switcher").colorswitcher("get_color_scale", undefined, selected_column_min[cluster_index], selected_column_max[cluster_index]);
    callback(colorscale);
  }
  else
  {
    $.ajax({
      type: "GET",
      url : server_root + "models/" + model._id + "/arraysets/inputs/metadata?unique=0/" + selected_column[cluster_index] + "/...",
      success : function(result) {
        uniqueValues = result.unique[0].values[0];
        colorscale = $("#color-switcher").colorswitcher("get_color_scale_ordinal", undefined, uniqueValues);
        callback(colorscale);
      },
      error: function(result) {
        console.log("there was an error. here it is: " + result);
      }
    });
  }
}

function update_waveform_dendrogram_table_legend_on_selected_variable_changed()
{
  update_current_colorscale(function(colorscale){
    retrieve_sorted_column({
      column : selected_column[cluster_index],
      callback : function(array){
        var parameters = {
          color_array : array,
          color_scale : colorscale,
        };

        $("#waveform-viewer").waveformplot("option", "color-options", parameters);
        $("#dendrogram-viewer").dendrogram("option", "color-options", parameters);
        $("#table").table("option", "colorscale", colorscale);
        $("#legend").legend("option", {
          min: table_metadata["column-min"][selected_column[cluster_index]],
          max: table_metadata["column-max"][selected_column[cluster_index]],
          label: table_metadata["column-names"][selected_column[cluster_index]],
          v_type: selected_column_type[cluster_index],
          uniqueValues: uniqueValues,
        });
      }
    });
  });
}

function variable_sort_changed(variable, order)
{
  sort_variable = variable;
  sort_order = order;
  
  $.ajax(
  {
    type : "POST",
    url : server_root + "events/models/" + model._id + "/select/sort-order/" + variable + "/" + order
  });
  bookmarker.updateState( {"sort-variable" : sort_variable, "sort-order" : sort_order} );
}

function expanded_collapsed_nodes_changed(nodes){
  collapsed_nodes[cluster_index] = nodes.collapsed;
  expanded_nodes[cluster_index] = nodes.expanded;

  var cluster_state = {};
  cluster_state[cluster_index + "-expanded-nodes"] = expanded_nodes[cluster_index];
  cluster_state[cluster_index + "-collapsed-nodes"] = collapsed_nodes[cluster_index];
  bookmarker.updateState(cluster_state);
}

function node_toggled(node){
  $.ajax(
  {
    type : "POST",
    url : server_root + "events/models/" + model._id + "/toggle/node/" + node["node-index"],
  });
}

function update_dendrogram(cluster)
{
  // Retrieve cluster data if it's not already in the cache
  if((clusters_data[cluster] === undefined) || (clusters_data[cluster] === null)) {
     $.ajax(
    {
      url : server_root + "models/" + model._id + "/files/cluster-" + s_to_a(clusters)[cluster],
      contentType : "application/json",
      success : function(cluster_data)
      {
        clusters_data[cluster] = cluster_data;
        var dendrogram_options = build_dendrogram_node_options(cluster);
        dendrogram_options.cluster_data = s_to_o(clusters_data[cluster]);
        $("#dendrogram-viewer").dendrogram("option", dendrogram_options);
      },
      error: artifact_missing
    });
  } else {
    var dendrogram_options = build_dendrogram_node_options(cluster);
    dendrogram_options.cluster_data = s_to_o(clusters_data[cluster]);
    $("#dendrogram-viewer").dendrogram("option", dendrogram_options);
  }
}

function update_waveformplot(cluster)
{
  // Retrieve waveform data if it's not already in the cache
  if(waveforms_data[cluster] === undefined) {
    // Load the waveforms.
    get_model_arrayset({
      server_root : server_root,
      mid : model._id,
      aid : "preview-" + s_to_a(clusters)[cluster],
      success : function(result, metadata)
      {
        waveforms_data[cluster] = result;
        waveforms_metadata[cluster] = metadata;
        var waveformplot_options =
        {
          waveforms: waveforms_data[cluster],
          selection: selected_waveform_indexes[cluster],
          highlight: selected_simulations,
        };
        $("#waveform-viewer").waveformplot("option", "waveforms", waveformplot_options);
      },
      error : artifact_missing
    });
  } else {
    var waveformplot_options =
    {
      waveforms: waveforms_data[cluster],
      selection: selected_waveform_indexes[cluster],
      highlight: selected_simulations,
    };
    $("#waveform-viewer").waveformplot("option", "waveforms", waveformplot_options);
  }
}

function build_dendrogram_node_options(cluster)
{
  var dendrogram_options = {
    cluster: cluster,
  };

  dendrogram_options.collapsed_nodes = collapsed_nodes[cluster];
  dendrogram_options.expanded_nodes = expanded_nodes[cluster];
  dendrogram_options.selected_nodes = selected_nodes[cluster];
  dendrogram_options.highlight = selected_simulations;

  return dendrogram_options;
}

function getWaveformIndexes(nodes)
{
  var waveform_indexes = [];
  var waveform_index = null;

  $.each(nodes, function(index, node)
  {
    waveform_index = node["waveform-index"];
    if(waveform_index != null)
      waveform_indexes.push(waveform_index);
  });

  return waveform_indexes;
}

function getNodeIndexes(nodes)
{
  var node_indexes = [];
  var node_index = null;

  for(var i=0; i<nodes.length; i++)
  {
    node_index = nodes[i]["node-index"];
    if(node_index != null)
      node_indexes.push(node_index);
  }

  return node_indexes;
}

});
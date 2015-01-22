define("slycat-parameter-image-model", ["slycat-server-root", "slycat-bookmark-manager", "d3", "slycat-parameter-image-scatterplot", "slycat-parameter-image-controls", "slycat-parameter-image-table", "slycat-color-switcher", "domReady!"], function(server_root, bookmark_manager, d3)
{
//////////////////////////////////////////////////////////////////////////////////////////
// Setup global variables.
//////////////////////////////////////////////////////////////////////////////////////////

var model_id = location.pathname.split("/").reverse()[0];
var input_columns = null;
var output_columns = null;
var image_columns = null;
var rating_columns = null;
var category_columns = null;

var bookmarker = null;
var bookmark = null;

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
var image_uri = document.createElement("a");

//////////////////////////////////////////////////////////////////////////////////////////
// Setup page layout.
//////////////////////////////////////////////////////////////////////////////////////////

$("#parameter-image-plus-layout").layout(
{
  north:
  {
    size: 28,
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
    bookmarker = bookmark_manager.create(model.project, model.id);
    input_columns = model["artifact:input-columns"];
    output_columns = model["artifact:output-columns"];
    image_columns = model["artifact:image-columns"];
    rating_columns = model["artifact:rating-columns"] == undefined ? [] : model["artifact:rating-columns"];
    category_columns = model["artifact:category-columns"] == undefined ? [] : model["artifact:category-columns"];
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

function model_loaded()
{
  if(model["state"] == "waiting" || model["state"] == "running")
  {
    $("#status-messages").empty().html(
      "<div class='error-heading'>Oops, this model isn't ready yet.</div>" +
      "<div class='error-description'>We're probabably building it for you right now." +
      "Watch the status bar for progress information and more details.</div>");
    show_status_messages();
  }
  else if(model["state"] == "closed" && model["result"] === null)
  {
    $("#status-messages").empty().html(
      "<div class='error-heading'>Oops, it looks like this model was never completed.</div>" +
      "<div class='error-description'>Here's the last thing that was happening before it was closed:</div>" +
      "<pre>" + model["message"] + "</pre>");
    show_status_messages();
  }
  else if(model["result"] == "failed")
  {
    $("#status-messages").empty().html(
      "<div class='error-heading'>Oops, it looks like this model failed to build.</div>" +
      "<div class='error-description'>Here's what was happening when it ended:</div>" +
      "<pre>" + model["message"] + "</pre>");
    show_status_messages();
  }
  else
  {
    // Display progress as the load happens ...
    $(".load-status").text("Loading data.");

    // Load data table metadata.
    $.ajax({
      url : server_root + "models/" + model_id + "/tables/data-table/arrays/0/metadata?index=Index",
      contentType : "application/json",
      success: function(metadata)
      {
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
      setup_controls();
      setup_colorswitcher();
      metadata_loaded();
    });
  }
}

function show_status_messages()
{
  $("#status-messages").dialog(
  {
    autoOpen: true,
    width: 500,
    height: 300,
    modal: false,
    buttons:
    {
      OK: function()
      {
        $("#status-messages").dialog("close");
      }
    }
  });
}

function artifact_missing()
{
  $(".load-status").css("display", "none");

  $("#status-messages").empty().html(
    "<div class='error-heading'>Oops, there was a problem retrieving data from the model.</div>" +
    "<div class='error-description'>This probably means that there was a problem building the model. " +
    "Here's the last thing that was going on with it:</div>" +
    "<pre>" + model["message"] + "</pre>");

  show_status_messages();
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

    get_model_array_attribute({
      server_root : server_root,
      mid : model_id,
      aid : "data-table",
      array : 0,
      attribute : x_index,
      success : function(result)
      {
        x = result;
        setup_scatterplot();
        setup_table();
      },
      error : artifact_missing
    });

    get_model_array_attribute({
      server_root : server_root,
      mid : model_id,
      aid : "data-table",
      array : 0,
      attribute : y_index,
      success : function(result)
      {
        y = result;
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
    }
    else
    {
      get_model_array_attribute({
        server_root : server_root,
        mid : model_id,
        aid : "data-table",
        array : 0,
        attribute : v_index,
        success : function(result)
        {
          v = result;
          update_current_colorscale();
          setup_scatterplot();
          setup_table();
        },
        error : artifact_missing
      });
    }

    images_index = image_columns[0];
    if("images-selection" in bookmark)
      images_index = bookmark["images-selection"];
    setup_table();
    if(image_columns.length > 0)
    {
      $.ajax(
      {
        type : "GET",
        url : server_root + "models/" + model_id + "/arraysets/data-table/arrays/0/attributes/"
          + images_index + "/chunk?ranges=0," + table_metadata["row-count"],
        success : function(result)
        {
          images = result;
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
    && indices)
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
    $("#controls").bind("set-value", function(event, arguments)
    {
      writeData(arguments.selection, arguments.variable, arguments.value);
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
    $("#controls").bind("hide-unselected", function(event, selection)
    {
      // Remove any selected_simulations from hidden_simulations
      for(var i=0; i<selected_simulations.length; i++){
        var index = $.inArray(selected_simulations[i], hidden_simulations);
        if(index != -1) {
          hidden_simulations.splice(index, 1);
        }
      }

      // Add all non-selected_simulations to hidden_simulations
      for(var i=0; i<indices.length; i++){
        if($.inArray(indices[i], selected_simulations) == -1) {
          hidden_simulations.push(indices[i]);
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

function selected_colormap_changed(colormap)
{
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


  // Get entire data column for current image variable and pass it to scatterplot and dendrogram
  $.ajax(
  {
    type : "GET",
    url : server_root + "models/" + model_id + "/arraysets/data-table/arrays/0/attributes/" +
      images_index + "/chunk?ranges=0," + table_metadata["row-count"],
    success : function(result)
    {
      images = result;
      // Passing new images to both scatterplot and dendrogram
      $("#scatterplot").scatterplot("option", "images", images);
    },
    error: artifact_missing
  });

  // Log changes to and bookmark the images variable ...
  images_selection_changed(images_index);
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
  get_model_array_attribute({
    server_root : server_root,
    mid : model_id,
    aid : "data-table",
    array : 0,
    attribute : variable,
    success : function(result)
    {
      v = result;
      update_widgets_after_color_variable_change();
    },
    error : artifact_missing
  });
}

function update_widgets_after_color_variable_change()
{
  update_current_colorscale();
  $("#table").table("option", "colorscale", colorscale);
  $("#scatterplot").scatterplot("update_color_scale_and_v", {v : v, v_string : table_metadata["column-types"][v_index]=="string", colorscale : colorscale});
  $("#scatterplot").scatterplot("option", "v_label", table_metadata["column-names"][v_index]);
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
  }
  else
  {
    $("#table").table("option", "hidden_simulations", hidden_simulations);
    $("#scatterplot").scatterplot("option", "hidden_simulations", hidden_simulations);
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
  get_model_array_attribute({
    server_root : server_root,
    mid : model_id,
    aid : "data-table",
    array : 0,
    attribute : variable,
    success : function(result)
    {
      $("#scatterplot").scatterplot("option", {x_string: table_metadata["column-types"][variable]=="string", x: result, x_label:table_metadata["column-names"][variable]});
    },
    error : artifact_missing
  });
}

function update_scatterplot_y(variable)
{
  get_model_array_attribute({
    server_root : server_root,
    mid : model_id,
    aid : "data-table",
    array : 0,
    attribute : variable,
    success : function(result)
    {
      $("#scatterplot").scatterplot("option", {y_string: table_metadata["column-types"][variable]=="string", y: result, y_label:table_metadata["column-names"][variable]});
    },
    error : artifact_missing
  });
}

function load_table_statistics(columns, callback)
{
  var requests = Array();
  for(var i=0; i<columns.length; i++)
  {
    requests.push(
      $.ajax({
        url : server_root + "models/" + model_id + "/arraysets/data-table/arrays/0/attributes/" + columns[i] + "/statistics",
        contentType : "application/json",
      })
    );
  }
  var defer = $.when.apply($, requests);
  defer.done(function(){
    // This is executed only after every ajax request has been completed
    $.each(arguments, function(index, responseData){
      // "responseData" contains an array of response information for each specific request
      table_statistics[parseInt(columns[index])] = responseData.length == undefined ? responseData : responseData[0];
    });
    callback();
  });
}
});

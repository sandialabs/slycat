/*
Copyright 2013 National Technology & Engineering Solutions of Sandia, LLC (NTESS). 
Under the terms of Contract DE-NA0003525 with NTESS, the U.S. Government 
retains certain rights in this software.
*/
// This script sets up the overall layout of the movie-plex user
// interface, making calls out to different functions for each of
// the jQuery windows.

// S. Martin
// 4/27/2017

import api_root from "js/slycat-api-root";
import * as remotes from "js/slycat-remotes";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import bookmark_manager from "js/slycat-bookmark-manager";
import ko from "knockout";
import URI from "urijs";
import request from "./vs-request-data.js";
import layout from "./vs-layout.js";
import colorswitcher from "./color-switcher.js";
import traj_plot from "./vs-trajectories.js";
import scatter_plot from "./vs-scatter-plot.js";
import table_pane from "./vs-table.js";
import movie_pane from "./vs-movies.js";
import d3 from "d3";
import control from "./vs-controls"
//import _ from "js/lodash";

// global parameters to set up movie-plex UI
// -----------------------------------------

var MAX_POINTS_ANIMATE = 2500;  // number of points over which to stop animation
var SCATTER_BORDER = 0.025;     // border around scatter plot (fraction of 1)
// scatter plot colors (css/d3 named colors)
var POINT_COLOR = "whitesmoke";
var POINT_SIZE = 5;
var NO_SEL_COLOR = "black";
var OUTLINE_NO_SEL = 1;

var foreground_color = null;
var hover_background_color = null;
var null_color = null;
var model = { _id: URI(window.location).segment(-1) };
var aid = "movies.meta";

var highlighted_simulations = null;
var pinned_simulations = null;
var current_video = null;
var playing_videos = null;

var video_sync = null;
var video_sync_time = null;
var video_times = null;
var diagram_time = null;
var min_time = null;
var max_time = null;
var colormap = null;
var color_scale = null;
var color_array = null;

var media_columns = null;
var color_variables = null;
var color_variable = null;

var sort_variable = null;
var sort_order = null;

var min_value = null;
var max_value = null;

var bookmarker = null;
var bookmark = null;

var video_sync_time_changed_throttle_timeout = null;
var video_sync_time_changed_throttle_ms = 500;

var input_columns = null;
var output_columns = null;
var other_columns = null;

// constants for polling timeouts
var ONE_MINUTE = 60000;
var ONE_SECOND = 1000;
var TEN_SECOND = 10000;

// polling interval is 1 second
var interval = TEN_SECOND;

// waits 1 minute past last successful progress update
var endTime = Number(new Date()) + ONE_MINUTE;

// hostname, log file for monitoring; working directory for outputs
var logHostName = "";
var logFileName = "";
var workDir = "";

// if user is looking at textarea then don't scroll to bottom
var user_scroll = false;
$("#vs_processing_textarea").focus (function () { user_scroll = true; });
$("#vs_processing_textarea").focusout(function () { user_scroll = false; });
// reconnect button
var reconnect = function ()
{

    // sever connections associated with this user
    $.ajax(
    {
        dataType: "json",
        type: "GET",
        url: api_root + "clear/ssh-sessions",
        success: function(id)
        {
            // polling will automatically ask for new connection
        },
        error: function(request, status, reason_phrase)
        {
            dialog.ajax_error("Server error: could not reset connection.")("","","");
        },
    });

}
// set-up reconnect button
$("#vs-reconnect-button").on("click", reconnect);

// poll database for artifact "vs-loading-progress"
(function poll() {

    client.get_model_parameter(
    {
        mid: model._id,
        aid: "vs-loading-parms",
        success: function (result)
        {

            if (result[0] === "Uploaded") {

                launch_model();

            } else if (result[0] === "Remote") {

                // update host and log file name
                logFileName = result[1];
                logHostName = result[2];
                workDir = result[3];

                // call web server to read log file
                client.get_model_command({
                    mid: model._id,
                    type: "VS",
                    command: "read_log",
                    parameters: [logFileName, logHostName],
                    success: function (result) {

                        if (result["error"] === true) {

                            dialog.ajax_error("Server error: " + result["error_message"])("","","");

                        } else if (result["finished"] === false) {

                            var compute_progress = 10 + Math.round(result["progress"] * .7);

                            // update progress bar
                            $("#vs_processing_progress_bar").width(compute_progress + "%");
                            $("#vs_processing_progress_bar").text("Computing ...");

                            // update text box unless user has focused on it
                            if (user_scroll == false) {
                                $("#vs_processing_textarea").text(result["user_log"]);
                                $("#vs_processing_textarea").scrollTop($("#vs_processing_textarea")[0].scrollHeight);
                            }

                            // reset time out and continue
                            endTime = Number(new Date()) + ONE_MINUTE;
                            window.setTimeout(poll, interval);

                        } else {

                            // update progress bar one last time
                            $("#vs_processing_progress_bar").width(75 + "%");
                            $("#vs_processing_progress_bar").text("Computing ...");

                            // update text box one last time
                            $("#vs_processing_textarea").text(result["user_log"]);
                            $("#vs_processing_textarea").scrollTop($("#vs_processing_textarea")[0].scrollHeight);

                            // done computing, go upload the model
                            read_csv_file();

                        }
                    },
                    error: function (result1, result2, result3) {

                        // try to re-connect to server
                        var remote_pool = remotes.create_pool();
                        remote_pool.get_remote({
                            hostname: logHostName,
                            title: "Login to " + logHostName,
                            message: "Loading " + logFileName,
                            cancel: function() {

                                // if the user cancels, we do nothing and the program stops

                            },
                            success: function() {

                                // reset time out and continue
                                endTime = Number(new Date()) + ONE_MINUTE;
                                window.setTimeout(poll, interval);

                            },
                            error: function() {

                                dialog.ajax_error("Server error: could not connect to cluster.")("","","");

                            }
                        });
                    },
                })

            } else {

                dialog.ajax_error("Wizard error: unknown model launch type.")("","","");

            }
        },
        error: function () {

            if (Number(new Date()) < endTime) {

                // check model for existence of "vs-loading-progress" artifact
                client.get_model(
                {
                    mid: model._id,
                    success: function (result)
                    {
                        // if "vs-polling-progress" doesn't exist it's an older model, just load it
                        if (!("artifact:vs-loading-parms" in result))
                        {
                            launch_model();
                        } else {

                            // otherwise keep trying, do not reset timer
                            window.setTimeout(poll, interval);

                        }
                    },
                    error: function ()
                    {
                        // couldn't even load model? -- give up
                        launch_model();
                    }
                });

            } else {
                // all else fails -- give up
                launch_model();
            }
        }
    });
})();

// reconnect button
var reconnect = function ()
{

    // sever connections associated with this user
    $.ajax(
    {
        dataType: "json",
        type: "GET",
        url: api_root + "clear/ssh-sessions",
        success: function(id)
        {
            // polling will automatically ask for new connection
        },
        error: function(request, status, reason_phrase)
        {
            dialog.ajax_error("Server error: could not reset connection.")("","","");
        },
    });

}

// read in csv file
function read_csv_file()
{

    // upload csv file
    console.log("Uploading CSV file ...");

    // update progress bar
    $("#vs_processing_progress_bar").width(80 + "%");
    $("#vs_processing_progress_bar").text("Uploading ...");

    // call web server to upload csv file
    client.get_model_command({
        mid: model._id,
        type: "VS",
        command: "read_csv",
        parameters: [workDir, logHostName],
        success: function (result) {

            // check for errors
            if (result["error"] == false) {

                // update progress bar
                $("#vs_processing_progress_bar").width(85 + "%");
                $("#vs_processing_progress_bar").text("Uploading ...");

                // read next file
                read_trajectories_file();

            } else {

                dialog.ajax_error("Server error: " + result["error_message"])("","","");

            }
        },
        error: function (result1, result2, result3) {

            dialog.ajax_error("Server error: could not upload CSV file.")("","","");

        }
    });

}

// read trajectories file
function read_trajectories_file()
{

    // upload csv file
    console.log("Uploading .trajectories file ...");

    // call web server to upload csv file
    client.get_model_command({
        mid: model._id,
        type: "VS",
        command: "read_mat_file",
        parameters: [workDir, logHostName, "movies.trajectories"],
        success: function (result) {

            // check for errors
            if (result["error"] === false) {

                // update progress bar
                $("#vs_processing_progress_bar").width(90 + "%");
                $("#vs_processing_progress_bar").text("Uploading ...");

                // read next file
                read_xcoords_file();

            } else {

                dialog.ajax_error("Server error: " + result["error_message"])("","","");

            }
        },
        error: function () {

            dialog.ajax_error("Server error: could not upload .trajectories file.")("","","");

        }
    });

}

// read xcoords file
function read_xcoords_file()
{

    // upload csv file
    console.log("Uploading .xcoords file ...");

    // call web server to upload csv file
    client.get_model_command({
        mid: model._id,
        type: "VS",
        command: "read_mat_file",
        parameters: [workDir, logHostName, "movies.xcoords"],
        success: function (result) {

            // check for errors
            if (result["error"] === false) {

                // update progress bar
                $("#vs_processing_progress_bar").width(95 + "%");
                $("#vs_processing_progress_bar").text("Uploading ...");

                // read next file
                read_ycoords_file();

            } else {

                dialog.ajax_error("Server error: " + result["error_message"])("","","");

            }
        },
        error: function () {

            dialog.ajax_error("Server error: could not upload .xcoords file.")("","","");

        }
    });

}

// read ycoords file
function read_ycoords_file()
{

    // upload csv file
    console.log("Uploading .ycoords file ...");

    // call web server to upload csv file
    client.get_model_command({
        mid: model._id,
        type: "VS",
        command: "read_mat_file",
        parameters: [workDir, logHostName, "movies.ycoords"],
        success: function (result) {

            // check for errors
            if (result["error"] === false) {

                // update progress bar (done)
                $("#vs_processing_progress_bar").width(100 + "%");

                // done -- mark model as uploaded and launch
                client.put_model_parameter({
                    mid: model._id,
                    aid: "vs-loading-parms",
                    value: ["Uploaded"],
                    success: function () {

                        // go to model
                        launch_model();

                    },
                    error: function () {

                        dialog.ajax_error("Error uploading model status.")("","","");
                    }
                });

            } else {

                dialog.ajax_error("Server error: " + result["error_message"])("","","");

            }
        },
        error: function () {

            dialog.ajax_error("Server error: could not upload .ycoords file.")("","","");

        }
    });

}

// called when done polling to launch the model
function launch_model()
{

    // remove progress bar and set up model interface
	$('#vs-progress-feedback').remove();
    $('.vs-model-content').show();

    // set up jQuery layout for user interface
    layout.setup();

    // set up bookmarks, then load model (call model_loaded())
    $.ajax(
    {
      type : "GET",
      url : api_root + "models/" + model._id,
      success : function(result)
      {
        model = result;
        bookmarker = bookmark_manager.create(model.project, model._id);
        // Retrieve bookmarked state information ...
        bookmarker.getState(function(state)
        {
          bookmark = state;
          colormap = bookmark["colormap"] !== undefined ? bookmark["colormap"] : "night";
          color_variable = bookmark["variable-selection"] !== undefined ? bookmark["variable-selection"] : 1;
          highlighted_simulations = bookmark["simulation-selection"] !== undefined ? bookmark["simulation-selection"] : [];
          diagram_time = bookmark["diagram_time"] !== undefined ? bookmark["diagram_time"] : null;
          video_sync = bookmark["video_sync"] !== undefined ? bookmark["video_sync"] : true;
          video_sync_time = bookmark["video_sync_time"] !== undefined ? bookmark["video_sync_time"] : 0;
          pinned_simulations = bookmark["pinned_simulations"] !== undefined ? bookmark["pinned_simulations"] : [];
          current_video = bookmark["current_video"] !== undefined ? bookmark["current_video"] : null;
          sort_variable = bookmark["sort_variable"] !== undefined ? bookmark["sort_variable"] : null;
          sort_order = bookmark["sort_order"] !== undefined ? bookmark["sort_order"] : null;
          // Not restoring playing_videos from bookmark because we want to start with all videos paused
          //playing_videos = bookmark["playing_videos"] !== undefined ? bookmark["playing_videos"] : [];
          playing_videos = [];
          video_times = bookmark["video_times"] !== undefined ? bookmark["video_times"] : {};
          model_loaded();
        });
      },
      error: function(request, status, reason_phrase)
      {
        window.alert("Error retrieving model: " + reason_phrase);
      }
    });

}

// load model data and finish setup
function model_loaded()
{
  // load all relevant data from slycat
  // ----------------------------------
  $.when(
    request.get_table_metadata("movies.meta"),
    request.get_table("movies.meta"),
    request.get_array("movies.links", 0),
    request.get_array("movies.xcoords", 0),
    request.get_array("movies.ycoords", 0),
    request.get_array("movies.trajectories", 0)
  )
  .then(
    function(table_metadata, table_data, links, xcoords, ycoords, time_trajectories) {
      // look at variables (for debugging)
      // console.log (links);
      // console.log (xcoords);
      // console.log (ycoords);
      // console.log (time_trajectories);

      // calls to set up movie-plex UI panes
      // -----------------------------------

      // Adding Index column to table_metadata and table_data
      table_metadata[0]["column-count"] = table_metadata[0]["column-count"] + 1;
      table_metadata[0]["column-names"].push("Index");
      table_metadata[0]["column-types"].push("int64");
      table_metadata[0]["column-min"].push(0);
      table_metadata[0]["column-max"].push(table_metadata[0]["row-count"]-1);
      table_data[0]["column-names"].push("Index");
      table_data[0]["columns"].push(table_metadata[0]["column-count"]-1);
      table_data[0]["data"].push(_.range(table_data[0]["rows"].length));

      input_columns  = model["artifact:input-columns"];
      output_columns = model["artifact:output-columns"];
      media_columns  = model["artifact:media_columns"];
      other_columns  =  _.difference(_.range(table_metadata[0]["column-count"]-1), input_columns, output_columns);
      color_variables = _.difference(_.range(table_metadata[0]["column-count"]), media_columns);

      $("#color-switcher").colorswitcher({colormap:colormap});
      $("#color-switcher").bind("colormap-changed", function(event, colormap)
      {
        update_colormap(colormap);
        update_current_colorscale(null, null);
      });

      foreground_color = $("#color-switcher").colorswitcher("get_foreground");
      hover_background_color = $("#color-switcher").colorswitcher("get_background_2");
      null_color = $("#color-switcher").colorswitcher("get_null_color");

      //Gets the min and max from the default data set (velocity for now) to calculate the color scale
      var default_data = table_data[0].data[color_variable];

      max_value = Math.max.apply(null, default_data);
      min_value = Math.min.apply(null, default_data);

      // first row of trajectories data contains time points
      var time_data = time_trajectories[0][0];
      min_time = time_data[0];
      max_time = time_data[time_data.length - 1];
      if(diagram_time === null)
      {
        diagram_time = min_time;
      }

      // remaining rows are actual trajectory data
      var traj_data = time_trajectories[0].slice(1);

      var waveforms = [];
      var object = {};
      var selection = [];

      for(var i=0; i < traj_data.length; i++)
      {
        waveforms.push({"input-index": i, time: time_data, value: traj_data[i]});
        selection.push(i);
      }


      // set up the trajetories pane
      // traj_plot.setup(time_data, traj_data);

      color_scale = $("#color-switcher").colorswitcher("get_color_scale", undefined, min_value, max_value);
      color_array = $("#color-switcher").colorswitcher("get_gradient_data", undefined);

      //background defaults to "night"
      $("#mp-trajectories").css({
        "background-color" : $("#color-switcher").colorswitcher("get_background", colormap).toString(),
        });
      $("#waveform-viewer rect.selectionMask").css({
        "fill"             : $("#color-switcher").colorswitcher("get_background", colormap).toString(),
        "fill-opacity"     : $("#color-switcher").colorswitcher("get_opacity", colormap),
        });
        $("#mp-movies").css({
        "background-color" : $("#color-switcher").colorswitcher("get_background", colormap).toString(),
        });

      $("#mp-mds-pane").css({
       "background-color" : $("#color-switcher").colorswitcher("get_background", colormap).toString(),
      });

      var trajectories_options =
      {
        api_root: api_root,
        waveforms: waveforms,
        table_data: table_data,
        color_scale: color_scale,
        color_array: color_array,
        highlighted_simulations: highlighted_simulations.slice(),
        selection: selection,
        foreground_color: ko.observable(foreground_color),
        hover_background_color: ko.observable(hover_background_color),
        null_color: ko.observable(null_color),
        min_time: min_time,
        max_time: max_time,
        diagram_time: diagram_time,
        color_var_index: color_variable,
        current_video: current_video,
      };

      $("#waveform-viewer").trajectories(trajectories_options);

      // Changing the waveform selection ...
      $("#waveform-viewer").bind("waveform-selection-changed", function(event, highlighted_simulations)
      {
        // Handle the waveform selection change
        highlighted_simulations_changed(highlighted_simulations);
      });

      // Changing the diagram time ...
      $("#waveform-viewer").bind("diagram_time_changed", function(event, new_diagram_time)
      {
        // Handle the diagram time change
        diagram_time_changed(new_diagram_time);
      });

      var movies_options =
      {
        model: model,
        links: links[0],
        highlighted_simulations: highlighted_simulations.slice(),
        pinned_simulations: pinned_simulations.slice(),
        color_scale: color_scale,
        color_array: color_array,
        table_data: table_data,
        video_sync: video_sync,
        video_sync_time: video_sync_time,
        color_var_index: color_variable,
        current_video: current_video,
        playing_videos: playing_videos.slice(),
        video_times: video_times,
      };

      $("#mp-movies").movies(movies_options);

      $("#mp-movies").bind("pinned_simulations_changed", function(event, pinned_simulations)
      {
        // Handle the change to pinned_simulations
        pinned_simulations_changed(pinned_simulations);
      });

      $("#mp-movies").bind("video_sync_time", function(event, new_video_sync_time)
      {
        // Handle the change to video_sync_time
        video_sync_time_changed(new_video_sync_time);
      });

      $("#mp-movies").bind("current_video", function(event, new_current_video)
      {
        // Handle the change to current_video
        current_video_changed(new_current_video);
      });

      $("#mp-movies").bind("playing_videos", function(event, new_playing_videos)
      {
        // Handle the change to playing_videos
        playing_videos_changed(new_playing_videos);
      });

      $("#mp-movies").bind("video_time", function(event, video_time)
      {
        // Handle the change to playing_videos
        video_time_changed(video_time);
      });

      // Jumping to simulation ...
      $("#mp-movies").bind("jump_to_simulation", function(event, index)
      {
        // Handle the jump
        jump_to_simulation(index);
      });

      // transform our coordinates into an array of (x,y) coords for each time point
      // (this is the format used by d3)
      var xy_coords = [];
      //These are supposed to be arrays of arrays
      // console.log(xcoords[0].length);
      // console.log(ycoords[0]);
      for (i = 0; i < xcoords[0].length; i++) {
          var time_i = [];
          for (var j = 0; j < xcoords[0][i].length; j++) {
              time_i.push ([xcoords[0][i][j], ycoords[0][i][j]])
          }
          xy_coords.push (time_i);
      }
      // console.log(xy_coords);

      var scatterplot_options =
      {
        xy_coords: xy_coords,
        table_data: table_data,
        max_points_animate: MAX_POINTS_ANIMATE,
        scatter_border: SCATTER_BORDER,
        point_color: POINT_COLOR,
        point_size: POINT_SIZE,
        no_sel_color: NO_SEL_COLOR,
        outline_no_sel: OUTLINE_NO_SEL,
        color_scale: color_scale,
        color_array: color_array,
        color_var_index: color_variable,
        highlighted_simulations: highlighted_simulations.slice(),
        selection: highlighted_simulations.slice(), // scatterplot calls it 'selection', so going with that for now but leaving 'highlighted_simulations' too for when we standardize on a common vocab for state variables
        diagram_time: diagram_time,
        null_color: null_color,
        current_video: current_video,
      };

      $("#mp-mds-scatterplot").scatterplot(scatterplot_options);
      $("#mp-mds-scatterplot").bind("scatterplot-selection-changed", function(event, highlighted_simulations)
      {
        // Handle the waveform selection change
        highlighted_simulations_changed(highlighted_simulations);
      });

      var controls_options =
      {
        model: model,
        aid: aid,
        color_variables: color_variables,
        color_variable: color_variable,
        metadata: table_metadata[0],
        current_video: current_video,
        playing_videos: playing_videos.slice(),
        highlighted_simulations: highlighted_simulations.slice(),
        video_sync: video_sync,
        video_sync_time: video_sync_time,
        pinned_simulations: pinned_simulations.slice(),
      };

      $("#controls").controls(controls_options);

      $("#controls").bind("color-selection-changed", function(event, newVar)
      {
        update_current_colorscale(table_data, newVar);
        update_coloring_var(newVar);
      });

      $("#controls").bind("pinned_simulations_changed", function(event, pinned_simulations)
      {
        // Handle the change to pinned_simulations
        pinned_simulations_changed(pinned_simulations);
      });

      $("#controls").bind("video_sync", function(event, new_video_sync)
      {
        // Handle the change to video_sync
        video_sync_changed(new_video_sync);
      });

      $("#controls").bind("video_sync_time", function(event, new_video_sync_time)
      {
        // Handle the change to video_sync_time
        video_sync_time_changed(new_video_sync_time);
      });

      // Clicking jump-to-start updates the scatterplot and logs it ...
      $("#controls").bind("jump-to-start", function(event)
      {
        $("#mp-movies").movies("jump_to_start");
      });

      // Clicking frame-forward updates the scatterplot and logs it ...
      $("#controls").bind("frame-forward", function(event)
      {
        $("#mp-movies").movies("frame_forward");
      });

      // Clicking play updates the scatterplot and logs it ...
      $("#controls").bind("play", function(event)
      {
        $("#mp-movies").movies("play");
      });

      // Clicking pause updates the scatterplot and logs it ...
      $("#controls").bind("pause", function(event)
      {
        $("#mp-movies").movies("pause");
      });

      // Clicking frame-back updates the scatterplot and logs it ...
      $("#controls").bind("frame-back", function(event)
      {
        $("#mp-movies").movies("frame_back");
      });

      // Clicking jump-to-end updates the scatterplot and logs it ...
      $("#controls").bind("jump-to-end", function(event)
      {
        $("#mp-movies").movies("jump_to_end");
      });

      // set up the meta data table
      // table_pane.setup(table_metadata, table_data);

      var table_options = 
      {
        api_root: api_root,
        mid: model._id,
        aid: aid,
        metadata: table_metadata[0],
        inputs: input_columns,
        outputs: output_columns,
        others : other_columns,
        "row-selection": highlighted_simulations.slice(),
        color_variable: color_variable,
        color_scale: color_scale,
        sort_variable: sort_variable,
        sort_order: sort_order,
      };

      $("#mp-datapoints-table").table(table_options);
      $("#mp-datapoints-table").bind("table-selection-changed", function(event, highlighted_simulations)
      {
        // Handle the waveform selection change
        highlighted_simulations_changed(highlighted_simulations);
      });
      $("#mp-datapoints-table").bind("color-selection-changed", function(event, newVar)
      {
        update_current_colorscale(table_data, newVar);
        update_coloring_var(newVar);
      });
      $("#mp-datapoints-table").bind("variable-sort-changed", function(event, variable, order)
      {
        variable_sort_changed(variable, order);
      });
    },
    function () {
        console.log ("Server failure: could not load movie plex data.");
    }
  );
}

function highlighted_simulations_changed(waveform_indexes)
{
  // Make sure arrays are different before continuing
  if(!_.isEmpty(_.xor(highlighted_simulations, waveform_indexes)))
  {
    highlighted_simulations = waveform_indexes;
    // Updates the widgets ...
    $("#controls").controls             ("option", "highlighted_simulations", highlighted_simulations.slice()); // Passing copy of highlighted_simulations to ensure that others don't make changes to it
    $("#mp-movies").movies              ("option", "highlighted_simulations", highlighted_simulations.slice()); // Passing copy of highlighted_simulations to ensure that others don't make changes to it
    $("#waveform-viewer").trajectories  ("option", "highlighted_simulations", highlighted_simulations.slice()); // Passing copy of highlighted_simulations to ensure that others don't make changes to it
    $("#mp-mds-scatterplot").scatterplot("option", "highlighted_simulations", highlighted_simulations.slice()); // Passing copy of highlighted_simulations to ensure that others don't make changes to it
    $("#mp-datapoints-table").table     ("option", "row-selection",           highlighted_simulations.slice()); // Passing copy of highlighted_simulations to ensure that others don't make changes to it

    bookmarker.updateState({"simulation-selection" : highlighted_simulations});
  }
}

function pinned_simulations_changed(waveform_indexes)
{
  // console.log("pinned_simulations_changed(" + waveform_indexes + ")");
  // Make sure arrays are different before continuing
  if(!_.isEmpty(_.xor(pinned_simulations, waveform_indexes)))
  {
    pinned_simulations = waveform_indexes;
    // Updates the widgets ...
    $("#controls").controls           ("option", "pinned_simulations", pinned_simulations.slice()); // Passing copy of pinned_simulations to ensure that others don't make changes to it
    $("#mp-movies").movies            ("option", "pinned_simulations", pinned_simulations.slice()); // Passing copy of pinned_simulations to ensure that others don't make changes to it
    $("#waveform-viewer").trajectories("option", "pinned_simulations", pinned_simulations.slice()); // Passing copy of pinned_simulations to ensure that others don't make changes to it

    bookmarker.updateState({"pinned_simulations" : pinned_simulations});
  }
}

function diagram_time_changed(new_diagram_time)
{
  // Make sure new value is different before continuing
  if(new_diagram_time != diagram_time)
  {
    diagram_time = new_diagram_time;
    // Update the widgets ...
    $("#controls").controls             ("option", "diagram_time", diagram_time);
    $("#mp-movies").movies              ("option", "diagram_time", diagram_time);
    $("#waveform-viewer").trajectories  ("option", "diagram_time", diagram_time);
    $("#mp-mds-scatterplot").scatterplot("option", "diagram_time", diagram_time);

    video_sync_time = diagram_time;
    $("#controls").controls             ("option", "video_sync_time", video_sync_time);
    $("#mp-movies").movies              ("option", "video_sync_time", video_sync_time);
    $("#waveform-viewer").trajectories  ("option", "video_sync_time", video_sync_time);
    $("#mp-mds-scatterplot").scatterplot("option", "video_sync_time", video_sync_time);

    bookmarker.updateState({"diagram_time" : diagram_time, "video_sync_time" : video_sync_time});
  }
}

function video_sync_changed(new_video_sync)
{
  // Make sure new value is different before continuing
  if(new_video_sync != video_sync)
  {
    // Update video_sync with new value and let widgets know the new value
    video_sync = new_video_sync;
    // Update the widgets ...
    $("#controls").controls             ("option", "video_sync", video_sync);
    $("#mp-movies").movies              ("option", "video_sync", video_sync);
    $("#waveform-viewer").trajectories  ("option", "video_sync", video_sync);
    $("#mp-mds-scatterplot").scatterplot("option", "video_sync", video_sync);
    // If video_sync is on, set diagram_time to same as video_sync_time and let widgets know new value
    if(video_sync)
    {
      diagram_time = video_sync_time;
      $("#controls").controls             ("option", "diagram_time", diagram_time);
      $("#mp-movies").movies              ("option", "diagram_time", diagram_time);
      $("#waveform-viewer").trajectories  ("option", "diagram_time", diagram_time);
      $("#mp-mds-scatterplot").scatterplot("option", "diagram_time", diagram_time);

      bookmarker.updateState({"diagram_time" : diagram_time});
    }
    bookmarker.updateState({"video_sync" : video_sync});
  }
}

function video_sync_time_changed(new_video_sync_time)
{
  // Make sure new value is different before continuing
  if(new_video_sync_time != video_sync_time)
  {
    video_sync_time = new_video_sync_time;
    // Update the widgets ...
    $("#controls").controls             ("option", "video_sync_time", video_sync_time);
    $("#mp-movies").movies              ("option", "video_sync_time", video_sync_time);
    $("#waveform-viewer").trajectories  ("option", "video_sync_time", video_sync_time);
    $("#mp-mds-scatterplot").scatterplot("option", "video_sync_time", video_sync_time);
    // If video_sync is on, set diagram_time to same as video_sync_time and let widgets know new value
    if(video_sync)
    {
      diagram_time = new_video_sync_time;
      $("#controls").controls             ("option", "diagram_time", diagram_time);
      $("#mp-movies").movies              ("option", "diagram_time", diagram_time);
      $("#waveform-viewer").trajectories  ("option", "diagram_time", diagram_time);
      $("#mp-mds-scatterplot").scatterplot("option", "diagram_time", diagram_time);
    }

    clearTimeout(video_sync_time_changed_throttle_timeout);
    video_sync_time_changed_throttle_timeout = setTimeout(bookmark_video_sync_time_and_diagram_time, video_sync_time_changed_throttle_ms)
  }
}

function bookmark_video_sync_time_and_diagram_time()
{
  bookmarker.updateState({"diagram_time" : diagram_time, "video_sync_time" : video_sync_time});
}

function current_video_changed(new_current_video)
{
  // Make sure new value is different before continuing
  if(new_current_video != current_video)
  {
    current_video = new_current_video;
    // Update the widgets ...
    $("#controls").controls             ("option", "current_video", current_video);
    $("#mp-movies").movies              ("option", "current_video", current_video);
    $("#waveform-viewer").trajectories  ("option", "current_video", current_video);
    $("#mp-mds-scatterplot").scatterplot("option", "current_video", current_video);

    bookmarker.updateState({"current_video" : current_video});
  }
}

function playing_videos_changed(new_playing_videos)
{
  // Make sure arrays are different before continuing
  if(!_.isEmpty(_.xor(new_playing_videos, playing_videos)))
  {
    playing_videos = new_playing_videos;
    // Update the widgets ...
    $("#controls").controls             ("option", "playing_videos", playing_videos.slice());
    $("#mp-movies").movies              ("option", "playing_videos", playing_videos.slice());
    $("#waveform-viewer").trajectories  ("option", "playing_videos", playing_videos.slice());
    $("#mp-mds-scatterplot").scatterplot("option", "playing_videos", playing_videos.slice());

    // Bookmarking playing_videos even though we never restore this state from bookmark since we want to start with all videos paused.
    // Perhaps we will need this in the future.
    bookmarker.updateState({"playing_videos" : playing_videos});
  }
}

function video_time_changed(video_time)
{
  video_times[video_time.id] = video_time.time;
  bookmarker.updateState({"video_times" : video_times});
}

function jump_to_simulation(index)
{
  index = parseInt(index);
  // Alerts the table
  $("#mp-datapoints-table").table("option", "jump_to_simulation", index);
  // Alerts the scatterplot
  $("#mp-mds-scatterplot").scatterplot("option", "current_video", index);
  // Alerts the waveform viewer
  $("#waveform-viewer").trajectories  ("option", "current_video", index);
}

function variable_sort_changed(variable, order)
{
  sort_variable = variable;
  sort_order = order;
  bookmarker.updateState( {"sort_variable" : variable, "sort_order" : order} );
}

function update_table_color() {
  $("#mp-datapoints-table").table("option", "color_scale", color_scale);
}

function update_movies_color() {
    $("#mp-movies").css({
        "background-color" : $("#color-switcher").colorswitcher("get_background", undefined).toString(),
    });

    var color_options = {
        color_array: color_array,
        color_scale: color_scale,
    };

    $("#mp-movies").movies("option", "color-options", color_options);
}

function update_coloring_var(newVar) {
    color_variable = newVar;

    $("#controls").controls             ("option", "color_variable",    color_variable);
    $("#mp-mds-scatterplot").scatterplot("option", "color-var-options", color_variable);
    $("#mp-movies").movies              ("option", "color-var-options", color_variable);
    $("#waveform-viewer").trajectories  ("option", "color-var-options", color_variable);
    $("#mp-datapoints-table").table     ("option", "color_variable",    color_variable);

    bookmarker.updateState({"variable-selection" : color_variable});

    //Will probably need to pass new min and max to color-switcher, so you can set the new color scale
}

function update_scatterplot_color() {

  $("#mp-mds-pane").css({
      "background-color" : $("#color-switcher").colorswitcher("get_background", undefined).toString(),
  });

  var color_options =
  {
    color_array: color_array,
    color_scale: color_scale,
    null_color: null_color,
  };

  $("#mp-mds-scatterplot").scatterplot("option", "color-options", color_options);
}

function update_waveform_color() {

  $("#mp-trajectories").css({
    "background-color" : $("#color-switcher").colorswitcher("get_background", undefined).toString(),
    });
  $("#waveform-viewer rect.selectionMask").css({
    "fill"             : $("#color-switcher").colorswitcher("get_background", undefined).toString(),
    "fill-opacity"     : $("#color-switcher").colorswitcher("get_opacity", undefined),
    });

  foreground_color = $("#color-switcher").colorswitcher("get_foreground");
  hover_background_color = $("#color-switcher").colorswitcher("get_background_2");
  null_color = $("#color-switcher").colorswitcher("get_null_color");

  var color_options =
  {
     color_array: color_array,
     color_scale: color_scale,
     foreground_color: foreground_color,
     hover_background_color: hover_background_color,
     null_color: null_color,
  };

  $("#waveform-viewer").trajectories("option", "color-options", color_options);

}

function update_colormap(new_colormap)
{
  colormap = new_colormap;
  bookmarker.updateState({"colormap" : colormap});
  $.ajax(
  {
    type : "POST",
    url : api_root + "events/models/" + model._id + "/select/colormap/" + colormap
  });
}

function update_current_colorscale(table_data, new_color_variable)
{
  //If you're changing the variable to color by
  if(table_data != null || new_color_variable != null)
  {
      var new_data = table_data[0].data[new_color_variable];

      max_value = Math.max.apply(null, new_data);
      min_value = Math.min.apply(null, new_data);
  }

  color_scale = $("#color-switcher").colorswitcher("get_color_scale", undefined, min_value, max_value);
  color_array = $("#color-switcher").colorswitcher("get_gradient_data", undefined);

  update_movies_color();
  update_waveform_color();
  update_scatterplot_color();
  update_table_color();
}


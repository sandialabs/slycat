// This function contains code for displaying the scatter plot
// for dial-a-cluster.  Code includes setup, and resizing the 
// jQuery UI layout pane and buttons for selection/zoom and coloring.
//
// NOTE: This routine assume the coordinates returned by MDS always
// lie within a box [0,1]^3.
//
// S. Martin
// 1/27/2015

import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import request from "./dac-request-data.js";
import selections from "./dac-manage-selections.js";
import metadata_table from "./dac-table.js";
import plots from "./dac-plots.js";
import d3 from "d3";
import URI from "urijs";

// public functions will be returned via the module variable
var module = {};

// private variable containing MDS coordinates (2 dimensional)
var mds_coords = [];

// only use selected subset (binary mask, 0 = not in subset, 1 = in subset)
var mds_subset = [];

// current coordinates for subset view
var subset_center = [];

// model ID
var mid = URI(window.location).segment(-1);

// difference button fisher ordering and current position
var fisher_order = [];
var fisher_pos = null;

// has the difference button ever been used?
var diff_button_used = false;
var diff_desired_state = null;

// d3 variables for drawing MDS coords
var scatter_plot = null;
var scatter_points = null;
var x_scale = null;
var y_scale = null;
var color_scale = null;

// maximum number of points to animate
var max_points_animate = null;

// scatter border size
var scatter_border = null;

// colors to use for selections
var point_color = null;
var point_size = null;
var sel_color = null;
var focus_color = null;
var no_sel_color = null;

// max number of selections
var max_num_sel = null;

// user preferences for circles or squares
var scatter_plot_type = null;

// keep track of color for point in focus
var focus_point_color = null;

// outline width for selections
var outline_no_sel = null;
var outline_sel = null;

// colors to use for scaling
var color_by_low = null;
var color_by_high = null;
var colormap = null;

// color by selection menu (default is "Do Not Color")
var curr_color_by_sel = -1;
var curr_color_by_col = [];
var color_by_cols = [-1];
var color_by_names = ["Do Not Color"];
var color_by_type = [];
var max_color_by_name_length = null;

// variables to use in analysis
var var_include_columns = null;

// show/hide filtered points (mask)
var filtered_selection = [];

// filter button state
var filter_button_on = false;

// keep track of number of metadata columns (not counting editable columns)
var num_metadata_cols = null;

// model origin data
var num_origin_col = null;
var model_origin = {};

// initial setup: read in MDS coordinates & plot
module.setup = function (MAX_POINTS_ANIMATE, SCATTER_BORDER,
	POINT_COLOR, POINT_SIZE, SCATTER_PLOT_TYPE,
	NO_SEL_COLOR, SELECTION_COLOR, SEL_FOCUS_COLOR,
	COLOR_BY_LOW, COLOR_BY_HIGH, COLORMAP,
	MAX_COLOR_NAME, OUTLINE_NO_SEL, OUTLINE_SEL,
	datapoints_meta, meta_include_columns, VAR_INCLUDE_COLUMNS,
	init_alpha_values, init_color_by_sel, init_zoom_extent,
	init_subset_center, init_subset_flag, init_fisher_order,
	init_fisher_pos, init_diff_desired_state, init_filter_button,
	init_filter_mask, editable_columns, MODEL_ORIGIN)
{

	// set the maximum number of points to animate, maximum zoom factor
	max_points_animate = MAX_POINTS_ANIMATE;

	// set scatter border size
	scatter_border = SCATTER_BORDER;

	// set the colors to use for selections
	point_color = POINT_COLOR;
	focus_point_color = POINT_COLOR;
	point_size = POINT_SIZE;
	no_sel_color = NO_SEL_COLOR;
	sel_color = SELECTION_COLOR;
	focus_color = SEL_FOCUS_COLOR;
	scatter_plot_type = SCATTER_PLOT_TYPE;

    // maximum number of selections
    max_num_sel = sel_color.length;

	// set colors for scaling
	color_by_low = COLOR_BY_LOW;
	color_by_high = COLOR_BY_HIGH;
	colormap = COLORMAP;

	// set maximum color by name length
	max_color_by_name_length = MAX_COLOR_NAME;

	// set selection width
	outline_no_sel = OUTLINE_NO_SEL;
	outline_sel = OUTLINE_SEL;

	// include columns (variables and metadata)
	var_include_columns = VAR_INCLUDE_COLUMNS;

    // save model origin data
    model_origin["data"] = [MODEL_ORIGIN];

    // set selection type button
    var dac_sel_button_ids = ["#dac-scatter-button-subset",
                              "#dac-scatter-button-zoom",
                              "#dac-scatter-button-sel-1",
                              "#dac-scatter-button-sel-2",
                              "#dac-scatter-button-sel-3"];
    $(dac_sel_button_ids[selections.sel_type()+1]).addClass("active");

	// set up selection button colors
	$("#dac-scatter-button-sel-1").css("color", sel_color[0]);
	$("#dac-scatter-button-sel-2").css("color", sel_color[1]);
	$("#dac-scatter-button-sel-3").css("color", sel_color[2]);

	// bind selection/zoom buttons to callback operations
	$("#dac-scatter-button-sel-1").on("click",
		function() { selections.set_sel_type(1); module.draw(); });
	$("#dac-scatter-button-sel-2").on("click",
		function() { selections.set_sel_type(2); module.draw(); });
	$("#dac-scatter-button-sel-3").on("click",
		function() { selections.set_sel_type(3); module.draw(); });
	$("#dac-scatter-button-subset").on("click",
		function() { selections.set_sel_type(-1); module.draw(); })
	$("#dac-scatter-button-zoom").on("click",
		function() { selections.set_sel_type(0); module.draw(); });

    // set initial subset button indicator
    if (init_subset_flag) {
        $("#dac-scatter-button-subset").addClass("text-warning");
    }

	// bind difference buttons to callback
	$("#dac-previous-three-button").on("click", previous_three);
	$("#dac-scatter-diff-button").on("click", diff_button);
	$("#dac-next-three-button").on("click", next_three);

    // bind filter button to callback
    $("#dac-filter-plots-button").on("click", filter_plots);

    // initialize filter button state
    filter_button_on = init_filter_button;
    if (filter_button_on) {
        $("#dac-filter-plots-button").addClass("bg-warning");
    }

    // initialize filter mask
    filtered_selection = init_filter_mask;

	// set up difference button state
	fisher_order = init_fisher_order;
	fisher_pos = init_fisher_pos;
	if (fisher_order.length > 0) {
	    diff_button_used = true;
	}
	diff_desired_state = init_diff_desired_state;

	// update difference buttons
	if (diff_button_used) {
	    set_diff_arrows();
	    module.toggle_difference(diff_desired_state);
	}

    // set up color by menu

	// look for columns with numbers/strings for color by menu
	num_metadata_cols = datapoints_meta["column-count"];
	for (var i = 0; i < num_metadata_cols; i++)
	{

		// we accept number and string data, only for included columns
		if ((meta_include_columns.indexOf(i) != -1) &&
			((datapoints_meta["column-types"][i] == "float64") ||
			(datapoints_meta["column-types"][i] == "string"))) {
			color_by_type.push(datapoints_meta["column-types"][i]);
			color_by_cols.push(i);

			// make sure names aren't too long (if they are then truncate)
			var name_i = truncate_color_by_name(datapoints_meta["column-names"][i]);
			color_by_names.push(name_i);
		};

	};

    // add origin column, if it exists
    num_origin_col = 0;
    if (MODEL_ORIGIN.length > 0) {

        // add to list in drop down
        color_by_type.push("string");
        color_by_cols.push(num_metadata_cols);

        // truncate origin column name if too long
        color_by_names.push(truncate_color_by_name("From Model"));

        // adjust number of metadata columns to accommodate model origin
        num_origin_col = 1;
    }

	// add editable columns to menu as well
	for (var i = 0; i < editable_columns["attributes"].length; i++) {

	    // only color categorical columns
	    if (editable_columns["attributes"][i]["type"] == "categorical") {

            // add to list in drop down
	        color_by_type.push("string");
	        color_by_cols.push(num_metadata_cols + num_origin_col + i);

	        // make sure names aren't too long (if they are then truncate)
			var name_i = truncate_color_by_name(editable_columns["attributes"][i]["name"]);
	        color_by_names.push(name_i);
	    }
	}

    // check init color by value (make sure it fits on list)
    if (color_by_cols.indexOf(init_color_by_sel) == -1) {
        init_color_by_sel = -1;
    }

	// populate pull down menu
	display_pull_down.bind($("#dac-scatter-select"))(init_color_by_sel);

	$.when (request.get_array("dac-mds-coords", 0, mid)).then(
		function (mds_data)
		{

			// input data into model
			mds_coords = mds_data;

            // set center to bookmarked value, otherwise center of screen
            subset_center = init_subset_center;

            // set subset to full mds_coord set, unless subset is available
            mds_subset = selections.get_subset();

			// call server to compute new coords (in case of bookmarks)
            client.post_sensitive_model_command(
            {
                mid: mid,
                type: "DAC",
                command: "update_mds_coords",
                parameters: {alpha: init_alpha_values,
                             subset: selections.get_subset(),
                             subset_center: subset_center,
                             current_coords: mds_coords,
                             include_columns: var_include_columns},
                success: function (result)
                    {
                        // record new values in mds_coords
                        mds_coords = JSON.parse(result)["mds_coords"];

                        // init shift key detection
                        d3.select("body").on("keydown.brush", key_flip)
                                         .on("keyup.brush", key_flip);

                        // svg scatter plot
                        scatter_plot = d3.select("#dac-mds-scatterplot");

                        // d3 scales
                        x_scale = d3.scale.linear()
                            .domain([0 - scatter_border, 1 + scatter_border]);
                        y_scale = d3.scale.linear()
                            .domain([0 - scatter_border, 1 + scatter_border]);

                        // check for previous zooming
                        if (init_zoom_extent != null) {
                            x_scale.domain([init_zoom_extent[0][0], init_zoom_extent[1][0]]);
                            y_scale.domain([init_zoom_extent[0][1], init_zoom_extent[1][1]]);

                            // change zoom button to yellow
                            $("#dac-scatter-button-zoom").addClass("text-warning");
                        }

                        // default color scale
                        color_scale = d3.scale.linear()
                            .range([color_by_low, color_by_high])
                            .interpolate(d3.interpolateRgb);

                        // finish with color plot
                        color_plot(init_color_by_sel);

                    },
                error: function ()
                    {
                        dialog.ajax_error ('Server failure: could not load bookmarked MDS coords.')("","","");
                    }

            });
		},
		function ()
		{
			dialog.ajax_error ("Server failure: could not load MDS coords.")("","","");
		}
	);

}

// truncate name to max color by name
function truncate_color_by_name (name_i) {

    if (name_i.length > max_color_by_name_length) {
        name_i = name_i.substring(0,max_color_by_name_length) + " ...";
    }

    return name_i;
}

// toggle shift key flag
function key_flip() {
	selections.key_flip(d3.event.shiftKey, d3.event.ctrlKey);
}

// draw the MDS scatter plot
module.draw = function ()
{

	// draw svg to size of container
	var width = $("#dac-mds-pane").width();
	var height = $("#dac-mds-pane").height();

	// set correct viewing window
	x_scale.range([0,width]);
	y_scale.range([height,0]);

	// re-size scatter plot
	scatter_plot.attr("width", width)
		.attr("height", height);

	// brush has to be under points
	sel_zoom_buttons();
	draw_points();

}

// entirely redraws points (including selection)
function draw_points () {

	// draw points (either circles or squares)
	if (scatter_plot_type == "circle") {
		draw_circles();
	} else {
		draw_squares();
	}

}

// d3 function to set outline color according to selection
var set_outline_color = function (d,i)
{

    // default is point_color
    var outline_color = no_sel_color;

    // color point according to selection
    for (var j = 0; j < max_num_sel; j++) {
        if (selections.in_sel_x(i,j+1) != -1) {
            outline_color = sel_color[j]
        }
    }

    return outline_color;
}

// d3 function to set outline width according to selection
var set_outline_width = function (d,i)
{
    // default stroke-width is 1
    var outline_width = outline_no_sel;

    // selected width is 2
    if (selections.in_sel(i)) {
        outline_width = outline_sel;
    }

    return outline_width;
}

// d3 function to set point size for selections
var set_point_size = function (d,i)
{
    return compute_point_size (selections.in_sel(i));
}

// function to determine point size
// selected is true if point is selected
function compute_point_size (selected)
{

    // default point size
    var new_point_size = point_size;

    // different size for circles and squares
    if (scatter_plot_type != 'circle') {
        new_point_size = point_size * 2;
    };

    // for selected points, everything is larger
    if (selected) {
        new_point_size = new_point_size * 1.5;
    }

    return new_point_size;
}

// d3 function to label a class
var filtered_selected_class = function (d,i)
{
    // default is non filtered
    var filtered = "dac-not-filtered";
    if (filtered_selection[i] == 1) {
        filtered = "dac-filtered";
    }

    // selected points are also marked
    var selected = "dac-not-selected";
    if (selections.in_sel(i)) {
        selected = "dac-selected";
    }

    return filtered + " " + selected;
}

// entirely redraws points (including selection, using circles)
function draw_circles ()
{

	// erase any old points
	scatter_plot.selectAll("circle").remove();

	// remove old focus point
	scatter_plot.selectAll(".focus").remove();

	// input new points
	scatter_points = scatter_plot.selectAll("circle")
		.data(mds_coords, function(d) { return d[2]; })
		.enter()
		.append("circle")
		.attr("class", filtered_selected_class);

	// make sure they are colored according to selections
	scatter_points.attr("stroke", set_outline_color);

	// selections get thicker outline
	scatter_points.attr("stroke-width", set_outline_width);

	// fill in points
	if (curr_color_by_col.length > 0) {
		scatter_points.attr("fill", function(d,i) {
			return color_scale(curr_color_by_col[i]);
		});
	} else {
		scatter_points.attr("fill", point_color);
	}

	// put in correct positions
	scatter_points.attr("cx", function(d) {
			return x_scale(d[0])
		})
		.attr("cy", function(d) {
			return y_scale(d[1])
		})
		.attr("r", set_point_size)
		.on("mousedown", sel_individual);

    // hide unfiltered points
    scatter_plot.selectAll(".dac-not-filtered").style("opacity", 0.0);

    // raise selected points to foreground
    scatter_plot.selectAll(".dac-selected").each(function() {
            this.parentNode.appendChild(this); });

    // raise filtered points to foreground
    scatter_plot.selectAll(".dac-filtered").each(function() {
            this.parentNode.appendChild(this); });

	// draw new focus circle, if needed
	if (selections.focus() != null) {

	    // check that this is not filtered
	    if (filtered_selection[selections.focus()] == 1) {

            // are we in color by mode?
            if (curr_color_by_col.length > 0) {
                // yes -- get current point color
                focus_point_color = color_scale(curr_color_by_col[selections.focus()]);
            } else {
                // no -- revert to standard point color
                focus_point_color = point_color;
            }

            // get focus data
            scatter_plot.selectAll(".focus")
                        .data([mds_coords[selections.focus()]])
                        .enter()
                        .append("circle")
                        .attr("class", "focus")
                        .attr("stroke", focus_color)
                        .attr("stroke-width", outline_sel)
                        .attr("fill", focus_point_color)
                        .attr("cx", function(d) {
                            return x_scale(d[0])
                        })
                        .attr("cy", function(d) {
                            return y_scale(d[1])
                        })
                        .attr("r", point_size * 1.5)
                        .on("mousedown", defocus);

	    }
	}
}

// entirely redraws points (including selection)
function draw_squares ()
{

	// erase any old points
	scatter_plot.selectAll(".square").remove();

	// remove old focus point
	scatter_plot.selectAll(".focus").remove();

	// input new points
	scatter_points = scatter_plot.selectAll(".square")
		.data(mds_coords, function(d) { return d[2]; })
		.enter()
		.append("rect")
		.attr("class", filtered_selected_class)
		.classed("square", true)

	// make sure they are colored according to selections
	scatter_points.attr("stroke", set_outline_color);

	// selections get thicker outline
	scatter_points.attr("stroke-width", set_outline_width);

	// fill in points
	if (curr_color_by_col.length > 0) {
		scatter_points.attr("fill", function(d,i) {
			return color_scale(curr_color_by_col[i]);
		});
	} else {
		scatter_points.attr("fill", point_color);
	}

	// put in correct positions
	scatter_points.attr("x", function(d) {
			return x_scale(d[0]) - point_size;
		})
		.attr("y", function(d) {
			return y_scale(d[1]) - point_size;
		})
		.attr("width", set_point_size)
		.attr("height", set_point_size)
		.on("mousedown", sel_individual);

    // hide unfiltered points
    scatter_plot.selectAll(".dac-not-filtered").style("opacity", 0.0);

    // raise selected points to foreground
    scatter_plot.selectAll(".dac-selected").each(function() {
            this.parentNode.appendChild(this); });

    // raise filtered points to foreground
    scatter_plot.selectAll(".dac-filtered").each(function() {
            this.parentNode.appendChild(this); });

	// draw new focus rect, if needed
	if (selections.focus() != null) {

	    // check that this is not filtered
	    if (filtered_selection[selections.focus()] == 1) {


            // are we in color by mode?
            if (curr_color_by_col.length > 0) {
                // yes -- get current point color
                focus_point_color = color_scale(curr_color_by_col[selections.focus()]);
            } else {
                // no -- revert to standard point color
                focus_point_color = point_color;
            }

            // get focus data
            scatter_plot.selectAll(".focus")
                        .data([mds_coords[selections.focus()]])
                        .enter()
                        .append("rect")
                        .attr("class", "focus")
                        .attr("stroke", focus_color)
                        .attr("stroke-width", outline_sel)
                        .attr("fill", focus_point_color)
                        .attr("x", function(d) {
                            return x_scale(d[0]) - point_size;
                        })
                        .attr("y", function(d) {
                            return y_scale(d[1]) - point_size;
                        })
                        .attr("width", point_size * 3)
                        .attr("height", point_size * 3)
                        .on("mousedown", defocus);

	    }
	}
}

// animate if MDS coordinates have changed, or from zoom
var animate = function ()
{
	// circles and square have to be treated differently
	if (scatter_plot_type == "circle") {
		animate_circles();
	} else {
		animate_squares();
	}
}

// animate if MDS coordinates have changed, or for zoom (private) for circles
var animate_circles = function ()
{
	// assume that only data has changed, scale should still be OK
	scatter_points.transition()
		.attr("cx", function(d) {
		return x_scale(d[0])
		})
		.attr("cy", function(d) {
			return y_scale(d[1])
		});

	// move focus point
	scatter_plot.selectAll(".focus")
				.transition()
				.attr("cx", function(d) {
					return x_scale(d[0])
				})
				.attr("cy", function(d) {
					return y_scale(d[1])
				});
}

// animate if MDS coordinates have changed, or for zoom (private) for squares
var animate_squares = function ()
{
	// assume that only data has changed, scale should still be OK
	scatter_points.transition()
		.attr("x", function(d) {
		return x_scale(d[0]) - point_size;
		})
		.attr("y", function(d) {
			return y_scale(d[1]) - point_size;
		});

	// move focus point
	scatter_plot.selectAll(".focus")
				.transition()
				.attr("x", function(d) {
					return x_scale(d[0]) - point_size;
				})
				.attr("y", function(d) {
					return y_scale(d[1]) - point_size;
				});
}

// updates the MDS coords given new alpha values and/or subset
module.update = function (alpha_values)
{

	// call server to compute new coords
	client.post_sensitive_model_command(
	{
		mid: mid,
		type: "DAC",
		command: "update_mds_coords",
		parameters: {alpha: alpha_values,
					 subset: selections.get_subset(),
					 subset_center: subset_center,
					 current_coords: mds_coords,
					 include_columns: var_include_columns},
		success: function (result)
			{
				// record new values in mds_coords
				mds_coords = JSON.parse(result)["mds_coords"];

				// update the data in d3 (using either circes or squares)
				scatter_plot.selectAll(scatter_plot_type)
					.data(mds_coords, function(d) { return d[2]; });

				// update the focus point
				if (selections.focus() != null) {
					scatter_plot.selectAll(".focus")
								.data([mds_coords[selections.focus()]]);
				}

				// re-draw display (animate if small number of points)
				if (mds_coords.length > max_points_animate) {
					module.draw();
				} else {
					animate();
				}
			},
		error: function ()
			{
				dialog.ajax_error ('Server failure: could not update MDS coords.')("","","");
			}

	});
}

// previous three button
var previous_three = function ()
{

	// compute previous position
	var prev_pos = fisher_pos - 3;

	// check that new position exists and fire event
	if ((prev_pos < fisher_order.length) && (prev_pos >= 0)) {

		// fire new difference event
		var differenceEvent = new CustomEvent("DACDifferenceComputed", { detail: {
										 fisher_order: fisher_order,
										 fisher_pos: prev_pos,
										 diff_desired_state: diff_desired_state} });
		document.body.dispatchEvent(differenceEvent);

		// update position in list
		fisher_pos = prev_pos;

		// set arrow buttons
		set_diff_arrows();

	}

}

// difference button
var diff_button = function()
{

	// inactivate button
	$("#dac-scatter-diff-button").prop("active", false);

    // make sure there are at least two selections
    // with at least two points per selection
    var num_valid_sel = 0;
    for (var i = 0; i < max_num_sel; i++) {
        if (selections.len_sel(i+1) > 1) {
            num_valid_sel = num_valid_sel + 1;
        }
    }

	// make sure there are two selections
	if (num_valid_sel < 2) {

		dialog.ajax_error
		('Please make sure at least two selections have two or more points ' +
		 'each before computing the difference.')
		("","","");
		return;

	}

	// put selections into array
	var sel = [];
    for (var i = 0; i < max_num_sel; i++) {
        sel.push(selections.sel(i+1));
    }

    // call server to compute ordering using Fisher's multi-class discriminant
	client.post_sensitive_model_command(
	{
		mid: mid,
		type: "DAC",
		command: "compute_fisher",
		parameters: {selection: sel,
					 include_columns: var_include_columns},
		success: function (result)
			{

				// compute Fisher's discriminant for each time series separately
				var fisher_disc = JSON.parse(result)["fisher_disc"];

				// sort Fisher's discriminant values and adjust plot order
				var fisher_inds = sort_indices(fisher_disc);

				// save indices for previous/next three buttons
				fisher_order = fisher_inds;

				// save current position for previous/next three buttons
				fisher_pos = 0;

				// set arrow buttons
				set_diff_arrows();

				// difference button has been used (show as synced)
				module.toggle_difference(true);

				// fire difference event
				var differenceEvent = new CustomEvent("DACDifferenceComputed", { detail: {
										 fisher_order: fisher_order,
										 fisher_pos: fisher_pos,
										 diff_desired_state: true} });
				document.body.dispatchEvent(differenceEvent);

			},
		error: function ()
			{
				dialog.ajax_error("Server failure: could not compute Fisher's discriminant.")("","","");
			}
	});

}

// next three button
var next_three = function ()
{

	// compute next position
	var next_pos = fisher_pos + 3;

	// check that next position exists and fire event
	if (next_pos < fisher_order.length) {

		// fire new difference event
		var differenceEvent = new CustomEvent("DACDifferenceComputed", { detail: {
										 fisher_order: fisher_order,
										 fisher_pos: next_pos,
										 diff_desired_state: diff_desired_state} });
		document.body.dispatchEvent(differenceEvent);

		// update position in list
		fisher_pos = next_pos;

        // update arrow buttons
        set_diff_arrows();
	}
}

// set arrows according to position and order
var set_diff_arrows = function ()
{

    // set forward arrow
    if (fisher_pos + 3 >= fisher_order.length) {

		// disable next button
		//$("#dac-next-three-button").addClass("disabled");
		$("#dac-next-three-button").prop("disabled", true);

    } else {

        // enable next button
        //$("#dac-next-three-button").removeClass("disabled");
        $("#dac-next-three-button").prop("disabled", false);

    }

    // set back arrow
    if (fisher_pos - 3 < 0) {

        // disable previous button
        //$("#dac-previous-three-button").addClass("disabled");
		$("#dac-previous-three-button").prop("disabled", true);

    } else {

        //$("#dac-previous-three-button").removeClass("disabled");
		$("#dac-previous-three-button").prop("disabled", false);


    }

}

// toggle difference button indicator to show desired state
// true = synced, false = out of sync
module.toggle_difference = function (desired_state)
{

    diff_desired_state = desired_state;

	if (desired_state == true) {

        // set difference button color to green
        $("#dac-scatter-diff-button").removeClass("bg-warning");

		// difference button has been used
		diff_button_used = true;

	} else if (diff_button_used == true) {

        // set difference button color to yellow
        $("#dac-scatter-diff-button").addClass("bg-warning");

	}
}

// routine to filter scatter plot using table filters
var filter_plots = function ()
{

    // are we filtering of unfiltering?
    if (filter_button_on) {

        // restore unfiltered visualization
        for (var i = 0; i < filtered_selection.length; i++) {
            filtered_selection[i] = 1;
        }
        module.draw();

        // update filter mask and filter button state
        selections.update_filter(filtered_selection, !filter_button_on);

        // unfilter plots
        plots.draw();

    } else {

        // get filtered selection from table
        var filtered_selection_list = metadata_table.get_filtered_selection();

        // change list to mask
        for (var i = 0; i < filtered_selection.length; i++) {
            filtered_selection[i] = 0;
        }
        for (var i = 0; i < filtered_selection_list.length; i++) {
            filtered_selection[filtered_selection_list[i]] = 1;
        }

        // filter scatter plot
        module.draw();

        // update filter mask and filter button state
        selections.update_filter(filtered_selection, !filter_button_on);

        // filter plots
        plots.draw();

    }

    // button toggles between filtered/unfiltered state
    if (filter_button_on) {
        filter_button_on = false;
        $("#dac-filter-plots-button").removeClass("bg-warning");
    } else {
        filter_button_on = true;
        $("#dac-filter-plots-button").addClass("bg-warning");
    }

    // bookmark filter state
    var filterEvent = new CustomEvent("DACFilterButtonState",
                             { detail: {button_state: filter_button_on,
                                        filter_mask: filtered_selection} });
    document.body.dispatchEvent(filterEvent);

}

// turn off filter button (independent of actual filters)
module.turn_off_filter_button = function ()
{

    // restore unfiltered visualization
    for (var i = 0; i < filtered_selection.length; i++) {
        filtered_selection[i] = 1;
    }
    module.draw();

    // turn off button
    filter_button_on = false;
    $("#dac-filter-plots-button").removeClass("bg-warning");

    // update filter mask and filter button state
    selections.update_filter(filtered_selection, filter_button_on);

    // unfilter plots
    plots.draw();

    // bookmark filter state
    var filterEvent = new CustomEvent("DACFilterButtonState",
                             { detail: {button_state: filter_button_on,
                                        filter_mask: filtered_selection} });
    document.body.dispatchEvent(filterEvent);

}

// routine to return sort array and return indices
// (return only subset of included columns)
function sort_indices(arr)
{

	// add indices to array
	var arr_with_index = [];
	for (var i in arr) {
		arr_with_index.push([arr[i], parseInt(i)]);
	}

	// now sort new array by "key", carrying along index
	arr_with_index.sort(function(left, right) {
		return left[0] > right[0] ? -1 : 1;
	});

	// isolate indices (keeping only if an included column)
	var indices = [];
	for (var j in arr_with_index) {

		var arr_ind_j = arr_with_index[j][1];
		if (var_include_columns.indexOf(parseInt(arr_ind_j)) != -1) {
			indices.push(arr_ind_j);
		}
	}

	// return only indices
	return indices;

}

var display_pull_down = function(init_color_by_sel)
{

	this.empty();

	// pull down contains names from color_by_names
	for (var i = 0; i < color_by_cols.length; i++)
	{
		// generate the pull down (select) in HTML
		var select_item = $('<option value="' + color_by_cols[i] +'">').appendTo(this);
		select_item.text(color_by_names[i]);
	}

	// set default option
	this.val(init_color_by_sel)
	curr_color_by_sel = init_color_by_sel;

	// define action for changing menu
	this.change(function()
		{
			// get column to color by
			var select_col = Number(this.value);
			curr_color_by_sel = select_col;

			// de-focus
			this.blur();

            // set up color plot
            color_plot(select_col);

            // fire new colorby event
		    var colorbyEvent = new CustomEvent("DACColorByChanged",
											  {detail: curr_color_by_sel});
		    document.body.dispatchEvent(colorbyEvent);

		});

}

// set up coloring for scatter plot
function color_plot (select_col)
{

    // no coloring
    if (select_col == -1) {

        // revert to no color & re-draw
        curr_color_by_col = [];
        module.draw();

    // editable column coloring
    } else if (select_col >= num_metadata_cols + num_origin_col) {

        // load editable columns
        client.get_model_parameter({
            mid: mid,
            aid: "dac-editable-columns",
            success: function (data)
            {
                color_plot_draw (data, select_col - num_metadata_cols - num_origin_col);
            },
            error: function () {

                // notify user that editable columns exist, but could not be loaded
                dialog.ajax_error('Server error: could not load editable column data.')
                ("","","")

                // revert to no color & re-draw
                curr_color_by_col = [];
                module.draw();

            }
        });

    // "From Model" origin column coloring
    } else if (select_col == num_metadata_cols) {

        color_plot_draw (model_origin, 0);

    // actual meta data coloring
    } else {

        // request new data from server
        $.when(request.get_table("dac-datapoints-meta", mid)).then(
            function (data)
            {
                color_plot_draw(data, select_col);
            },
            function ()
            {
                dialog.ajax_error ('Server failure: could not load color by data column.')("","","");

                // revert to no color & re-draw
                curr_color_by_col = [];
                module.draw();
            }
        );
    };

}

// re-color only if selected column is currently being displayed
module.recolor_plot = function (col)
{

    // check if column to use for coloring is currently selected
    if (curr_color_by_sel == col) {
        color_plot(col);
    }
}

// actual color plotting
function color_plot_draw(data, select_col)
{

    // check for string data
    if (color_by_type[color_by_cols.indexOf(select_col) - 1] == "string") {

        // use alphabetical order by number to color

        // get string data
        var color_by_string_data = data["data"][select_col];

        // get unique sorted string data
        var unique_sorted_string_data = Array.from(new Set(color_by_string_data)).sort();

        // get indices or original string data in the unique sorted string data
        curr_color_by_col = [];
        for (var i=0; i < color_by_string_data.length; i++) {
            curr_color_by_col.push(unique_sorted_string_data.indexOf(color_by_string_data[i]));
        }

    } else {

        // get selected column from data base (number data)
        curr_color_by_col = data["data"][select_col];

    }

    // set colormap if present
    if (colormap == null) {

        // revert to default color map
        color_scale = d3.scale.linear()
            .range([color_by_low, color_by_high])
            .interpolate(d3.interpolateRgb);

    } else {

        // use selected color brewer scale
        color_scale = d3.scale.quantize()
            .range(colormap);

    };

    // get max and min of appropriate column in metadata table
    var max_color_val = d3.max(curr_color_by_col);
    var min_color_val = d3.min(curr_color_by_col);

    // set domain of color scale
    color_scale.domain([min_color_val, max_color_val]);

    // draw new color scale
    module.draw();

}

// set callback for selection 1,2, subset or zoom radio buttons
var sel_zoom_buttons = function()
{

	// clear up any old selection/zooming
	scatter_plot.selectAll("g.brush").remove();

	// enable zoom
	if (selections.sel_type() == 0)
	{
		// set up zoom brushing
		scatter_plot.append("g")
			.attr("class", "brush")
			.call(d3.svg.brush()
				.x(x_scale)
				.y(y_scale)
				.on("brushend", zoom));

    // subset
	} else if (selections.sel_type() == -1) {

		// set up subset selection
		scatter_plot.append("g")
			.attr("class", "brush")
			.call(d3.svg.brush()
				.x(x_scale)
				.y(y_scale)
				.on("brushend", subset));

	} else {

		// otherwise enable normal selection
		scatter_plot.append("g")
			.attr("class", "brush")
			.call(d3.svg.brush()
				.x(x_scale)
				.y(y_scale)
				.on("brushstart", selections.zero_sel)
				.on("brush", sel_brush)
				.on("brushend", sel_brush_end));
	};

}

// zoom handler call back
function zoom()
{

	// find final selection indices
	var extent = d3.event.target.extent();

    // was it an empty zoom?
    if (extent[0][0] != extent[1][0] &&
        extent[0][1] != extent[1][1])
    {
        // user did zoom in on something, so reset window
        x_scale.domain([extent[0][0], extent[1][0]]);
        y_scale.domain([extent[0][1], extent[1][1]]);

        // change button color to indicate zoom state
        $("#dac-scatter-button-zoom").addClass("text-warning");

        // fire zoom changed event
        var zoomEvent = new CustomEvent("DACZoomChanged",
                                          {detail: {extent: extent, zoom: true}});
        document.body.dispatchEvent(zoomEvent);

    } else {

        // reset scale
        module.reset_zoom();

    }

    // remove gray selection box
    d3.event.target.clear();
    d3.select(this).call(d3.event.target);

    // re-draw display (animate if small number of points)
    if (mds_coords.length > max_points_animate) {
        module.draw();
    } else {
        animate();
    };

};

// get subset for future analysis
function subset ()
{

	// get subset selected
	var extent = d3.event.target.extent();

	// look for points that were selected
	var selection = [];
	for (var i = 0; i < mds_coords.length; i++)
	{
		if (extent[0][0] <= mds_coords[i][0] &&
			mds_coords[i][0] < extent[1][0] &&
			extent[0][1] <= mds_coords[i][1] &&
			mds_coords[i][1] < extent[1][1])
			{
			    // restrict to filtered selection, if applicable
			    //if (filtered_selection[i] == 1) {

                    // save current selection
                    selection.push(i);
			    //}

			};
	};

	// save current center for scaling
	var subset_extent = d3.transpose([x_scale.domain(), y_scale.domain()]);

	// compute subset center
	subset_center = [(subset_extent[0][0] + subset_extent[1][0])/2.0,
					 (subset_extent[0][1] + subset_extent[1][1])/2.0];

	// default to leave zoom alone, no subset
	var reset_zoom = false;
    var subset_flag = true;

	// separate into inclusion and exclusion based on shift key
	if (!selections.shift_key())
	{

		// if nothing is included, we reset to all data
		if (selection.length == 0) {

			for (var i = 0; i < mds_coords.length; i++) {
				mds_subset[i] = 1;

			}
			subset_flag = false;

		} else {

			// otherwise we include only the selection, and nothing else
			for (var i = 0; i < mds_coords.length; i++) {
				mds_subset[i] = 0;
				if (selection.indexOf(i) != -1) {
					mds_subset[i] = 1;
				}
            }

            // in this case, we set the center to the subset view
            subset_center = [(extent[0][0] + extent[1][0])/2.0,
                             (extent[0][1] + extent[1][1])/2.0];

            // reset zoom to full screen
            reset_zoom = true;

		}

	} else {

		// exclusions are additive
		// meaning we do not necessarily include everything else
		for (var i = 0; i < selection.length; i++) {
			mds_subset[selection[i]] = 0;
		}
	}

	// remove gray selection box
	d3.event.target.clear();
	d3.select(this).call(d3.event.target);

    // update subset button status
    if (subset_flag) {
        $("#dac-scatter-button-subset").addClass("text-warning");
    } else {
    	$("#dac-scatter-button-subset").removeClass("text-warning");
    }

	// fire subset changed event
	var subsetEvent = new CustomEvent("DACSubsetChanged", { detail: {
										 new_subset: mds_subset,
										 subset_center: subset_center,
										 subset_flag: subset_flag,
										 zoom: reset_zoom} });
	document.body.dispatchEvent(subsetEvent);
}

// reset zoom, accessible to ui controller
module.reset_zoom = function ()
{
	// reset zoom to full screen
	var extent = [[0 - scatter_border, 0 - scatter_border],
	              [1 + scatter_border, 1 + scatter_border]];
	x_scale.domain([extent[0][0], extent[1][0]]);
    y_scale.domain([extent[0][1], extent[1][1]]);

    // empty zoom -- change button color back
    $("#dac-scatter-button-zoom").removeClass("text-warning");

	// reset zoom in bookmarks
    var zoomEvent = new CustomEvent("DACZoomChanged",
                                      {detail: {extent: extent, zoom: false}});
    document.body.dispatchEvent(zoomEvent);

}

// selection brush handler call back
function sel_brush()
{

	// gray real-time selection box
	var extent = d3.event.target.extent();

	scatter_points.attr("stroke", function(d,i) {

		// default fill
		var outline_color = no_sel_color;

		// if newly selected, fill color is current selection color
		if (extent[0][0] <= d[0] && d[0] < extent[1][0]
			&& extent[0][1] <= d[1] && d[1] < extent[1][1]) {

				// use curr_sel_type to identify color
				var curr_sel_type = selections.sel_type();
				if (curr_sel_type > 0) {
				    outline_color = sel_color[curr_sel_type-1]
				}

		} else {

			// color everything else according to what's already selected
            for (var j = 0; j < max_num_sel; j++) {
                if (selections.in_sel_x(i,j+1) != -1) {
                    outline_color = sel_color[j]
                }
            }

		};

		return outline_color;
	});

	scatter_points.attr("stroke-width", function(d,i) {

		// default outline width
		var outline_width = outline_no_sel;

		// if newly selected, outline is thick
		if (extent[0][0] <= d[0] && d[0] < extent[1][0]
			&& extent[0][1] <= d[1] && d[1] < extent[1][1]) {

				outline_width = outline_sel;

		} else {

			// outline is also thick for things that were previously selected
			if (selections.in_sel(i)) {
				outline_width = outline_sel;
			};

		};

		return outline_width;
	});

    // different point sizes for circles or squares
    if (scatter_plot_type == 'circle') {
        scatter_points.attr("r", set_sel_point_size);
    } else {
        scatter_points.attr("width", set_sel_point_size);
	    scatter_points.attr("height", set_sel_point_size);
    }

}

// helper function for sel_brush_start
// to determine point size when selected
function set_sel_point_size (d,i)
{

	// gray real-time selection box
	var extent = d3.event.target.extent();

    // default point size
    var sel_point_size = compute_point_size (false);

    // if newly selected, outline is thick
    if (extent[0][0] <= d[0] && d[0] < extent[1][0]
        && extent[0][1] <= d[1] && d[1] < extent[1][1]) {

            sel_point_size = compute_point_size (true);

    } else {

        // outline is also thick for things that were previously selected
        if (selections.in_sel(i)) {

            sel_point_size = compute_point_size (true);
        };

    };

    return sel_point_size;

}

// selection brush end handler call back
function sel_brush_end()
{

	// find final selection indices
	var extent = d3.event.target.extent();

	// look for points that were selected
	// (record for table jump)
	var selection = [];
	for (var i = 0; i < mds_coords.length; i++)
	{
		if (extent[0][0] <= mds_coords[i][0] &&
			mds_coords[i][0] < extent[1][0] &&
			extent[0][1] <= mds_coords[i][1] &&
			mds_coords[i][1] < extent[1][1])
			{
                // remove if selection is invisible
                if (filtered_selection[i] == 0) {
                    selections.remove_sel(i);

                } else {
          			// otherwise, save current selection
				    selections.update_sel(i);
				    selection.push(i);
                }
			};
	};

	// remove gray selection box
	d3.event.target.clear();
	d3.select(this).call(d3.event.target);

	// fire selection change event
	var selectionEvent = new CustomEvent("DACSelectionsChanged", { detail: {
										 active_sel: selection} });
	document.body.dispatchEvent(selectionEvent);
}

// select an individual point
function sel_individual (d,i)
{
    // check if point is visible
    if (filtered_selection[i] == 1.0) {

        // check for subset exclusion
        if (selections.sel_type() == -1) {

            exclude_individual(i);

        // check for zoom mode
        } else if (selections.sel_type() == 0) {

            // potentially change focus
            selections.change_focus(i);

        // in selection mode
        } else {

            // update focus and/or selection
            selections.update_sel_focus(i);
        }
    }
}

// perform subset exclusion (assuming we're in subset mode)
function exclude_individual (i) {

	// check for shift key (to exclude a single point)
	if (selections.shift_key()) {

		// remove point from subset
		mds_subset[i] = 0;

        // subset changed, update button
        $("#dac-scatter-button-subset").addClass("text-warning");

		// fire subset changed event
		var subsetEvent = new CustomEvent("DACSubsetChanged", { detail: {
											new_subset: mds_subset,
											subset_flag: true} });
		document.body.dispatchEvent(subsetEvent);

	// otherwise it's a focus event
	} else {

		selections.change_focus(i);
	}

}

// de-select currently focused point
function defocus() {

	// check to see if we're in subset mode
	if ((selections.sel_type() == -1) && selections.shift_key()) {

		exclude_individual(selections.focus());

	} else {

		// de-focus through all panes
		var selectionEvent = new CustomEvent("DACActiveSelectionChanged", { detail: {
								 active_sel: null,
								 active: true} });
		document.body.dispatchEvent(selectionEvent);

	}

}

export default module;

// This scripts manages the time series (and other types) of plots
// on the right hand side of the dial-a-cluster interface.  You
// should first call setup to initialize private variables.
//
// S. Martin
// 2/13/2015

/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import selections from "./dac-manage-selections.js";
import d3 from "d3";
import URI from "urijs";

// public functions (or variables)
var module = {};

// private variables
// -----------------

// plot limits to ensure adequate speed/responsiveness
var max_time_points = null;
var max_num_plots = null;

// maximum plot name length to (hopefully) avoid bad plot alignment in the pane
var max_plot_name_length = null;

// model ID
var mid = URI(window.location).segment(-1);

// current plots being shown (indices & data)
var plots_selected = [];
var plots_displayed = [];
var plots_selected_time = new Array(3);	// a vector of time values for plot {0,1,2}
var plots_selected_data = new Array(3);	// a matrix of y-values for plot {0,1,2}

// zoom scale for current plots
var plots_selected_zoom_x = null; // vectors with x-min, x-max for plot {0,1,2}
var plots_selected_zoom_y = null; // vectors with y-min, y-max for plot {0,1,2}

// plot resolution indicators (-1 do not show)
var plots_selected_resolution = [];     // resolution as returned by server

// number selected indicator (0 do not show)
var plots_selected_displayed = [];
var limit_indicator_color = null;

// linked plot check box values
var link_plots = [];

// meta data for plots
var num_plots = null;
var num_included_plots = null;
var plot_name = null;
var x_axis_name = null;
var y_axis_name = null;
var plot_type = null;
var var_include_columns = null;

// colors for plots
var sel_color = [];
var focus_color = null;

// pixel adjustments for d3 time series plots
var plot_adjustments = {
	pull_down_height: null,
	padding_top: null,
	padding_bottom: null,
	padding_left: null,
	padding_right: null,
	x_label_padding: null,
	y_label_padding: null,
	label_opacity: null,
	x_tick_freq: null,
	y_tick_freq: null
};

// variables for d3 plots
var plot = [];
var x_scale = [];
var y_scale = [];
var x_axis = [];
var y_axis = [];
var x_label = [];
var y_label = [];

// mouse-over line for plots
var mouse_over_line = [];

// set up initial private variables, user interface
module.setup = function (SELECTION_1_COLOR, SELECTION_2_COLOR, SEL_FOCUS_COLOR, PLOT_ADJUSTMENTS,
						 MAX_TIME_POINTS, MAX_NUM_PLOTS, MAX_PLOT_NAME, variables_metadata, variables_data,
						 INCLUDE_VARS, init_plots_selected, init_plots_displayed, init_plots_zoom_x,
						 init_plots_zoom_y)
{

	// set ui constants
	sel_color.push(SELECTION_1_COLOR);
	sel_color.push(SELECTION_2_COLOR);
	focus_color = SEL_FOCUS_COLOR;
	plot_adjustments.pull_down_height = PLOT_ADJUSTMENTS.PLOTS_PULL_DOWN_HEIGHT;
	plot_adjustments.padding_top = PLOT_ADJUSTMENTS.PADDING_TOP;
	plot_adjustments.padding_bottom = PLOT_ADJUSTMENTS.PADDING_BOTTOM;
	plot_adjustments.padding_left = PLOT_ADJUSTMENTS.PADDING_LEFT;
	plot_adjustments.padding_right = PLOT_ADJUSTMENTS.PADDING_RIGHT;
	plot_adjustments.x_label_padding = PLOT_ADJUSTMENTS.X_LABEL_PADDING;
	plot_adjustments.y_label_padding = PLOT_ADJUSTMENTS.Y_LABEL_PADDING;
	plot_adjustments.label_opacity = PLOT_ADJUSTMENTS.LABEL_OPACITY;
	plot_adjustments.x_tick_freq = PLOT_ADJUSTMENTS.X_TICK_FREQ;
	plot_adjustments.y_tick_freq = PLOT_ADJUSTMENTS.Y_TICK_FREQ;

	// set maximum resolution for plotting
	max_time_points = MAX_TIME_POINTS;

	// set maximum number of plots (per selection)
	max_num_plots = MAX_NUM_PLOTS;

	// set maximum length of plot names
	max_plot_name_length = MAX_PLOT_NAME;

	// which variables to actually plot
	var_include_columns = INCLUDE_VARS;

	// populate pull down menus and initialize d3 plots

	// sort out the variable metadata we need
	num_plots = variables_metadata[0]["row-count"];
	num_included_plots = var_include_columns.length;
	x_axis_name = variables_data[0]["data"][1];
	y_axis_name = variables_data[0]["data"][2];
	plot_type = variables_data[0]["data"][3];

	// populate plot names
	plot_name = variables_data[0]["data"][0];

	// truncate plot names if too long
	for (var i = 0; i < num_plots; i++) {

		if (plot_name[i].length > max_plot_name_length) {
			plot_name[i] = plot_name[i].substring(0, max_plot_name_length) + " ...";
		}

	}

    // initialize selected plots to display
	plots_selected = init_plots_selected;
	plots_displayed = init_plots_displayed;

	// count number of initial plots to dipslay
	var num_init_plots = 0;
	for (var i = 0; i < Math.min(num_included_plots,3); i++ ) {
	    num_init_plots = num_init_plots + init_plots_displayed[i];
	}

	// check for bookmarks
	if (init_plots_selected.length == 0) {

        // no bookmarks detected -- display first three variables
	    for (var i = 0; i < Math.min(num_included_plots,3); i++) {
            plots_selected.push(var_include_columns[i]);
        }

    } else {

        // restore from bookmarks
        for (var i = num_init_plots; i < Math.min(num_included_plots,3); i++) {
            plots_selected[i] = var_include_columns[i];
        }
    }

    // initialize plot zooming
    plots_selected_zoom_x = init_plots_zoom_x;
    plots_selected_zoom_y = init_plots_zoom_y;

	// initialize full resolution and all displayed (do not show)
	plots_selected_displayed = [0, 0, 0];
	plots_selected_resolution = [-1, -1, -1];

	// initialize check boxes to all false
	link_plots = [0, 0, 0];

	// remove unused plot pull downs
	for (var i = num_included_plots; i < 3; i++) {
		$("#dac-select-plot-" + (i+1)).remove();
		$("#dac-link-plot-" + (i+1)).remove();
		$("#dac-plots-displayed-" + (i+1)).remove();
		$("#dac-plots-not-displayed-" + (i+1)).remove();
		$("#dac-low-resolution-plot-" + (i+1)).remove();
		$("#dac-full-resolution-plot-" + (i+1)).remove();
		$("#dac-link-label-plot-" + (i+1)).remove();
	}

	// initialize plots as d3 plots
	for (var i = 0; i < Math.min(num_included_plots,3); ++i) {

		// populate pull down menu
		display_plot_pull_down.bind($("#dac-select-plot-" + (i+1)))(i);

		// bind to link check boxes
		link_check_box.bind($("#dac-link-plot-" + (i+1)))();

		// actual plot
		plot[i] = d3.select("#dac-plot-" + (i+1));

		// d3 scale (init to empty domain)
		x_scale[i] = d3.scale.linear().domain([null,null]);
		y_scale[i] = d3.scale.linear().domain([null,null]);

		// d3 axes
		x_axis[i] = d3.svg.axis().scale(x_scale[i]).orient("bottom");
		y_axis[i] = d3.svg.axis().scale(y_scale[i]).orient("left");

		// append axes to plot
		plot[i].append("g")
			.attr("class", "x axis");
		plot[i].append("g")
			.attr("class", "y axis")
			.attr("transform", "translate(" +
				(plot_adjustments.padding_left +
				 plot_adjustments.y_label_padding) + ",0)");

		// clip rectangle for zooming
		plot[i].append("defs").append("svg:clipPath")
			.attr("id", "clip")
			.append("svg:rect")
			.attr("id", "clip-rect")
			.attr("x", plot_adjustments.padding_left
					 + plot_adjustments.y_label_padding)
			.attr("y", plot_adjustments.padding_top);

		// mouse-over line
		mouse_over_line[i] = plot[i].append("line")
									.attr("x1", plot_adjustments.padding_left +
												plot_adjustments.y_label_padding)
									.attr("y1", $("#dac-plots").height()/3 -
												plot_adjustments.pull_down_height -
												plot_adjustments.padding_bottom -
												plot_adjustments.x_label_padding)
									.attr("x2", plot_adjustments.padding_left +
												plot_adjustments.y_label_padding)
									.attr("y2", plot_adjustments.padding_top)
									.style("stroke", "black")
									.style("fill", "none")
									.style("display", "none");

		// axis labels
		x_label[i] = plot[i].append("text")
							.attr("text-anchor", "end")
		y_label[i] = plot[i].append("text")
							.attr("text-anchor", "end")
							.attr("transform", "rotate(-90)");

	}

	// set up initial size, axis labels, etc.
	update_plot_limit_indicator();
	module.draw();

    // do not show initial plots, if they are unavailable
    hide_plots(num_init_plots);

}

// populate pull down menu i in {0,1,2} with plot names
function display_plot_pull_down(i)
{
	this.empty();

	// every pull down contains the list of plot names in the same order
	for (var j = 0; j != num_plots; ++j)
	{
		// show included variables only for plots
		if (var_include_columns.indexOf(j) != -1) {

			// generate the pull down (select) in HTML
			var select_item = $('<option value="' + j +'">').appendTo(this);
			select_item.text(plot_name[j]);

		}
	}

	// set default option
	this.val(plots_selected[i])

	// define action for changing menu
	this.change(function()
		{
			// get id of changed menu and new value
			var select_id_str = this.id;
			var select_id = Number(select_id_str.split("-").pop()) - 1;
			var select_value = Number(this.value);

			// unlink plot
			$("#dac-link-plot-" + (select_id+1).toString()).prop("checked", false);
			link_plots[select_id] = 0;

			// unzoom plot
			plots_selected_zoom_x[select_id] = ["-Inf", "Inf"];
			plots_selected_zoom_y[select_id] = ["-Inf", "Inf"];

			// change value of selection
			plots_selected[select_id] = select_value;

            // show plot
            plots_displayed[select_id] = 1;

			// update newly selected plot
			draw_plot(select_id);

			// plot changed event
            var plotEvent = new CustomEvent("DACPlotsChanged", {detail: {
                                            plots_selected: plots_selected,
                                            plots_displayed: plots_displayed}});
            document.body.dispatchEvent(plotEvent);

            // plot zoom change event
            var plotZoomEvent = new CustomEvent("DACPlotZoomChanged", { detail: {
                                 plots_zoom_x: plots_selected_zoom_x,
                                 plots_zoom_y: plots_selected_zoom_y} });
            document.body.dispatchEvent(plotZoomEvent);

		});

}

// call back for the link check boxes
function link_check_box()
{

	// uncheck boxes, if checked
	for (var j = 0; j < Math.min(num_included_plots, 3); j ++) {
		$("#dac-link-plot-" + (j+1).toString()).prop("checked", false);
	};

	// called when user checks or unchecks a link box
	this.change(function () {

		// get check box state
		var check_id_str = this.id;
		var check_id = Number(check_id_str.split("-").pop()) - 1;
		var checked = this.checked;

		// does the user want to link a plot?
		if (!checked) {

			// no -- unlink plot
			link_plots[check_id] = 0;

		} else {

			// yes -- check compatibility with previously checked links
			var compatible_link = true;
			for (var j = 0; j < Math.min(num_included_plots, 3); j++) {

				// only check axes that are linked
				if (link_plots[j] != 0) {

					// are axes same length?
					if (plots_selected_time[j].length == plots_selected_time[check_id].length) {

						// compute difference between time vectors
						var abs_diff = 0;
						for (var k = 0; k < plots_selected_time[j].length; k++) {
							abs_diff = abs_diff + Math.abs(plots_selected_time[j][k] -
										plots_selected_time[check_id][k]);
						}

						// are vectors different?
						if (abs_diff != 0) {
							compatible_link = false;
						}

					} else {
						compatible_link = false;
					}
				}
			}

			// is the link compatible with previous links?
			if (compatible_link) {

				// yes -- add to list
				link_plots[check_id] = 1;

			} else {

				// no -- uncheck box and alert user
				$("#dac-link-plot-" + (check_id+1).toString()).prop("checked", false);
				dialog.ajax_error("This plot cannot be linked to previous plots because the " +
							  "x-axes are incompatible.  This can sometimes occur if one plot is " +
							  "zoomed relative to another.")("","","");
			}
		}
	});

}

// update selections based on other input
module.change_selections = function(change_plot_selections)
{

	// change number of plots to match the number of selections
	num_plots = Math.min(3,change_plot_selections.length);

    // change plots to display
    plots_displayed = [0, 0, 0];
    for (var i = 0; i < Math.min(num_plots,3); i++) {
        plots_displayed[i] = 1;
    }

	// update selections/unhide plots if necessary
	for (var i = 0; i < Math.min(num_plots,3); ++i) {

		// everything is different so we also unlink the plots
		$("#dac-link-plot-" + (i+1).toString()).prop("checked", false);
		link_plots[i] = 0;

		// unhide everything (might have been previously hidden)
		$("#dac-plot-" + (i+1)).show();
		$("#dac-select-plot-" + (i+1)).show();
		$("#dac-link-plot-" + (i+1)).show();
		$("#dac-link-label-plot-" + (i+1)).show();

        // update plot
		$("#dac-select-plot-" + (i+1)).val(change_plot_selections[i]).change();

	}

    // hide plots not in selection
    hide_plots (num_plots);

    console.log("change selection: " + plots_selected);
    console.log("change selection: " + plots_displayed);

	// plot changed event (note this is redundant due to update plot calls,
	// but makes sure that the correct number of plots is in the new selection)
    var plotEvent = new CustomEvent("DACPlotsChanged", { detail: {
                                    plots_selected: plots_selected,
                                    plots_displayed: plots_displayed}});
    document.body.dispatchEvent(plotEvent);

}

// hides undisplayed plots
var hide_plots = function (num_plots)
{

	// hide last plots if user selected less than three
	for (var i = num_plots; i < 3; i++) {

		// hide dac-plots that don't exist in selection
		$("#dac-plot-" + (i+1)).hide();
		$("#dac-select-plot-" + (i+1)).hide();
		$("#dac-link-plot-" + (i+1)).hide();
		$("#dac-low-resolution-plot-" + (i+1)).hide();
		$("#dac-full-resolution-plot-" + (i+1)).hide();
		$("#dac-link-label-plot-" + (i+1)).hide();
		$("#dac-plots-displayed-" + (i+1)).hide();
		$("#dac-plots-not-displayed-" + (i+1)).hide();

	}

}

// refresh all plots, including size, scale, etc.
// num_to_draw should be <= 3 (maximum of three plots
// are ever drawn).
module.draw = function()
{

	// draw each plot to size of container
	var width = $("#dac-plots").width();
	var height = $("#dac-plots").height()/3 -
		plot_adjustments.pull_down_height;

	// compute number of tick marks needed
	var num_x_ticks = Math.round(width/plot_adjustments.x_tick_freq);
	var num_y_ticks = Math.round(height/plot_adjustments.y_tick_freq);

	// the sizes and ranges of the plots are all the same
	for (var i = 0; i < Math.min(num_included_plots,3); ++i) {

		// change scale
		x_scale[i].range([plot_adjustments.padding_left +
			plot_adjustments.y_label_padding,
			width - plot_adjustments.padding_right]);
		y_scale[i].range([height - plot_adjustments.padding_bottom -
			plot_adjustments.x_label_padding,
			plot_adjustments.padding_top]);

		// change plot size
		plot[i].attr("width", width)
			   .attr("height", height);

		// update size of clip rectangle
		plot[i].selectAll("#clip-rect")
			.attr("width", width - plot_adjustments.padding_left
								 - plot_adjustments.y_label_padding
								 - plot_adjustments.padding_right)
			.attr("height", height - plot_adjustments.padding_bottom
								   - plot_adjustments.x_label_padding
								   - plot_adjustments.padding_top);
		// update mouse-over line plot limits
		mouse_over_line[i].attr("x1", plot_adjustments.padding_left +
									  plot_adjustments.y_label_padding)
						  .attr("y1", $("#dac-plots").height()/3 -
									  plot_adjustments.pull_down_height -
									  plot_adjustments.padding_bottom -
									  plot_adjustments.x_label_padding)
						  .attr("x2", plot_adjustments.padding_left +
									  plot_adjustments.y_label_padding)
						  .attr("y2", plot_adjustments.padding_top);

		// change x axis label positions
		x_label[i].attr("x", width - plot_adjustments.padding_right)
				  .attr("y", height - plot_adjustments.x_label_padding);

		y_label[i].attr("x", -plot_adjustments.padding_top)
				  .attr("y", plot_adjustments.y_label_padding);

		// update number of ticks x and y axes positions
		x_axis[i].ticks(num_x_ticks);
		plot[i].selectAll("g.x.axis")
			   .attr("transform", "translate(0," + (height -
					 plot_adjustments.padding_bottom -
					 plot_adjustments.x_label_padding) + ")");
		y_axis[i].ticks(num_y_ticks);

		// draw actual plot (if it should be displayed -- only for initial load)
		if (plots_displayed[i] == 1) {
		    draw_plot(i);
		}

	}
}

// this routine sets off the following actions:
// (1) refresh data from server, sub-sampled by row (selection) and column (resolution)
// (2) update data in d3
// (3) re-draw d3 plots
// (4) update indicators for plot
function draw_plot(i)
{

	// first, we refresh the data
	// since this is an ajax call, we only continue after the
	// data has been retrieved

	// get rows of data to pass to server
	var refresh_selections = [-2, -1];  // indicates empty python list
	var selection_1 = selections.sel_1();
	var selection_2 = selections.sel_2();

	// starting with selection 1, up to max number of plots
	for (var j = 0; j < Math.min(selection_1.length, max_num_plots); j++) {
		refresh_selections.push (selection_1[j]);
	}

	// finishing with selection 2, up to max number of plots
	for (var j = 0; j < Math.min(selection_2.length, max_num_plots); j++) {
		refresh_selections.push (selection_2[j]);
	}

	// if selection is non-empty show display indicator
	if (refresh_selections.length == 2) {
		plots_selected_displayed[i] = 0;
	} else {
		plots_selected_displayed[i] = 1;
	}

	// call to server to get subsampled data
	client.get_model_command(
	{
		mid: mid,
		type: "DAC",
		command: "subsample_time_var",
		parameters: [i, plots_selected[i], refresh_selections, max_time_points,
					 plots_selected_zoom_x[i][0], plots_selected_zoom_x[i][1],
					 plots_selected_zoom_y[i][0], plots_selected_zoom_y[i][1]],
		success: function (result)
		{
			// recover plot id
			var plot_id = result["plot_id"];

			// save new data
			plots_selected_time[plot_id] = result["time_points"];
			plots_selected_data[plot_id] = result["var_data"];

			// save resolution indicator (for null selection do not show indicator)
			if (plots_selected_data[plot_id].length > 0)
			{
				plots_selected_resolution[plot_id] = result["resolution"];
			} else {
				plots_selected_resolution[plot_id] = -1;
			}

            // was zoom range changed?
            if (result["range_change"]) {

                // reset zoom
                plots_selected_zoom_x[i] = result["data_range_x"];
                plots_selected_zoom_y[i] = result["data_range_y"];

                // plot zoom change event
                var plotZoomEvent = new CustomEvent("DACPlotZoomChanged", { detail: {
                                     plots_zoom_x: plots_selected_zoom_x,
                                     plots_zoom_y: plots_selected_zoom_y} });
                document.body.dispatchEvent(plotZoomEvent);

            }

			// now update data in d3
			update_data_d3(i);

			// then re-draw d3 plot
			draw_plot_d3(i);

			// update indicators for this plot
			update_indicators(i);

		},
		error: function ()
		{
			dialog.ajax_error ('Server failure: could not subsample variable data.')("","","");
		}
	});

}

// updates d3 stored data for plots
function update_data_d3(i)
{

	// remove any data already present
	plot[i].selectAll(".curve").remove();

	// remove focus curve if present
	plot[i].selectAll(".focus").remove();

	// generate new data for each selection
	if ((selections.len_sel_1() > 0) || (selections.len_sel_2() > 0)) {

		// update scale domain
		set_default_domain(i);

		// update data (only Curve data is implemented so far)
		if ($.trim(plot_type[plots_selected[i]]) == 'Curve') {

			// set (or re-set) zoom brushing & vertical line
			plot[i].selectAll("g.brush").remove();
			plot[i].append("g")
				   .attr("class", "brush")
				   .call(d3.svg.brush()
				   .x(x_scale[i])
				   .y(y_scale[i])
				   .on("brushend", zoom))
				   .on("mouseover", vertical_line_start)
				   .on("mousemove", vertical_line_move)
				   .on("mouseout", vertical_line_end);

			// set selectable curves (note brush is under selection)
			plot[i].selectAll(".curve")
				   .data(generate_curve_data(i))
				   .attr("class", "curve")
				   .enter()
				   .append("path")
				   .attr("class", "curve")
				   .attr("stroke", function(d) { return sel_color[d[0][2]]; })
				   .attr("stroke-width", 1)
				   .attr("fill", "none")
				   .on("click", select_curve);

			// draw focus curve (on top of other curves) if data is available
			if ((selections.focus() != null) &&
				(focus_curve_ind() != -1)) {

				// draw focus curve
				plot[i].selectAll(".focus")
					   .data([d3.transpose([plots_selected_time[i],
											plots_selected_data[i][focus_curve_ind()]])])
					   .attr("class", "focus")
					   .enter()
					   .append("path")
					   .attr("class", "focus")
					   .attr("stroke", focus_color)
					   .attr("stroke-width", 2)
					   .attr("fill", "none")
					   .on("click", deselect_curve);

			}

		} else {
			dialog.ajax_error ('Only "Curve" type plots are implemented.')("","","");
		};

	};
}

// set default scale for curves
function set_default_domain(i)
{

	// update x-axis domain
	if (plots_selected_zoom_x[i][0] == "-Inf" || plots_selected_zoom_x[i][1] == "Inf") {

		// undetermined scale, must look at data
		x_scale[i].domain([Math.min.apply(Math, plots_selected_time[i]),
						   Math.max.apply(Math, plots_selected_time[i])]);
	} else {

		// scale already known
		x_scale[i].domain(plots_selected_zoom_x[i]);

	}

	// get y-axis min and max
	if (plots_selected_zoom_y[i][0] == "-Inf" || plots_selected_zoom_y[i][1] == "Inf") {

		// undetermined scale, look at data
		var plot_min = Infinity;
		var plot_max = -Infinity;
		for (var j = 0; j < plots_selected_data[i].length; j++) {
			plot_min = Math.min(plot_min, Math.min.apply(Math,
				plots_selected_data[i][j]));
			plot_max = Math.max(plot_max, Math.max.apply(Math,
				plots_selected_data[i][j]));
		};

		// if lower limit was non-infinite reset to finite value
		if (plots_selected_zoom_y[i][0] != "-Inf") {
			plot_min = plots_selected_zoom_y[i][0];
		}

		// if upper limit was non-infinite reset to finite value
		if (plots_selected_zoom_y[i][1] != "Inf") {
			plot_max = plots_selected_zoom_y[i][1];
		}

		// set scale
		y_scale[i].domain([plot_min, plot_max]);

	} else {

		// known scale
		y_scale[i].domain(plots_selected_zoom_y[i]);

	}
}

// generate a d3 style version of the data for a selection of curves,
// which is an array of arrays of curves, where each curve is an (x,y,c) array
// where x,y is position and c is color
// NOTE: in the second position we now push the curve id for use by the selection
// routines (all the rest are stil color)
function generate_curve_data (i)
{

	// make array of indices into selection colors
	var sel_1_color = [];
	var sel_2_color = [];
	for (var j = 0; j < plots_selected_time[i].length; j++) {
		sel_1_color.push(0);
		sel_2_color.push(1);
	}

	// get selections
	var selection_1 = selections.sel_1();
	var selection_2 = selections.sel_2();

	// make array of data for selection 1
	var curve_data = [];
	for (var j = 0; j < Math.min(selection_1.length, max_num_plots); j++) {
		curve_data.push(d3.transpose([plots_selected_time[i],
				  plots_selected_data[i][j],
				  sel_1_color]));
	};

	// add more data for selection 2
	for (var j = 0; j < Math.min(selection_2.length, max_num_plots); j++) {
		curve_data.push(d3.transpose([plots_selected_time[i],
				  plots_selected_data[i][j + Math.min(selection_1.length, max_num_plots)],
				  sel_2_color]));
	};

	return curve_data;
}

// draw a plot with specific axis, labels, etc.
function draw_plot_d3(i)
{

	// draw plots (if necessary re-draw)
	if ($.trim(plot_type[plots_selected[i]]) == 'Curve') {

		plot[i].selectAll("path")
			   .attr("d", d3.svg.line().interpolate("linear")
							.x(function(d) { return x_scale[i](d[0]); })
							.y(function(d) { return y_scale[i](d[1]); }))
			   .attr("clip-path", "url(#clip)");

	} else {

		// note: this will never happen using the PTS wizard
		dialog.ajax_error ('Only "Curve" type plots are implemented.')("","","");
	};

	// label axes (if necessary re-draw)
	x_label[i].text(x_axis_name[plots_selected[i]]);
	y_label[i].text(y_axis_name[plots_selected[i]]);

	// draw axes (re-draws)
	plot[i].selectAll("g.x.axis").call(x_axis[i])
		   .selectAll(".domain").attr("clip-path",null);
	plot[i].selectAll("g.y.axis").call(y_axis[i])
		   .selectAll(".domain").attr("clip-path",null);

}

// update indicators for current plot
function update_indicators(i)
{
	// update resolution indicator
	toggle_resolution (i, plots_selected_resolution[i]);

	// update selection max indicator
	if (plots_selected_displayed[i] == 0)
	{

		// do not show display indicator
		$("#dac-plots-displayed-" + (i+1)).hide();
		$("#dac-plots-not-displayed-" + (i+1)).hide();

	}
	else if (limit_indicator_color == "green") {

		// all plots displayed
		$("#dac-plots-not-displayed-" + (i+1)).hide();
		$("#dac-plots-displayed-" + (i+1)).show();

	} else {

		// some plot not displayed
		$("#dac-plots-displayed-" + (i+1)).hide();
		$("#dac-plots-not-displayed-" + (i+1)).css("color", limit_indicator_color);
		$("#dac-plots-not-displayed-" + (i+1)).show();

	}
}

// toggle low/full resolution indicator for a plot
function toggle_resolution (i, resolution)
{

	if (resolution == -1) {

		// do not show resolution indicator
		$("#dac-low-resolution-plot-" + (i+1)).hide();
		$("#dac-full-resolution-plot-" + (i+1)).hide();

	} else if (resolution > 1) {

		// turn on low resolution warning/turn off full resolution
		$("#dac-low-resolution-plot-" + (i+1)).show();
		$("#dac-full-resolution-plot-" + (i+1)).hide();

	 } else {

		 // turn off low resolution warning/turn on full resolution
		$("#dac-low-resolution-plot-" + (i+1)).hide();
		$("#dac-full-resolution-plot-" + (i+1)).show();

	 }

}

// zoom handler call back
function zoom()
{
	// get current plot index
	var plot_id_str = this.parentNode.id;
	var plot_id = Number(plot_id_str.split("-").pop()) - 1;

	// find zoomed area
	var extent = d3.event.target.extent();

	// remove gray selection box
	d3.event.target.clear();
	d3.select(this).call(d3.event.target);

	// make a list of plots to update
	var plots_to_update = identify_plots_to_update(plot_id);

	// was it an valid zoom?
	if (extent[0][0] != extent[1][0] &&
		extent[0][1] != extent[1][1])
		{

			// re-scale y-axis only for actual active plot
			var active_plot = plot_id;

			// update all linked plots
			for (var j = 0; j < 3; j++) {

				// should we update this plot?
				if (plots_to_update[j] == 1) {

					// set zoom level (all linked same x)
					plots_selected_zoom_x[j] = [extent[0][0], extent[1][0]];

					// actual zoomed area might have a different y
					if (j == active_plot) {

						// check if user zoomed to lower edge of y-scale
						var lower_edge = extent[0][1];
						if (lower_edge == y_scale[j].domain()[0]) {

							// change to -Inf to get any new data from zooming at higher resolution
							lower_edge = "-Inf";
						}

						// check if user zoomed to upper edge of y-scale
						var upper_edge = extent[1][1];
						if (upper_edge == y_scale[j].domain()[1]) {

							// change to Inf to get new data
							upper_edge = "Inf";
						}

						plots_selected_zoom_y[j] = [lower_edge, upper_edge];
					}

					// re-draw plot
					draw_plot(j);
				}
			}

            // plot zoom change event
            var plotZoomEvent = new CustomEvent("DACPlotZoomChanged", { detail: {
                                 plots_zoom_x: plots_selected_zoom_x,
                                 plots_zoom_y: plots_selected_zoom_y} });
            document.body.dispatchEvent(plotZoomEvent);

	} else {  // reset zoom

		// reset all linked plots
		for (var j = 0; j < 3; j++) {

			// is this a plot to be updated
			if (plots_to_update[j] == 1) {

				// re-set plot to full scale
				plots_selected_zoom_x[j] = ["-Inf", "Inf"];
				plots_selected_zoom_y[j] = ["-Inf", "Inf"];

				// re-draw plot
				draw_plot(j);

			}
		}

        // plot zoom change event
        var plotZoomEvent = new CustomEvent("DACPlotZoomChanged", { detail: {
                             plots_zoom_x: plots_selected_zoom_x,
                             plots_zoom_y: plots_selected_zoom_y} });
        document.body.dispatchEvent(plotZoomEvent);
	};
};

// get a list of plots to update, including linked plots
function identify_plots_to_update (i) {

	// make a list of plots to update
	var plots_to_update = [0, 0, 0];
	if (link_plots[i] == 0) {

		// zoomed plot is not linked
		plots_to_update[i] = 1;

	} else {

		// zoomed plot is linked
		plots_to_update = link_plots;
	}

	return plots_to_update;
}

// user hovered over a curve
function select_curve (d,i)
{

	// find index of curve selected
	var curve_id = null;
	if (d[0][2] == 0) {

		// we're in selection 1
		curve_id = selections.sel_1()[i];

	} else {

		// we're in selection 2
		curve_id = selections.sel_2()[i - Math.min(selections.len_sel_1(), max_num_plots)];

	}

	// highlight selected curve in other views
	var selectionEvent = new CustomEvent("DACActiveSelectionChanged", { detail: {
										 active_sel: curve_id,
										 active: true} });
	document.body.dispatchEvent(selectionEvent);

}

// user left curve
function deselect_curve (d,i)
{

	// dehighlight selected curve
	var selectionEvent = new CustomEvent("DACActiveSelectionChanged", { detail: {
										 active_sel: null,
										 active: true} });
	document.body.dispatchEvent(selectionEvent);

}

// find local index of curve in focus
function focus_curve_ind ()
{
	// get index of curve in focus
	var curve_in_focus = selections.focus();

	// return local index of curve
	var curve_in_focus_ind = -1;

	// find curve index, if not null
	var ind_sel_1 = selections.in_sel_1(curve_in_focus);
	var ind_sel_2 = selections.in_sel_2(curve_in_focus);
	if (ind_sel_1 != -1) {

		// check to make sure curve is in dataset
		if (ind_sel_1 < max_num_plots) {
			curve_in_focus_ind = ind_sel_1;
		}

	} else if (ind_sel_2 != -1) {

		// check to make sure curve is in dataset
		if (ind_sel_2 < max_num_plots) {
			curve_in_focus_ind = ind_sel_2 + Math.min(max_num_plots, selections.len_sel_1());
		}

	}

	return curve_in_focus_ind;
}

// user sitting over a plot
function vertical_line_start ()
{
	// identify plot
	var plot_id_str = this.parentNode.id;
	var plot_id = Number(plot_id_str.split("-").pop()) - 1;

	// identify x position in plot
	var x_coord = d3.mouse(this)[0];

	// make a list of plots to update
	var plots_to_update = identify_plots_to_update(plot_id);

	// update vertical lines for all linked plots
	for (var i = 0; i < 3; i++) {

		if (plots_to_update[i] == 1) {

			// update vertical line position and display
			mouse_over_line[i].attr("x1", x_coord)
							  .attr("x2", x_coord)
							  .style("display", "inline");
		}
	}
}

// user moving over a plot
function vertical_line_move ()
{
	// identify plot
	var plot_id_str = this.parentNode.id;
	var plot_id = Number(plot_id_str.split("-").pop()) - 1;

	// identify x position in plot
	var x_coord = d3.mouse(this)[0];

	// make a list of plots to update
	var plots_to_update = identify_plots_to_update(plot_id);

	// update vertical lines for all linked plots
	for (var i = 0; i < 3; i++) {

		if (plots_to_update[i] == 1) {

			// reposition vertical line
			mouse_over_line[i].attr("x1", x_coord)
							  .attr("x2", x_coord)
		}
	}
}

// user out of plot
function vertical_line_end ()
{
	// identify plot
	var plot_id_str = this.parentNode.id;
	var plot_id = Number(plot_id_str.split("-").pop()) - 1;

	// make a list of plots to update
	var plots_to_update = identify_plots_to_update(plot_id);

	// update vertical lines for all linked plots
	for (var i = 0; i < 3; i++) {

		if (plots_to_update[i] == 1) {

			// hide vertical line
			mouse_over_line[i].style("display", "none");
		}
	}
}

// update data/plots
// num_to_draw should be <= 3 (maximum of three plots
// are ever drawn)
module.update_plots = function ()
{

	// update plot limit indicator color
    update_plot_limit_indicator();

	// unzoom plots (leave linked)
	for (var i = 0; i < 3; i++) {

		// unzoom plots
		plots_selected_zoom_x[i] = ["-Inf", "Inf"];
		plots_selected_zoom_y[i] = ["-Inf", "Inf"];

	}

    // plot zoom change event
    var plotZoomEvent = new CustomEvent("DACPlotZoomChanged", { detail: {
                         plots_zoom_x: plots_selected_zoom_x,
                         plots_zoom_y: plots_selected_zoom_y} });
    document.body.dispatchEvent(plotZoomEvent);

	// re-draw all plots
	module.draw();
}

// update plot limit indicator color
function update_plot_limit_indicator ()
{
	limit_indicator_color = "green";
	if ((selections.len_sel_1() > max_num_plots) & (selections.len_sel_2() > max_num_plots)) {
		limit_indicator_color = "purple";
	} else if (selections.len_sel_1() > max_num_plots) {
		limit_indicator_color = "red";
	} else if (selections.len_sel_2() > max_num_plots) {
		limit_indicator_color = "blue";
	}
}

export default module;
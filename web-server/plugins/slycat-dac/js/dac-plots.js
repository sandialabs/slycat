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
import ko from "knockout";
import metadata_table from "./dac-table.js";

// public functions (or variables)
var module = {};

// private variables
// -----------------

// plot limits to ensure adequate speed/responsiveness
var max_time_points = null;
var max_num_plots = null;

// maximum plot name length to (hopefully) avoid bad plot alignment in the pane
var max_plot_name_length = null;

// model ID & name
var mid = URI(window.location).segment(-1);
var model_name = "";

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

// check axes for links after a draw call
var check_link_count = 0;
var plots_expected = 0;
var draw_called = false;

// meta data for plots
var num_vars = null;
var num_included_plots = null;
var plot_name = null;
var x_axis_name = null;
var y_axis_name = null;
var plot_type = null;
var var_include_columns = null;

// colors for plots
var sel_color = null;
var focus_color = null;

// number of selections allowed
var max_num_sel = null;

// total number of plots available in dataset
var tot_num_plots = null;

// keep track of download modal opened/closed
var download_dialog_open = false;

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
module.setup = function (SELECTION_COLOR, SEL_FOCUS_COLOR, PLOT_ADJUSTMENTS,
						 MAX_TIME_POINTS, MAX_NUM_PLOTS, MAX_PLOT_NAME, MODEL_NAME,
						 variables_metadata, variables_data, INCLUDE_VARS, TOT_NUM_PLOTS,
						 init_plots_selected, init_plots_displayed, init_plots_zoom_x,
						 init_plots_zoom_y, init_link_plots)
{

	// set ui constants
	sel_color = SELECTION_COLOR;
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

    // number of selections allowed
    max_num_sel = sel_color.length;

	// set maximum resolution for plotting
	max_time_points = MAX_TIME_POINTS;

	// set maximum number of plots (per selection)
	max_num_plots = MAX_NUM_PLOTS;

    // total number of plots possible
    tot_num_plots = TOT_NUM_PLOTS;

	// set maximum length of plot names
	max_plot_name_length = MAX_PLOT_NAME;

	// which variables to actually plot
	var_include_columns = INCLUDE_VARS;

    // save model name for downloading plot data
    model_name = MODEL_NAME;

	// populate pull down menus and initialize d3 plots

	// sort out the variable metadata we need
	num_vars = variables_metadata[0]["row-count"];
	num_included_plots = var_include_columns.length;
	x_axis_name = variables_data[0]["data"][1];
	y_axis_name = variables_data[0]["data"][2];
	plot_type = variables_data[0]["data"][3];

	// populate plot names
	plot_name = variables_data[0]["data"][0];

	// truncate plot names if too long
	for (var i = 0; i < num_vars; i++) {

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

    }

    // initialize plot zooming
    plots_selected_zoom_x = init_plots_zoom_x;
    plots_selected_zoom_y = init_plots_zoom_y;

	// initialize full resolution and all displayed (do not show)
	plots_selected_displayed = [0, 0, 0];
	plots_selected_resolution = [-1, -1, -1];

	// initialize check boxes
	link_plots = init_link_plots;

    // check link boxes
    for (var i = 0; i < 3; i++) {
        if (link_plots[i] == 1) {
    	    $("#dac-link-plot-" + (i+1).toString()).prop("checked", true);
    	}
	}

	// remove unused plot pull downs
	for (var i = num_included_plots; i < 3; i++) {
		$("#dac-select-plot-" + (i+1)).remove();
		$("#dac-link-plot-" + (i+1)).remove();
		$("#dac-plots-displayed-" + (i+1)).remove();
		$("#dac-plots-not-displayed-" + (i+1)).remove();
		$("#dac-low-resolution-plot-" + (i+1)).remove();
		$("#dac-full-resolution-plot-" + (i+1)).remove();
		$("#dac-link-label-plot-" + (i+1)).remove();
		$("#dac-download-plot-" + (i+1)).remove();

	}

	// initialize plots as d3 plots
	for (var i = 0; i < Math.min(num_included_plots,3); ++i) {

		// populate pull down menu
		display_plot_pull_down.bind($("#dac-select-plot-" + (i+1)))(i);

		// bind to link check boxes
		link_check_box.bind($("#dac-link-plot-" + (i+1)))();

        // click download plot button
        $("#dac-download-plot-" + (i+1)).on("click", {id:i}, download_plot);

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
	for (var j = 0; j != num_vars; ++j)
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

            // link plots changed
            var linkPlotEvent = new CustomEvent("DACLinkPlotsChanged", {detail:
                                                link_plots});
            document.body.dispatchEvent(linkPlotEvent);

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

			// is the link compatible with previous links?
			if (check_compatible_link(check_id)) {

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

        // link plots changed
        var linkPlotEvent = new CustomEvent("DACLinkPlotsChanged", {detail:
                                            link_plots});
        document.body.dispatchEvent(linkPlotEvent);

	});

}

// check that linked plots are compatible
function check_compatible_link(check_id)
{

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

    return compatible_link;
}

// called when user clicks download plot data button
function download_plot(event)
{

    // identify plot to be downloaded
    var plot_id = event.data.id;

    // get user selection
    var curr_sel = selections.filtered_sel();

	// make sure something is selected
	if (curr_sel.length == 0) {

	    dialog.ajax_error("There are no plots visible. Please make " +
	                      "a selection or relax filters before exporting plot data.")("","","");

	} else {

        // check if dialog is already open
        if (!download_dialog_open) {

            download_dialog_open = true;

            // something selected, see what user wants to export
            openCSVSaveChoiceDialog(plot_id, curr_sel);
        }
	}
}

// open download modal dialog box
function openCSVSaveChoiceDialog(plot_id, curr_sel)

{

    // get variable name
    var sel_plot_ind = plots_selected[plot_id];
    var sel_plot_name = plot_name[sel_plot_ind];

    // get zoom status
    var zoomed = false;
    if (plots_selected_zoom_x[plot_id][0] != '-Inf' ||
        plots_selected_zoom_x[plot_id][1] != 'Inf') {
        zoomed = true;
    }

    // create dialog message
    var dialog_msg = 'There are ' + curr_sel.length + ' "' +
                     sel_plot_name + '" plot(s) displayed.  ';

    // extra text for zoomed plots
    if (zoomed) {
        dialog_msg += "<br><br><i class='text-warning fa fa-exclamation-triangle'></i> The " +
                      "displayed plots have been magnified (zoomed in), " +
                      "and only the time points shown will be exported.";
    }

    // check for filters, warning for save all plots
    var use_data_order_all_plots = metadata_table.filters_active();
    if (use_data_order_all_plots) {
        dialog_msg += "<br><br><i class='text-warning fa fa-exclamation-triangle'></i> The " +
                      "table is filtered.  The default data order (rather than the current " +
                      'table order) will be used in the "Save All Plots" option.'
    }

    // check for filters active but not used
    var use_data_order = (selections.filter_button_status() == false) && metadata_table.filters_active();
    if (use_data_order) {
        dialog_msg += "<br><br><i class='text-warning fa fa-exclamation-triangle'></i> The table is filtered " +
                      "but not the plots.  The default data order (rather than the current table order) will be " +
                      'used with the "Save Selected" option.';
    }

    // text for selecting point identifier
    dialog_msg += "<br /><br />Please select the meta-data column that will identify " +
                  "the plots in the .csv file.";

    // construct options for point identifier pull down
    var table_headers = metadata_table.get_headers(false);

    // buttons for dialog
	var buttons_save = [
		{className: "btn-light", label:"Cancel"},
		{className: "btn-primary", label:"Save All Plots"},
		{className: "btn-primary", label:"Save Selected", icon_class:"fa fa-check"}
	];

    // name file according to model name, variable
    // (model_name is already truncated in dac-ui.js)
    var defaultFilename = model_name + " " +
                          sel_plot_name.substring(0, max_plot_name_length) + ".csv";
    defaultFilename = defaultFilename.replace(/ /g,"_");

    // launch dialog
	dialog.dialog(
	{
		title: "Export Plot Data",
		message: dialog_msg,
		buttons: buttons_save,
		select: true,
		select_options: table_headers[0],
		callback: function(button, value)
		{

            // user selected header for labeling ouptput
            var header_index = value();

		    // download model is closed
		    download_dialog_open = false;

		    if (typeof button !== 'undefined') {

                if(button.label == "Save All Plots")
                    convert_to_csv([], plot_id, header_index,
                        defaultFilename, use_data_order_all_plots);

                else if(button.label == "Save Selected")
                    convert_to_csv(curr_sel, plot_id, header_index,
                        defaultFilename, use_data_order);
            }
		},
	});

}

// generate csv table from selected plot data
function convert_to_csv (curr_sel, plot_id, header_index, defaultFilename,
                         use_data_order)
{

    // if selection is empty, use all plots
    if (curr_sel.length == 0) {

        // construct current selection as all points
        for (var i = 0; i < tot_num_plots; i++) {
            curr_sel.push(i);
        }

    }

    var num_sel = curr_sel.length;

    // get header values and selection colors
    var sel_col_commas = metadata_table.selection_values(header_index, curr_sel, use_data_order);

    // use new table order for data
    var curr_sel_table_order = sel_col_commas[2];

    // keep track of extra commas found
    var extra_commas = sel_col_commas[3];

    // table to return
    var csv_output = "Time,";

    // construct header row
    var sel_plot_ind = plots_selected[plot_id];
    for (var i = 0; i < num_sel; i++) {

        // text is "ID Var (selection color)"
        csv_output += sel_col_commas[0][i] + " " + plot_name[sel_plot_ind];

        // add selection color, if available
        if (sel_col_commas[1][i] != "") {
            csv_output += " (" + sel_col_commas[1][i] + ")";
        }

        // separated by commas, ended by newline
        if (i < num_sel-1) {
            csv_output += ",";
        } else {
            csv_output += "\n";
        }
    }

    // call server to get data, no subsampling
    client.post_sensitive_model_command(
	{
		mid: mid,
		type: "DAC",
		command: "subsample_time_var",
		parameters: {plot_id: plot_id, database_id: sel_plot_ind,
		             plot_selection: curr_sel_table_order,
		             num_subsamples: "Inf",
		             x_min: plots_selected_zoom_x[plot_id][0],
		             x_max: plots_selected_zoom_x[plot_id][1],
		             y_min: plots_selected_zoom_y[plot_id][0],
		             y_max: plots_selected_zoom_y[plot_id][1]},
		success: function (result)
		{
            // convert to variable
		    result = JSON.parse(result);

			// add data to table, rows are time steps
			var num_time_steps = result["time_points"].length;
			for (var i = 0; i < num_time_steps; i++) {

			    // time step is first column
			    csv_output += result["time_points"][i] + ","

			    // next columns are variables
			    for (var j = 0; j < num_sel-1; j++) {
			        csv_output += result["var_data"][j][i] + ","
			    }

			    // last variable
			    csv_output += result["var_data"][num_sel-1][i] + "\n";

			}

			// now write out file
			metadata_table.download_data_table(csv_output, defaultFilename);

		},
		error: function ()
		{
			dialog.ajax_error ('Server failure: could not download variable data.')("","","");
		}
	});

	// produce warning if extra commas were detected
	if (extra_commas) {
		 dialog.ajax_error("Commas were detected in the table data " +
		    "text and will be removed in the .csv output file.")
			("","","");
	}

}

// update selections based on other input
module.change_selections = function(change_plot_selections)
{

	// change number of plots to match the number of selections
	var num_plots = Math.min(3,change_plot_selections.length);

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
		$("#dac-download-plot-" + (i+1)).show();

        // update plot
		$("#dac-select-plot-" + (i+1)).val(change_plot_selections[i]).change();

	}

    // hide plots not in selection
    hide_plots (num_plots);

	// plot changed event (note this is redundant due to update plot calls,
	// but makes sure that the correct number of plots is in the new selection)
    var plotEvent = new CustomEvent("DACPlotsChanged", { detail: {
                                    plots_selected: plots_selected,
                                    plots_displayed: plots_displayed}});
    document.body.dispatchEvent(plotEvent);

    // link plots changed
    var linkPlotEvent = new CustomEvent("DACLinkPlotsChanged", {detail:
                                        link_plots});
    document.body.dispatchEvent(linkPlotEvent);

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
		$("#dac-download-plot-" + (i+1)).hide();

	}

}

// refresh all plots, including size, scale, etc.
// num_to_draw should be <= 3 (maximum of three plots
// are ever drawn).
module.draw = function()
{

	// draw each plot to size of container
	var width = $("#dac-plots").width();
	var height = Math.max($("#dac-plots").height()/3.1 -
		plot_adjustments.pull_down_height,0);

	// compute number of tick marks needed
	var num_x_ticks = Math.round(width/plot_adjustments.x_tick_freq);
	var num_y_ticks = Math.round(height/plot_adjustments.y_tick_freq);

    // start counter for check links
    check_link_count = 0;
    draw_called = true;

    // and count number plots expected
    plots_expected = 0;
    for (var i = 0; i < Math.min(num_included_plots,3); i++){
        plots_expected = plots_expected + plots_displayed[i];
    }

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
			.attr("width", Math.max(width - plot_adjustments.padding_left
								 - plot_adjustments.y_label_padding
								 - plot_adjustments.padding_right, 0))
			.attr("height", Math.max(height - plot_adjustments.padding_bottom
								   - plot_adjustments.x_label_padding
								   - plot_adjustments.padding_top, 0));

		// update mouse-over line plot limits
		mouse_over_line[i].attr("x1", plot_adjustments.padding_left +
									  plot_adjustments.y_label_padding)
						  .attr("y1", Math.max($("#dac-plots").height()/3.1 -
									  plot_adjustments.pull_down_height -
									  plot_adjustments.padding_bottom -
									  plot_adjustments.x_label_padding, 0))
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

// this function checks links after everything is drawn
// it is called by each instance of draw_plot(i) when finished
function check_links(i)
{
    // another plot has been drawn
    check_link_count = check_link_count + 1;

    // is it the final plot?
    if (draw_called && (check_link_count == plots_expected))
    {

        // check links
        for (var i = 0; i < 3; i++) {
            if ((plots_displayed[i] == 1) && (link_plots[i])) {
                if (!check_compatible_link(i)) {

                    // found one incompatible link, reset all links
                    link_plots = [0,0,0];
                    for (var i = 0; i < 3; i++) {
                        $("#dac-link-plot-" + (i+1).toString()).prop("checked", false);
                    }

                    // done
                    break;
                }
            }
        }

        // draw is done
        draw_called = false;
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

	// compile selections into one list
	var refresh_selections = [];
	for (var k = 0; k < max_num_sel; k++) {

	    // get current selection
	    var curr_sel = selections.filtered_sel(k+1);

	    // add to list, up to max number of plots
	    for (var j = 0; j < Math.min(curr_sel.length, max_num_plots); j++) {
		    refresh_selections.push (curr_sel[j]);
	    }

	}

	// if selection is non-empty show display indicator
	if (refresh_selections.length == 0) {
		plots_selected_displayed[i] = 0;
	} else {
		plots_selected_displayed[i] = 1;
	}

	// call to server to get subsampled data
	client.post_sensitive_model_command(
	{
		mid: mid,
		type: "DAC",
		command: "subsample_time_var",
		parameters: {plot_id: i, database_id: plots_selected[i],
		             plot_selection: refresh_selections,
		             num_subsamples: max_time_points,
		             x_min: plots_selected_zoom_x[i][0],
		             x_max: plots_selected_zoom_x[i][1],
		             y_min: plots_selected_zoom_y[i][0],
		             y_max: plots_selected_zoom_y[i][1]},
		success: function (result)
		{
		    // convert to variable
		    result = JSON.parse(result);

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

            // was zoom range changed?  (this is an error condition,
            // likely from a template application)
            if (result["range_change"]) {

                // reset zoom
                plots_selected_zoom_x[i] = result["data_range_x"];
                plots_selected_zoom_y[i] = result["data_range_y"];

                // unlink plot
                $("#dac-link-plot-" + (i+1).toString()).prop("checked", false);
                link_plots[i] = 0;

                // plot zoom change event
                var plotZoomEvent = new CustomEvent("DACPlotZoomChanged", { detail: {
                                     plots_zoom_x: plots_selected_zoom_x,
                                     plots_zoom_y: plots_selected_zoom_y} });
                document.body.dispatchEvent(plotZoomEvent);

                // link plot change event
                var linkPlotEvent = new CustomEvent("DACLinkPlotsChanged", {detail:
                                                    link_plots});
                document.body.dispatchEvent(linkPlotEvent);

            }

			// now update data in d3
			update_data_d3(i);

			// then re-draw d3 plot
			draw_plot_d3(i);

			// update indicators for this plot
			update_indicators(i);

			// done, check links
			check_links(i);

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

    // are there any selections?
    var any_selections = false;
    for (var k = 0; k < max_num_sel; k++) {
        if (selections.len_filtered_sel(k+1) > 0) { any_selections = true; }
    }

	// generate new data for each selection
	if (any_selections) {

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
// routines (all the rest are still color)
function generate_curve_data (i)
{

    // make data arrays for each selection
    var curve_data = [];
    var curr_sel_ind = 0;
    for (var k = 0; k < max_num_sel; k++) {

        // make array of indices into selection colors
        var curr_sel_color = [];
        for (var j = 0; j < plots_selected_time[i].length; j++) {
		    curr_sel_color.push(k);
	    }

	    // get current selection
	    var curr_sel = selections.filtered_sel(k+1);

	    // make array of data for current selection
	    for (var j = 0; j < Math.min(curr_sel.length, max_num_plots); j++) {
		    curve_data.push(d3.transpose([plots_selected_time[i],
				  plots_selected_data[i][j + Math.min(curr_sel_ind, max_num_plots)],
				  curr_sel_color]));
	    };

	    // update selection index
	    curr_sel_ind = curr_sel_ind + Math.min(curr_sel.length, max_num_plots);
    }

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

    // how many plots are being displayed?
    var num_plots_displayed = plots_displayed[0] + plots_displayed[1] + plots_displayed[2];

    // if the user has rapidly clicked the difference button
    // we may get behind the actual display -- check if we need up date
    if (i >= num_plots_displayed) {
        return;
    }

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

    // get selection index
    var sel_ind = d[0][2];

    // find index of curve selected
    var curve_id = null;
    var curr_sel_ind = 0;
    for (var k = 0; k < max_num_sel; k++) {

        // get current selection
        var curr_sel = selections.filtered_sel(k+1);

        // look for curve index
        if (sel_ind == k) {
            curve_id = curr_sel[i - curr_sel_ind];
            break;
        }

        // update selection index
        curr_sel_ind = curr_sel_ind + Math.min(curr_sel.length, max_num_plots);
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
    var curr_sel_ind = 0;
    for (var k = 0; k < max_num_sel; k++) {

        // check for curve index in current selection
        var ind_sel = selections.in_filtered_sel_x(curve_in_focus, k+1);

        // if found index (and within max number of plots), we're done
        if ((ind_sel != -1) &&
            (ind_sel < max_num_plots)) {
            curve_in_focus_ind = ind_sel + curr_sel_ind;
            break;
        }

        // otherwise, update index into selection
        curr_sel_ind = curr_sel_ind + Math.min(selections.len_filtered_sel(k+1), max_num_plots);

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

	// check if any selections are over plotting limit
	for (var k = 0; k < max_num_sel; k++) {

	    if (selections.len_filtered_sel(k+1) > max_num_plots) {
	        limit_indicator_color = "orange";
	        break;
	    }
	}

}

export default module;
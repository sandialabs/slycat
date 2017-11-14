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

define("dac-plots", ["slycat-web-client", "slycat-dialog", "jquery", "d3", "URI"],
function(client, dialog, $, d3, URI)
{

	// public functions (or variables)
	var module = {};
	
	// private variables
	// -----------------

    var max_time_points = null;

	// model ID
	var mid = URI(window.location).segment(-1);

	// current plots being shown (indices & data)
	var plots_selected = [];
	var plots_selected_time = [];	// a vector of time values for plot {0,1,2}
	var plots_selected_data = [];	// a matrix of y-values for plot {0,1,2}

	// meta data for plots
	var num_plots = null;
	var plot_name = null;
	var x_axis_name = null;
	var y_axis_name = null;
	var plot_type = null;
	
	// current points being plotted
	var selection_1 = [];
	var selection_2 = [];
	
	// colors for plots
	var sel_color = [];
	
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
	
	// set up initial private variables, user interface
	module.setup = function (SELECTION_1_COLOR, SELECTION_2_COLOR, PLOT_ADJUSTMENTS,
	                         MAX_TIME_POINTS, variables_metadata, variables_data)
	{
	
		// set ui constants
		sel_color.push(SELECTION_1_COLOR);
		sel_color.push(SELECTION_2_COLOR);
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

		// populate pull down menus and initialize d3 plots

		// sort out the variable metadata we need
		num_plots = variables_metadata[0]["row-count"];
		plot_name = variables_data[0]["data"][0];
		x_axis_name = variables_data[0]["data"][1];
		y_axis_name = variables_data[0]["data"][2];
		plot_type = variables_data[0]["data"][3];
				
		// init plot order (repeated if not enough plots)
		for (var i = 0; i < Math.min(num_plots,3); i++) {
		    plots_selected.push(i);
		}

		// remove unused plot pull downs
		for (var i = num_plots; i < 3; i++) {
		    $("#dac-select-plot-" + (i+1)).remove();
		}

		// load up matrices for time series that we're looking at
		// (nested calls to make sure we load matrices in order)
		if (0 < Math.min(num_plots,3)) {client.get_model_command({

            mid: mid,
            type: "DAC",
            command: "subsample_time_var",
            parameters: [plots_selected[0], max_time_points, "-Inf", "Inf"],
            success: function (result)
            {
                // save data for viewing later
                plots_selected_time.push(result["time_points"]);
                plots_selected_data.push(result["var_data"]);

                // turn on low resolution warning/turn off full resolution
                toggle_resolution (0, result["resolution"]);

                if (1 < Math.min(num_plots,3)) {client.get_model_command({

                    mid: mid,
                    type: "DAC",
                    command: "subsample_time_var",
                    parameters: [plots_selected[1], max_time_points, "-Inf", "Inf"],
                    success: function (result)
                    {
                        plots_selected_time.push(result["time_points"]);
                        plots_selected_data.push(result["var_data"]);

                        toggle_resolution (1, result["resolution"]);

                        if (2 < Math.min(num_plots,3)) {client.get_model_command({

                            mid: mid,
                            type: "DAC",
                            command: "subsample_time_var",
                            parameters: [plots_selected[2], max_time_points, "-Inf", "Inf"],
                            success: function (result)
                            {
                                plots_selected_time.push(result["time_points"]);
                                plots_selected_data.push(result["var_data"]);

                                toggle_resolution (2, result["resolution"]);
                            },
                            error: function () {
                                dialog.ajax_error ('Server failure: could not load plot data (3).')("","","");
                            }
                        })};
                    },
                    error: function () {
                        dialog.ajax_error ('Server failure: could not load plot data (2).')("","","");
                    }
                })};
            },
            error: function ()
            {
                dialog.ajax_error ('Server failure: could not plot data (1).')("","","");
            }
        })};

		// initialize plots as d3 plots
		for (var i = 0; i < Math.min(num_plots,3); ++i) {
				
			// populate pull down menu
			display_plot_pull_down.bind($("#dac-select-plot-" + (i+1)))(i);
					
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
					
			// axis labels
			x_label[i] = plot[i].append("text")
		  						.attr("text-anchor", "end")
			y_label[i] = plot[i].append("text")
								.attr("text-anchor", "end")
								.attr("transform", "rotate(-90)");
	   
		}
				
		// set up initial size, axis labels, etc.
		module.draw();

	}

    // toggle low/full resolution indicator for a plot
    function toggle_resolution (i, resolution)
    {

        if (resolution > 1) {

            // turn on low resolution warning/turn off full resolution
            $("#dac-low-resolution-plot-" + (i+1).toString()).show();
            $("#dac-full-resolution-plot-" + (i+1).toString()).hide();

         } else {

             // turn on low resolution warning/turn off full resolution
            $("#dac-low-resolution-plot-" + (i+1).toString()).hide();
            $("#dac-full-resolution-plot-" + (i+1).toString()).show();

         }

    }

	// populate pull down menu i in {0,1,2} with plot names
	function display_plot_pull_down (i)
	{
		this.empty();
		
		// every pull down contains the list of plot names in the same order
		for (var j = 0; j != num_plots; ++j)
		{
			// generate the pull down (select) in HTML
			var select_item = $('<option value="' + j +'">').appendTo(this);
			select_item.text(plot_name[j]);
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

				// change value of selection
				plots_selected[select_id] = select_value;
				
				// request new data from server
                client.get_model_command(
                {
                    mid: mid,
                    type: "DAC",
                    command: "subsample_time_var",
                    parameters: [plots_selected[select_id], max_time_points, "-Inf", "Inf"],
                    success: function (result)
                    {

                        // save new data
                        plots_selected_time[select_id] = result["time_points"];
                        plots_selected_data[select_id] = result["var_data"];

                        // toggle resolution indicator
                        toggle_resolution (select_id, result["resolution"]);

                        // update d3 data in plot
                        update_data(select_id);

                        // update newly selected plot
                        draw_plot(select_id);

                    },
                    error: function ()
                    {
                        dialog.ajax_error ('Server failure: could not load plot data.')("","","");
                    }
                });
			});
		
	}
	
	// update selections based on other input
	module.change_selections = function(plot_selections)
	{
		// update selections
		for (var i = 0; i < Math.min(num_plots,3); ++i) {
			$("#dac-select-plot-" + (i+1)).val(plot_selections[i]).change();		
		}
	}
	
	// refresh all plots, including size, scale, etc.
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
		for (var i = 0; i < Math.min(num_plots,3); ++i) {
				   
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

            // update data, if necessary
            update_data(i);

		    // draw actual plot
			draw_plot(i);

		}
	}
	
	// draw a plot with specific axis, labels, etc.
	function draw_plot(i)
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
	
	// updates d3 stored data for plots
	function update_data(i)
	{
						
		// remove any data already present
		plot[i].selectAll(".curve").remove();
		
		// generate new data for each selection	
		if ((selection_1.length > 0) || (selection_2.length > 0)) {			
			
			// update scale domain
			set_default_domain(i);
			           
			// update data (only Curve data is implemented so far)
			if ($.trim(plot_type[plots_selected[i]]) == 'Curve') {

				// set (or re-set) zoom brushing
			    plot[i].selectAll("g.brush").remove();
			    plot[i].append("g")
				       .attr("class", "brush")
				       .call(d3.svg.brush()
				       .x(x_scale[i])
				       .y(y_scale[i])
				       .on("brushend", zoom));

				// set selectable curves (note brush is under selection)
				plot[i].selectAll(".curve")
					   .data(generate_curve_data(i))
					   .attr("class", "curve")
					   .enter()
					   .append("path")
					   .attr("class", "curve")
					   .attr("stroke", function(d) { return sel_color[d[0][2]]; })
					   .attr("fill", "none")
					   .on("click", select_curve);

			} else {
				dialog.ajax_error ('Only "Curve" type plots are implemented.')("","","");
			};

		};
	}
	
	// set default scale for curves
	function set_default_domain(i)
	{
		// update x-axis domain
		x_scale[i].domain([Math.min.apply(Math, plots_selected_time[i]),
						   Math.max.apply(Math, plots_selected_time[i])]);
			
		// update y-axis domain
		y_scale[i].domain([Math.min(sel_min(i, selection_1),
						            sel_min(i, selection_2)),
						   Math.max(sel_max(i, selection_1),
						   			sel_max(i, selection_2))]);
	}
	
	// returns min for a curve selection
	function sel_min (i, selection)
	{
		// set min largest possible value
		var sel_min = Infinity;
		
		// update min and max for selection
		for (var j = 0; j < selection.length; j++) {
			sel_min = Math.min(sel_min, Math.min.apply(Math,
				plots_selected_data[i][selection[j]]));
		};
		
		return sel_min;	
	}
	
	// returns max for a curve selection
	function sel_max (i, selection)
	{
		// set min largest possible value
		var sel_max = -Infinity;
		
		// update min and max for selection
		for (var j = 0; j < selection.length; j++) {
			sel_max = Math.max(sel_max, Math.max.apply(Math,
				plots_selected_data[i][selection[j]]));
		};
		
		return sel_max;	
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
					  
		// make array of data for selection 1
		var curve_data = [];
		for (var j = 0; j < selection_1.length; j++) {
			curve_data.push(d3.transpose([plots_selected_time[i], 
					  plots_selected_data[i][selection_1[j]],
					  sel_1_color]));
		};
				
		// add more data for selection 2
		for (var j = 0; j < selection_2.length; j++) {
			curve_data.push(d3.transpose([plots_selected_time[i], 
					  plots_selected_data[i][selection_2[j]],
					  sel_2_color]));
		}; 
		
		return curve_data;
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

		// was it an valid zoom?
		if (extent[0][0] != extent[1][0] &&
			extent[0][1] != extent[1][1])
			{

			    // call server to get new subsample
                client.get_model_command(
                {
                    mid: mid,
                    type: "DAC",
                    command: "subsample_time_var",
                    parameters: [plots_selected[plot_id], max_time_points, extent[0][0], extent[1][0]],
                    success: function (result)
                        {
                            // update with higher resolution data
                            plots_selected_time[plot_id] = result["time_points"];
                            plots_selected_data[plot_id] = result["var_data"];

                            // toggle resolution indicator
                            toggle_resolution (plot_id, result["resolution"]);

                            // update data for d3
                            update_data(plot_id);

                            // user did zoom in on something, so reset window
				            x_scale[plot_id].domain([extent[0][0], extent[1][0]]);
				            y_scale[plot_id].domain([extent[0][1], extent[1][1]]);

                            // re-draw plot
                            draw_plot(plot_id);
                        },
                    error: function ()
                        {
                            dialog.ajax_error ('Server failure: could not subsample variable data.')("","","");
                        }

                });

		} else {  // reset zoom

            // reload data for full scale
            client.get_model_command(
            {
                mid: mid,
                type: "DAC",
                command: "subsample_time_var",
                parameters: [plots_selected[plot_id], max_time_points, "-Inf", "Inf"],
                success: function (result)
                {
                    // refresh with lowest resolution data
                    plots_selected_time[plot_id] = result["time_points"];
                    plots_selected_data[plot_id] = result["var_data"];

                    // toggle resolution indicator
                    toggle_resolution (plot_id, result["resolution"]);

                    // update d3 data in plot (scale is automatically reset)
                    update_data(plot_id);

                    // re-draw plot
                    draw_plot(plot_id);
                }
            });
		};
	};	

	// user clicked on a curve
	function select_curve (d,i)
	{
	    // find index of curve selected
	    var curve_id = null;
        if (d[0][2] == 0) {

            // we're in selection 1
            curve_id = selection_1[i];

        } else {

            // we're in selection 2
            curve_id = selection_2[i - selection_1.length];

        }

        // jump to curve selected in table
        var selectionEvent = new CustomEvent("DACActiveSelectionChanged", { detail: {
					                         active_sel: [curve_id]} });
        document.body.dispatchEvent(selectionEvent);

	}

	// update selections (and data) for all plots
	module.update_plots = function (new_sel_1, new_sel_2)
	{
		// update selections
		selection_1 = new_sel_1;
		selection_2 = new_sel_2;
		
		// re-draw all plots
		module.draw();
	}
	
	return module;
});
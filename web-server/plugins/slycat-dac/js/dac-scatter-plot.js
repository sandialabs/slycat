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
var curr_color_by_col = [];

// variables to use in analysis
var var_include_columns = null;

// show/hide filtered points (mask)
var filtered_selection = [];

// initial setup: read in MDS coordinates & plot
module.setup = function (MAX_POINTS_ANIMATE, SCATTER_BORDER,
	POINT_COLOR, POINT_SIZE, SCATTER_PLOT_TYPE,
	NO_SEL_COLOR, SELECTION_COLOR, SEL_FOCUS_COLOR,
	COLOR_BY_LOW, COLOR_BY_HIGH, COLORMAP,
	OUTLINE_NO_SEL, OUTLINE_SEL, VAR_INCLUDE_COLUMNS, 
	init_alpha_values, init_color_by_col, init_zoom_extent,
	init_subset_center)
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

	// set selection width
	outline_no_sel = OUTLINE_NO_SEL;
	outline_sel = OUTLINE_SEL;

	// include columns (variables and metadata)
	var_include_columns = VAR_INCLUDE_COLUMNS;

    // initialize local copy of filter mask
    filtered_selection = selections.get_filter_mask();

	// initialize curr_color_by data
	curr_color_by_col = init_color_by_col;
	
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
                        }

                        // default color scale
                        color_scale = d3.scale.linear()
                            .range([color_by_low, color_by_high])
                            .interpolate(d3.interpolateRgb);

                        // finish with plot
                        module.draw();

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

// toggle shift key flag
function key_flip() {
	selections.key_flip(d3.event.shiftKey);
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

	// set up coloring
	if (curr_color_by_col.length > 0) {

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
	}
	
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
		.attr("r", set_point_size);

		// Alex disabling mousedown handler since we are doing selection in a 
		// new layer now. Keeping around for debugging, but should be removed
		// after a few months.
		// .on("mousedown", (d,i) => {
			// sel_individual(d,i);
		// })

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
                        .attr("r", point_size * 1.5);

						// Alex disabling mousedown handler since we are doing selection in a 
						// new layer now. Keeping around for debugging, but should be removed
						// after a few months.
                        // .on("mousedown", defocus)

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
		.attr("height", set_point_size);

		// Alex disabling mousedown handler since we are doing selection in a 
		// new layer now. Keeping around for debugging, but should be removed
		// after a few months.
		// .on("mousedown", sel_individual)

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
                        .attr("height", point_size * 3);

						// Alex disabling mousedown handler since we are doing selection in a 
						// new layer now. Keeping around for debugging, but should be removed
						// after a few months.
                        // .on("mousedown", defocus)

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
	
	// check if MDS coords exist
	if (mds_coords.length > 0) 
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

	// no MDS coordinates indicates database may be offline
	} else {
		dialog.ajax_error ('Server failure: could not update MDS coords.')("","","");
	}

}

// routine to filter scatter plot using table filters
module.filter_plots = function ()
{

	// get filter button state
	var filter_button_on = selections.filter_button_status();

    // are we filtering or unfiltering?
    if (filter_button_on) {

        // restore unfiltered visualization
        for (var i = 0; i < filtered_selection.length; i++) {
            filtered_selection[i] = 1;
        }
        module.draw();

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

        // filter plots
        plots.draw();

    }

    // bookmark filter state (toggle filter button)
    var filterEvent = new CustomEvent("DACFilterButtonState",
                             { detail: {button_state: !filter_button_on,
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

    // unfilter plots
    plots.draw();

    // bookmark filter state
    var filterEvent = new CustomEvent("DACFilterButtonState",
                             { detail: {button_state: false,
                                        filter_mask: filtered_selection} });
    document.body.dispatchEvent(filterEvent);

}

// update color in scatter plot
module.update_color = function(new_color_by_col)
{
	// set curr color by data vector
	curr_color_by_col = new_color_by_col;

	// update plot
	module.draw()

}

// zoom handler call back
function zoom()
{

	// find final selection indices
	var extent = d3.event.target.extent();

	// look for points that were selected
	var selection = get_brush_sel(extent);

    // was it an empty zoom?
    if (selection.length > 0) {
			// user did zoom in on something, so reset window
			x_scale.domain([extent[0][0], extent[1][0]]);
			y_scale.domain([extent[0][1], extent[1][1]]);

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
    d3.selectAll('#dac-selector-svg .brush').call(d3.event.target);

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
	var selection = get_brush_sel(extent);

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

		// check that subset is non-empty
		if (mds_subset.every(item => item === 0)) {

			// otherwise reset subset
			for (var i = 0; i < mds_coords.length; i++) {
				mds_subset[i] = 1;

			}
			subset_flag = false;
		}
		
	}

	// remove gray selection box
	d3.event.target.clear();
	d3.selectAll('#dac-selector-svg .brush').call(d3.event.target);

	// fire subset changed event
	var subsetEvent = new CustomEvent("DACSubsetChanged", { detail: {
										 new_subset: mds_subset,
										 subset_center: subset_center,
										 subset_flag: subset_flag,
										 zoom: reset_zoom} });
	document.body.dispatchEvent(subsetEvent);
}

// get user selected points from a d3 brush
function get_brush_sel(extent)
{

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

	return selection;
}

// reset zoom, accessible to ui controller
module.reset_zoom = function ()
{
	// reset zoom to full screen
	var extent = [[0 - scatter_border, 0 - scatter_border],
	              [1 + scatter_border, 1 + scatter_border]];
	x_scale.domain([extent[0][0], extent[1][0]]);
	y_scale.domain([extent[0][1], extent[1][1]]);

	// reset zoom in bookmarks
	var zoomEvent = new CustomEvent("DACZoomChanged",
		{detail: {extent: extent, zoom: false}});
	document.body.dispatchEvent(zoomEvent);

}

// Alex disabling this beacause it's not used anymore
// but might be useful in the future to update selected points
// instead of re-rendering the entire scatterplot.
// selection brush handler call back
// function sel_brush()
// {
// 	gray real-time selection box
// 	var extent = d3.event.target.extent();

// 	scatter_points.attr("stroke", function(d,i) {

// 		// default fill
// 		var outline_color = no_sel_color;

// 		// if newly selected, fill color is current selection color
// 		if (extent[0][0] <= d[0] && d[0] < extent[1][0]
// 			&& extent[0][1] <= d[1] && d[1] < extent[1][1]) {

// 				// use curr_sel_type to identify color
// 				var curr_sel_type = selections.sel_type();
// 				if (curr_sel_type > 0) {
// 				    outline_color = sel_color[curr_sel_type-1]
// 				}

// 		} else {

// 			// color everything else according to what's already selected
//             for (var j = 0; j < max_num_sel; j++) {
//                 if (selections.in_sel_x(i,j+1) != -1) {
//                     outline_color = sel_color[j]
//                 }
//             }

// 		};

// 		return outline_color;
// 	});

// 	scatter_points.attr("stroke-width", function(d,i) {

// 		// default outline width
// 		var outline_width = outline_no_sel;

// 		// if newly selected, outline is thick
// 		if (extent[0][0] <= d[0] && d[0] < extent[1][0]
// 			&& extent[0][1] <= d[1] && d[1] < extent[1][1]) {

// 				outline_width = outline_sel;

// 		} else {

// 			// outline is also thick for things that were previously selected
// 			if (selections.in_sel(i)) {
// 				outline_width = outline_sel;
// 			};

// 		};

// 		return outline_width;
// 	});

// 	// different point sizes for circles or squares
// 	if (scatter_plot_type == 'circle') {
// 			scatter_points.attr("r", set_sel_point_size);
// 	} else {
// 			scatter_points.attr("width", set_sel_point_size);
// 		scatter_points.attr("height", set_sel_point_size);
// 	}

// }

// helper function for sel_brush_start
// to determine point size when selected
// function set_sel_point_size (d,i)
// {

// 	// gray real-time selection box
// 	var extent = d3.event.target.extent();

//     // default point size
//     var sel_point_size = compute_point_size (false);

//     // if newly selected, outline is thick
//     if (extent[0][0] <= d[0] && d[0] < extent[1][0]
//         && extent[0][1] <= d[1] && d[1] < extent[1][1]) {

//             sel_point_size = compute_point_size (true);

//     } else {

//         // outline is also thick for things that were previously selected
//         if (selections.in_sel(i)) {

//             sel_point_size = compute_point_size (true);
//         };

//     };

//     return sel_point_size;

// }

// selection brush end handler call back
function sel_brush_end()
{

	// find final selection indices
	var extent = d3.event.target.extent();

	// clear existing selection if we are not zoom or subset
	if(selections.sel_type() !== 0 && selections.sel_type() !== -1)
	{
		selections.zero_sel();
	}

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
	d3.selectAll('#dac-selector-svg .brush').call(d3.event.target);

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

		// default to active subset
		var subset_flag = true;

		// remove point from subset
		mds_subset[i] = 0;

		// check that we didn't just remove the last point
		if (!mds_subset.some(item => item !== 0)) {

			// otherwise reset subset
			for (var i = 0; i < mds_coords.length; i++) {
				mds_subset[i] = 1;

			}
			subset_flag = false;

		}

		// fire subset changed event
		var subsetEvent = new CustomEvent("DACSubsetChanged", { detail: {
											new_subset: mds_subset,
											subset_flag: subset_flag} });
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

// set up subset change event
document.body.addEventListener("DACBrushReady", (eventData) => {

	// Registering event handlers for new brush
	const brush = eventData.detail.brush;
	brush.on("brushend", brushend);

});

function brushend(someevent) {

	// enable zoom
	if (selections.sel_type() == 0) 
	{
		// set up zoom brushing
		zoom();
	}

	// subset
	else if (selections.sel_type() == -1) 
	{
		// set up subset selection
		subset();
	} 
	
	// selection (either through click or brush)
	else 
	{
		// otherwise enable normal selection
		var extent = d3.event.target.extent();

		// Check if extent is zero, meaning it was just a click not a selection
		if(extent[0][0] == extent[1][0] && extent[0][1] == extent[1][1])
		{
			// console.debug(`This was just a click, not a selection.`)
			// Let's figure out where the click happened
			const event = d3.event.sourceEvent;
			const x = event.pageX;
			const y = event.pageY;
			// console.debug(`Click occurred here: %o, %o`, x, y);

			// Find all the elements under the point
			const elements = document.elementsFromPoint(x, y);
			// console.debug(`elementsFromPoint is %o`, elements);

			// Grab the first circle
			// const points = $(elements).filter('#dac-mds-scatterplot circle, #dac-mds-scatterplot rect.square');
			const point = $(elements).filter('#dac-mds-scatterplot circle, #dac-mds-scatterplot rect.square').get(0);
			// console.debug(`points in elementsFromPoint: %o`, points);
			// console.debug(`point in elementsFromPoint: %o`, point);
			// console.debug(`selections.sel_type() is %o`, selections.sel_type());

			// select individual point
			if(point)
			{
				const d = d3.select(point).data()[0];
				const i = d[2];
				// console.debug(`our cicle has i=%o`, i);
				
				sel_individual(d,i);
			}

			// Otherwise, if there was nothing under the click, clear selection if we are not zoom or subset
			else if(selections.sel_type() !== 0 && selections.sel_type() !== -1)
			{

				// console.debug(`inside else if(selections.sel_type() !== 0 && selections.sel_type() !== -1)`);
				selections.zero_sel();
				// fire selection change event
				var selectionEvent = new CustomEvent("DACSelectionsChanged", { detail: {
								active_sel: []} });
				document.body.dispatchEvent(selectionEvent);

			}
		}

		// Otherwise handle brush selection
		else
		{
			sel_brush_end();
		}
	}
}

export default module;

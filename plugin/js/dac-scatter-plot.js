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
var fisher_order = null;
var fisher_pos = null;

// has the difference button ever been used?
var diff_button_used = null;

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
var sel_1_color = null;
var sel_2_color = null;
var focus_color = null;
var no_sel_color = null;

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
var cont_colormap = null;
var disc_colormap = null;

// color by selection menu (default is "Do Not Color")
var curr_color_by_sel = -1;
var curr_color_by_col = [];
var color_by_cols = [-1];
var color_by_names = ["Do Not Color"];
var color_by_type = [];
var max_color_by_name_length = null;

// variables to use in analysis
var var_include_columns = null;

// initial setup: read in MDS coordinates & plot
module.setup = function (MAX_POINTS_ANIMATE, SCATTER_BORDER,
	POINT_COLOR, POINT_SIZE, SCATTER_PLOT_TYPE,
	NO_SEL_COLOR, SELECTION_1_COLOR, SELECTION_2_COLOR,
	SEL_FOCUS_COLOR, COLOR_BY_LOW, COLOR_BY_HIGH, CONT_COLORMAP,
	DISC_COLORMAP, MAX_COLOR_NAME, OUTLINE_NO_SEL, OUTLINE_SEL,
	datapoints_meta, meta_include_columns, VAR_INCLUDE_COLUMNS,
	init_alpha_values, init_color_by_sel, init_zoom_extent,
	init_subset_center, init_mds_subset)
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
	sel_1_color = SELECTION_1_COLOR;
	sel_2_color = SELECTION_2_COLOR;
	focus_color = SEL_FOCUS_COLOR;
	scatter_plot_type = SCATTER_PLOT_TYPE;

	// set colors for scaling
	color_by_low = COLOR_BY_LOW;
	color_by_high = COLOR_BY_HIGH;
	cont_colormap = CONT_COLORMAP;
	disc_colormap = DISC_COLORMAP;

	// set maximum color by name length
	max_color_by_name_length = MAX_COLOR_NAME;

	// set selection width
	outline_no_sel = OUTLINE_NO_SEL;
	outline_sel = OUTLINE_SEL;

	// include columns (variables and metadata)
	var_include_columns = VAR_INCLUDE_COLUMNS;

    // set selection type button
    var dac_sel_button_ids = ["#dac-scatter-button-zoom",
                              "#dac-scatter-button-sel-1",
                              "#dac-scatter-button-sel-2",
                              "#dac-scatter-button-subset"];
    $(dac_sel_button_ids[selections.sel_type()]).addClass("active");

	// set up selection button colors
	$("#dac-scatter-button-sel-1").css("color", sel_1_color);
	$("#dac-scatter-button-sel-2").css("color", sel_2_color);

	// bind selection/zoom buttons to callback operations
	$("#dac-scatter-button-sel-1").on("click",
		function() { selections.set_sel_type(1); module.draw(); });
	$("#dac-scatter-button-sel-2").on("click",
		function() { selections.set_sel_type(2); module.draw(); });
	$("#dac-scatter-button-subset").on("click",
		function() { selections.set_sel_type(3); module.draw(); })
	$("#dac-scatter-button-zoom").on("click",
		function() { selections.set_sel_type(0); module.draw(); });

	// bind difference buttons to callback
	$("#dac-previous-three-button").on("click", previous_three);
	$("#dac-scatter-diff-button").on("click", diff_button);
	$("#dac-next-three-button").on("click", next_three);

	// difference button has not yet been used
	diff_button_used = false;

    // set up color by menu

	// look for columns with numbers/strings for color by menu
	for (var i = 0; i < datapoints_meta["column-count"]; i++)
	{

		// we accept number and string data, only for included columns
		if ((meta_include_columns.indexOf(i) != -1) &&
			((datapoints_meta["column-types"][i] == "float64") ||
			(datapoints_meta["column-types"][i] == "string"))) {
			color_by_type.push(datapoints_meta["column-types"][i]);
			color_by_cols.push(i);

			// make sure names aren't too long (if they are then truncate)
			var name_i = datapoints_meta["column-names"][i];
			if (name_i.length > max_color_by_name_length) {
				name_i = name_i.substring(0,max_color_by_name_length) + " ...";
			}
			color_by_names.push(name_i);
		};

	};

    // check init color by value (make sure it fits on list)
    if (init_color_by_sel >= (color_by_names.length-1)) {
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
            if (init_mds_subset.length == 0) {
                for (i = 0; i < mds_coords.length; i++) {
                    mds_subset.push(1);
                }
            } else {
                mds_subset = init_mds_subset;
            }
            selections.update_subset(mds_subset);

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

// entirely redraws points (including selection, using circles)
function draw_circles ()
{
	// erase any old points
	scatter_plot.selectAll("circle").remove();

	// remove old focus point
	scatter_plot.selectAll(".focus").remove();

	// input new points
	scatter_points = scatter_plot.selectAll("circle")
		.data(mds_coords)
		.enter()
		.append("circle")

	// make sure they are colored according to selections
	scatter_points.attr("stroke", function(d,i) {

		// default is point_color
		var outline_color = no_sel_color;

		if (selections.in_sel_1(i) != -1) {
			outline_color = sel_1_color;
		}
		if (selections.in_sel_2(i) != -1) {
			outline_color = sel_2_color;
		}

		return outline_color;
	});

	// selections get thicker outline
	scatter_points.attr("stroke-width", function(d,i) {

		// default stroke-width is 1
		var outline_width = outline_no_sel;

		// selected width is 2
		if (selections.in_sel_1(i) != -1 ||
			selections.in_sel_2(i) != -1) {
			outline_width = outline_sel;
		}

		return outline_width;
	});

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
		.attr("r", point_size)
		.on("mousedown", sel_individual);

	// draw new focus circle, if needed
	if (selections.focus() != null) {

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
					.attr("class", "focus")
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
					.attr("r", point_size)
					.on("mousedown", defocus);

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
		.data(mds_coords)
		.attr("class", "square")
		.enter()
		.append("rect")
		.attr("class", "square");

	// make sure they are colored according to selections
	scatter_points.attr("stroke", function(d,i) {

		// default is point_color
		var outline_color = no_sel_color;

		if (selections.in_sel_1(i) != -1) {
			outline_color = sel_1_color;
		}
		if (selections.in_sel_2(i) != -1) {
			outline_color = sel_2_color;
		}

		return outline_color;
	});

	// selections get thicker outline
	scatter_points.attr("stroke-width", function(d,i) {

		// default stroke-width is 1
		var outline_width = outline_no_sel;

		// selected width is 2
		if (selections.in_sel_1(i) != -1 ||
			selections.in_sel_2(i) != -1) {
			outline_width = outline_sel;
		}

		return outline_width;
	});

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
		.attr("width", point_size*2)
		.attr("height", point_size*2)
		.on("mousedown", sel_individual);

	// draw new focus rect, if needed
	if (selections.focus() != null) {

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
					.attr("class", "focus")
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
					.attr("width", point_size*2)
					.attr("height", point_size*2)
					.on("mousedown", defocus);

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

				// update the data in d3 (using either cirlces or squares)
				scatter_plot.selectAll(scatter_plot_type)
					.data(mds_coords);

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
		var differenceEvent = new CustomEvent("DACDifferenceComputed",
											  {detail: fisher_order.slice(prev_pos)});
		document.body.dispatchEvent(differenceEvent);

		// enable next button
		$("#dac-next-three-button").removeClass("disabled");

		// update position in list
		fisher_pos = prev_pos;

		// check if there are any further positions
		if (fisher_pos - 3 < 0) {

			// if not, disable previous button
			$("#dac-previous-three-button").addClass("disabled");
		}
	}

}

// difference button
var diff_button = function()
{

	// inactivate button
	$("#dac-scatter-diff-button").prop("active", false);

	// make sure there are two selections
	if (selections.len_sel_1() <= 1 ||
		selections.len_sel_2() <= 1)
	{
		dialog.ajax_error
		('Please make sure both red and blue selections have two or more points before computing the difference.')
		("","","");
		return;
	}

	// call server to compute Fisher values for time series
	var sel_1 = selections.sel_1();
	var sel_2 = selections.sel_2();
	client.post_sensitive_model_command(
	{
		mid: mid,
		type: "DAC",
		command: "compute_fisher",
		parameters: {selection_1: sel_1,
					 selection_2: sel_2,
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

				// disable previous three button
				$("#dac-previous-three-button").addClass("disabled");

				// difference button has been used (show as synced)
				module.toggle_difference(true);

				// if we have more than three variable, enable next three button
				if (fisher_inds.length > 3) {
					$("#dac-next-three-button").removeClass("disabled");
				}

				// fire difference event
				var differenceEvent = new CustomEvent("DACDifferenceComputed",
													  { detail: fisher_inds });
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
		var differenceEvent = new CustomEvent("DACDifferenceComputed",
											  {detail: fisher_order.slice(next_pos)});
		document.body.dispatchEvent(differenceEvent);

		// enable previous button
		$("#dac-previous-three-button").removeClass("disabled");

		// update position in list
		fisher_pos = next_pos;

		// check if there are any further positions
		if (fisher_pos + 3 >= fisher_order.length) {

			// if not, disable next button
			$("#dac-next-three-button").addClass("disabled");
		}
	}
}

// toggle difference button indicator to show desired state
// true = synced, false = out of sync
module.toggle_difference = function (desired_state)
{

	if (desired_state == true) {

		// set difference indicator to synced
		$("#dac-selection-synced").show();
		$("#dac-selection-not-synced").hide();

		// difference button has been used
		diff_button_used = true;

	} else if (diff_button_used == true) {

		// set difference state to out of sync
		$("#dac-selection-synced").hide();
		$("#dac-selection-not-synced").show();
	}
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
											  {detail: select_col});
		    document.body.dispatchEvent(colorbyEvent);

		});

}

// set up coloring for scatter plot
function color_plot(select_col)
{

    // set up coloring
    if (select_col == -1) {

        // revert to no color & re-draw
        curr_color_by_col = [];
        module.draw();

    } else {

        // request new data from server
        $.when(request.get_table("dac-datapoints-meta", mid)).then(
            function (data)
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

                    // set colormap to discrete color map if present
                    if (disc_colormap == null) {

                        // revert to default color map
                        color_scale = d3.scale.linear()
                            .range([color_by_low, color_by_high])
                            .interpolate(d3.interpolateRgb);

                    } else {

                        // use selected color brewer scale
                        color_scale = d3.scale.quantize()
                            .range(disc_colormap);

                    };

                } else {

                    // get selected column from data base (number data)
                    curr_color_by_col = data["data"][select_col];

                    // set colormap to continuous color map if present
                    if (cont_colormap == null) {

                        // revert to default color map
                        color_scale = d3.scale.linear()
                            .range([color_by_low, color_by_high])
                            .interpolate(d3.interpolateRgb);

                    } else {

                        // use selected color brewer scale
                        color_scale = d3.scale.quantize()
                            .range(cont_colormap);

                    };

                }

                // get max and min of appropriate column in metadata table
                var max_color_val = d3.max(curr_color_by_col);
                var min_color_val = d3.min(curr_color_by_col);

                // set domain of color scale
                color_scale.domain([min_color_val, max_color_val]);

                // draw new color scale
                module.draw();

            },
            function ()
            {
                dialog.ajax_error ('Server failure: could not load color by data column.')("","","");
            }
        );
    };

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

	} else if (selections.sel_type() == 3) {

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

	// reset scale (assumed nothing zoomed)
	module.reset_zoom();

    // was it an empty zoom?
    if (extent[0][0] != extent[1][0] &&
        extent[0][1] != extent[1][1])
    {
        // user did zoom in on something, so reset window
        x_scale.domain([extent[0][0], extent[1][0]]);
        y_scale.domain([extent[0][1], extent[1][1]]);

        // fire zoom changed event
        var zoomEvent = new CustomEvent("DACZoomChanged",
                                          {detail: extent});
        document.body.dispatchEvent(zoomEvent);
    };

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
				// save current selection
				selection.push(i);
			};
	};

	// save current center for scaling
	var subset_extent = d3.transpose([x_scale.domain(), y_scale.domain()]);

	// compute subset center
	subset_center = [(subset_extent[0][0] + subset_extent[1][0])/2.0,
					 (subset_extent[0][1] + subset_extent[1][1])/2.0];

	// default to leave zoom alone
	var reset_zoom = false;

	// separate into inclusion and exclusion based on shift key
	if (!selections.shift_key())
	{

		// if nothing is included, we reset to all data
		if (selection.length == 0) {
			for (var i = 0; i < mds_coords.length; i++) {
				mds_subset[i] = 1;
			}
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
				//x_scale.domain([0 - scatter_border, 1 + scatter_border]);
				//y_scale.domain([0 - scatter_border, 1 + scatter_border]);
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

	// fire subset changed event
	var subsetEvent = new CustomEvent("DACSubsetChanged", { detail: {
										 new_subset: mds_subset,
										 subset_center: subset_center,
										 zoom: reset_zoom} });
	document.body.dispatchEvent(subsetEvent);
}

// reset zoom, accessable to ui controller
module.reset_zoom = function ()
{
	// reset zoom to full screen
	var extent = [[0 - scatter_border, 0 - scatter_border],
	              [1 + scatter_border, 1 + scatter_border]];
	x_scale.domain([extent[0][0], extent[1][0]]);
    y_scale.domain([extent[0][1], extent[1][1]]);

	// reset zoom in bookmarks
    var zoomEvent = new CustomEvent("DACZoomChanged",
                                      {detail: extent});
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
				if (selections.sel_type() == 1) {
					outline_color = sel_1_color;
				} else {
					outline_color = sel_2_color;
				}

		} else {

			// color everything else according to what's already selected
			if (selections.in_sel_1(i) != -1) {
				outline_color = sel_1_color;
			};

			if (selections.in_sel_2(i) != -1) {
				outline_color = sel_2_color;
			};
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
			if (selections.in_sel_1(i) != -1 ||
				selections.in_sel_2(i) != -1) {
				outline_width = outline_sel;
			};

		};

		return outline_width;
	});

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

				// save current selection
				selections.update_sel(i);
				selection.push(i);

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

	// check for subset exclusion
	if (selections.sel_type() == 3) {

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

// perform subset exclusion (assuming we're in subset mode)
function exclude_individual (i) {

	// check for shift key (to exclude a single point)
	if (selections.shift_key()) {

		// remove point from subset
		mds_subset[i] = 0;

		// fire subset changed event
		var subsetEvent = new CustomEvent("DACSubsetChanged", { detail: {
											new_subset: mds_subset} });
		document.body.dispatchEvent(subsetEvent);

	// otherwise it's a focus event
	} else {

		selections.change_focus(i);
	}

}

// de-select currently focused point
function defocus() {

	// check to see if we're in selection mode
	if ((selections.sel_type() == 3) && selections.shift_key()) {

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

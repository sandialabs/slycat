// This function contains code for displaying the scatter plot
// for dial-a-cluster.  Code includes setup, and resizing the 
// jQuery UI layout pane and buttons for selection/zoom and coloring.
//
// NOTE: This routine assume the coordinates returned by MDS always
// lie within a box [0,1]^3.
//
// S. Martin
// 1/27/2015

define ("dac-scatter-plot", ["slycat-web-client", "slycat-dialog",
    "dac-request-data", "dac-manage-selections", "jquery", "d3", "URI"],
	function(client, dialog, request, selections, $, d3, URI) {
	
	// public functions will be returned via the module variable
	var module = {};
	
	// private variable containing MDS coordinates
	var mds_coords = [];

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
	var sel_1_color = null;
	var sel_2_color = null;
	
	// outline width for selections
	var outline_no_sel = null;
	var outline_sel = null;
	
	// colors to use for scaling
	var color_by_low = null;
	var color_by_high = null;
	
	// color by selection menu (default is "Do Not Color")
	var curr_color_by_sel = -1;
	var curr_color_by_col = [];
	var color_by_cols = [-1];
	var color_by_names = ["Do Not Color"];
	
	// initial setup: read in MDS coordinates & plot
	module.setup = function (MAX_POINTS_ANIMATE, SCATTER_BORDER, 
		POINT_COLOR, POINT_SIZE, NO_SEL_COLOR, SELECTION_1_COLOR, SELECTION_2_COLOR,
		COLOR_BY_LOW, COLOR_BY_HIGH, OUTLINE_NO_SEL, OUTLINE_SEL, datapoints_meta)
	{
	
		// set the maximum number of points to animate, maximum zoom factor
		max_points_animate = MAX_POINTS_ANIMATE;
		
		// set scatter border size
		scatter_border = SCATTER_BORDER;
		
		// set the colors to use for selections
		point_color = POINT_COLOR;
		point_size = POINT_SIZE;
		no_sel_color = NO_SEL_COLOR;
		sel_1_color = SELECTION_1_COLOR;
		sel_2_color = SELECTION_2_COLOR;
		
		// set colors for scaling
		color_by_low = COLOR_BY_LOW;
		color_by_high = COLOR_BY_HIGH;
		
		// set selection width
		outline_no_sel = OUTLINE_NO_SEL;
		outline_sel = OUTLINE_SEL;
		
		// set up selection button colors
		$("#dac-scatter-button-sel-1").css("color", sel_1_color);
		$("#dac-scatter-button-sel-2").css("color", sel_2_color);
		
		// set default selection type
		selections.set_sel_type(1);
		
		// bind selection/zoom buttons to callback operations
		$("#dac-scatter-button-sel-1").on("click", 
			function() { selections.set_sel_type(1); module.draw() });
		$("#dac-scatter-button-sel-2").on("click", 
			function() { selections.set_sel_type(2); module.draw(); });
		$("#dac-scatter-button-zoom").on("click", 
			function() { selections.set_sel_type(0); module.draw(); });
		
		// bind difference button to callback
		$("#dac-scatter-diff-button").on("click", diff_button);
		
		$.when (request.get_array("dac-mds-coords", 0)).then(
			function (mds_data)
			{
			
				// input data into model
				mds_coords = mds_data;

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
				color_scale = d3.scale.linear()
					.range([color_by_low, color_by_high])
					.interpolate(d3.interpolateRgb);
				
				module.draw();
											
			},
			function ()
			{
				dialog.ajax_error ("Server failure: could not load MDS coords.")("","","");
			}
		);
		
		// set up color by selection

		// look for columns with numbers for color by menu
		for (var i = 0; i < datapoints_meta["column-count"]; i++)
		{
			if (datapoints_meta["column-types"][i] == "float64") {
				color_by_cols.push(i);
				color_by_names.push(datapoints_meta["column-names"][i]);
			};
		};
				
		// populate pull down menu
		display_pull_down.bind($("#dac-scatter-select"))();

	}
	
	// toggle shift key flag
	function key_flip() {
		selections.key_flip(d3.event.shiftKey, d3.event.metaKey);
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
		
		// brush has to be under points for selection, but on top for zoom
		if (selections.sel_type() == 0) {
			draw_points();
			sel_zoom_buttons();
		} else {
			sel_zoom_buttons();
			draw_points();
		}

	}
	
	// entirely redraws points (including selection)
	function draw_points ()
	{
		// erase any old points
		scatter_plot.selectAll("circle").remove();
		
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
			
	}
	
	// animate if MDS coordinates have changed, or for zoom (private)
	animate = function ()
	{
		// assume that only data has changed, scale should still be OK
		scatter_points.transition()
			.attr("cx", function(d) {
			return x_scale(d[0])
			})
			.attr("cy", function(d) {
				return y_scale(d[1])
			})
			.attr("r", point_size);
		
	}
	
	// updates the MDS coords given new alpha values
	module.update = function (alpha_values)
	{
				
		// call server to compute new coords
		client.get_model_command(
		{
			mid: mid,
      		type: "DAC",
			command: "update_mds_coords",
			parameters: alpha_values,
			success: function (result)
				{
					// record new values in mds_coords
					mds_coords = result["mds_coords"];
					
					// update the data in d3
					scatter_plot.selectAll("circle")
						.data(mds_coords);					
						
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
	
	// difference button
	diff_button = function()
	{
		
		// make sure there are two selections
		if (selections.len_sel_1() <= 1 &&
			selections.len_sel_2() <= 1)
		{
			dialog.ajax_error
			('Please make sure both red and blue selections have two or more points before computing the difference.')
			("","","");
			return;
		}
		
		// add dummy -1 to enforce passing arrays
		var sel_1 = selections.sel_1().concat(-1);
		var sel_2 = selections.sel_2().concat(-1);

		// call server to compute Fisher values for time series
		client.get_model_command(
		{
			mid: mid,
			type: "DAC",
			command: "compute_fisher",
			parameters: [sel_1, sel_2],
			success: function (result)
				{

					// compute Fisher's discriminant for each time series separately
					var fisher_disc = result["fisher_disc"];
					
					// sort Fisher's discriminant values and adjust plot order
					var fisher_inds = sort_indices(fisher_disc);

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

	// routine to return sort array and return indices
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
		
		// isolate indices
		var indices = [];
		for (var j in arr_with_index) {
		    indices.push(arr_with_index[j][1]);
		}
		
		// return only indices
		return indices;
		
	}
	
	display_pull_down = function()
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
		this.val(-1)
		
		// define action for changing menu
		this.change(function()
			{
				// get column to color by
				var select_col = Number(this.value);
				curr_color_by_sel = select_col;
				
				// set up coloring
				if (select_col == -1) {
				
					// revert to no color & re-draw
					curr_color_by_col = [];
					draw_points();
					
				} else {
				
					// request new data from server
					$.when(request.get_table("dac-datapoints-meta")).then(
						function (data)
						{
							// get selected column from data base
							curr_color_by_col = data["data"][select_col];
													
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
				}
				
			});
				
	}
	
	// set callback for selection 1,2, or zoom radio buttons
	sel_zoom_buttons = function()
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
					
		} else {
		
			// otherwise enable selection
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
		x_scale.domain([0 - scatter_border, 1 + scatter_border]);
		y_scale.domain([0 - scatter_border, 1 + scatter_border]);
						
		for (var i = 0; i < mds_coords.length; i++)
			{
					
				// was it an empty zoom?
				if (extent[0][0] != extent[1][0] &&
					extent[0][1] != extent[1][1])
				{
					// user did zoom in on something, so reset window
					x_scale.domain([extent[0][0], extent[1][0]]);
					y_scale.domain([extent[0][1], extent[1][1]]);	
				};

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

					// remove gray selection box
					d3.event.target.clear();
					d3.select(this).call(d3.event.target);
				};
		};

		// fire selection change event
		var selectionEvent = new CustomEvent("DACSelectionsChanged", { detail: {
					                         sel_1: selections.sel_1(),
					                         sel_2: selections.sel_2(),
					                         active_sel: selection} });
        document.body.dispatchEvent(selectionEvent);
	}
	
	// select an individual point
	function sel_individual (d,i)
	{
		// zero out current selection (unless shift key is down)
		selections.zero_sel();
				
		// update selection
		selections.update_sel(i);
		
		// re-draw scatter plot
		draw_points();

		// fire selection change event
		var selectionEvent = new CustomEvent("DACSelectionsChanged", { detail: {
					                         sel_1: selections.sel_1(),
					                         sel_2: selections.sel_2(),
					                         active_sel: [i]} });
        document.body.dispatchEvent(selectionEvent);
	}
		
	return module;
	
});

// This script contains the code for managing the alpha sliders on the left
// hand side of the user interface for dial-a-cluster.  The setup requires
// the ALPHA_STEP parameter defined in dac-ui.js.

// S. Martin
// 1/15/2015

define ("dac-alpha-sliders", ["jquery", "dac-request-data", "dac-scatter-plot"], 
	function($, request, scatter_plot) {
	
	// return functions in module variables
	var module = {};
	
	// private variables
	var alpha_num = null;
	var alpha_names = null;
	var alpha_values = null;
	var alpha_order = null;
	
	module.setup = function (ALPHA_STEP)
	{
		// load up alpha names, alpha values, and alpha order
		$.when(request.get_table_metadata("dac-variables-meta"),
		   	   request.get_table("dac-variables-meta"),
		   	   request.get_parameters("dac-alpha-parms"),
		   	   request.get_parameters("dac-alpha-order")).then(
			function (variables_metadata, variables_data, alpha_parms, alpha_slider_order)
			{

				// sort out the information we need
				alpha_num = variables_metadata[0]["row-count"];
				alpha_names = variables_data[0]["data"][0];
				alpha_values = alpha_parms[0];
				alpha_order = alpha_slider_order[0];
			
				// write out list of sliders to html file
				display_alpha_sliders.bind($("#dac-alpha-sliders"))(ALPHA_STEP);
			
				// make sliders sortable
				$("#dac-alpha-sliders").sortable();	
			},
			function ()
			{
				alert("Could not load alpha parameters.");
			}
		);
	}

	// populate alpha sliders with relevant labels, in order, and with values
	function display_alpha_sliders(ALPHA_STEP)
	{
		this.empty();
			
		// display alpha sliders
		for (var i = 0; i != alpha_num; ++i)
		{
			// write out in alpha_order
			var j = alpha_order[i];
			
			// generate the slider in the HTML 
			var list_item = $('<li class="dac-alpha-slider">').appendTo(this);
			var label_item = $('<label for="dac-slider-' + j + '">').appendTo(list_item);
			var input_item = $('<input type="range" id="dac-alpha-slider-' + 
					j + '" step="' + ALPHA_STEP + '" min="0" max="1" value="' +
					alpha_values[j] + '">').appendTo(list_item);
			label_item.text(alpha_names[j]);
			
			// define action if slider is moved
			input_item.change(function ()
				{
					// determine slider id and new value
					var slider_id_str = this.id;
					var slider_id = Number(slider_id_str.split("-").pop());
					var slider_value = Number(this.value);
					
					// set new value in alpha variables
					alpha_values[slider_id] = slider_value;
					
					// update MDS coords
					scatter_plot.update(alpha_values);
				});
		};
	}
	
	// zero out all the sliders, and re-plot MDS coords
	module.set_alpha_values = function (new_alpha_values)
	{
		// copy new values and reset sliders
		for (var i = 0; i != alpha_num; ++i) {
			alpha_values[i] = new_alpha_values[i];
			$("#dac-alpha-slider-" + i).val(alpha_values[i]);
		}
		
		// update MDS coords & re-draw
		scatter_plot.update(alpha_values);	
	}
	return module;
	
});
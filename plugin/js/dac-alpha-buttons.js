// This script contains the code for managing the alpha buttons on the left
// hand side of the user interface for dial-a-cluster.  The .setup() function
// should be called first to initialize the private variables.
//
// S. Martin
// 2/12/2015

define ("dac-alpha-buttons", ["slycat-web-client", "slycat-dialog", "jquery",
    "dac-request-data", "dac-manage-selections"],
function(client, dialog, $, request, selections) {
	
	// return functions in module variables
	var module = {};
	
	// private variables
	var alpha_num = null;
	var alpha_clusters = null;
	
	// zero out all alpha sliders
	var zero_button_callback = function ()
	{

		// create zero array
		var zero_array = new Array(alpha_num);
		for (var i = 0; i != alpha_num; ++i) {
			zero_array[i] = 0.0;
		}

	    // fire alpha value change event
		var alphaEvent = new CustomEvent("DACAlphaValuesChanged",
			{ detail: zero_array });
        document.body.dispatchEvent(alphaEvent);

	}
	
	// put all alpha sliders to one
	var ones_button_callback = function ()
	{
		// create array of ones
		var ones_array = new Array(alpha_num);
		for (var i = 0; i != alpha_num; ++i) {
			ones_array[i] = 1.0;
		}
				
	    // fire alpha value change event
		var alphaEvent = new CustomEvent("DACAlphaValuesChanged",
			{ detail: ones_array });
        document.body.dispatchEvent(alphaEvent);
	}
	
	// cluster button modifies alpha values according to selections
	var cluster_button_callback = function ()
	{
		// get current color by column
		var color_by_col = $("#dac-scatter-select").val();

		// make sure it is not empty
		if (color_by_col == -1)
		{
			dialog.ajax_error('Please select a color (from the "Do Not Color" pulldown) for clustering.')
			    ("","","");
			return;
		}

	    // fire alpha value change event with pre-computed alpha values for selected column
		var alphaEvent = new CustomEvent("DACAlphaValuesChanged",
			{ detail: alpha_clusters[color_by_col] });
        document.body.dispatchEvent(alphaEvent);

	}
	
	module.setup = function (num_sliders)
	{

		// determine number of alpha sliders
        alpha_num = num_sliders;
		
		// load up cluster alpha values
		$.when (request.get_array("dac-alpha-clusters", 0)).then(
			function (alpha_cluster_data)
			{	
				// input data into model
				alpha_clusters = alpha_cluster_data;
			},
			function ()
			{
			    dialog.ajax_error("Server failure: could not alpha cluster values.")("","","");
			}
		);
		
		// set up callback for zero all alpha button
		var zero_button = document.querySelector("#dac-alpha-zero-button");
		zero_button.addEventListener("click", zero_button_callback);
		
		// set up callback for all ones alpha button
		var ones_button = document.querySelector("#dac-alpha-one-button");
		ones_button.addEventListener("click", ones_button_callback);
		
		// set up callback for cluster button
		var cluster_button = document.querySelector("#dac-alpha-cluster-button");
		cluster_button.addEventListener("click", cluster_button_callback);
		
	}
	
	return module;
	
});
// This script contains the code for managing the alpha buttons on the left
// hand side of the user interface for dial-a-cluster.  The .setup() function
// should be called first to initialize the private variables.
//
// S. Martin
// 2/12/2015

import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import request from "./dac-request-data.js";
import URI from "urijs";

// return functions in module variables
var module = {};

var mid = URI(window.location).segment(-1);

// private variables
var alpha_num = null;
var alpha_clusters = null;

// which columns to include
var var_include_columns = null;

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
	// create array of ones (use zeros for non-included columns)
	var ones_array = new Array(alpha_num);
	for (var i = 0; i != alpha_num; ++i) {

		if (var_include_columns.indexOf(i) != -1) {
			ones_array[i] = 1.0;
		} else {
			ones_array[i] = 0.0;
		}

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

    // check for editable column col
    if (color_by_col >= alpha_clusters.length) {

        // re-compute alpha values for editable column
        client.post_sensitive_model_command(
        {
            mid: mid,
            type: "DAC",
            command: "update_alpha_clusters",
            parameters: {update_col: color_by_col - alpha_clusters.length},
            success: function (result)
                {
                    // fire alpha value change event with pre-computed alpha values for selected column
                    var alphaEvent = new CustomEvent("DACAlphaValuesChanged",
                        { detail: JSON.parse(result)["alpha_values"] });
                    document.body.dispatchEvent(alphaEvent);

                },
            error: function ()
                {
                    dialog.ajax_error ('Server failure: could not update alpha cluster coords.')("","","");
                }
        });

    } else {

        // fire alpha value change event with pre-computed alpha values for selected column
        var alphaEvent = new CustomEvent("DACAlphaValuesChanged",
            { detail: alpha_clusters[color_by_col] });
        document.body.dispatchEvent(alphaEvent);

    }

}

module.setup = function (num_sliders, INCLUDE_COLUMNS)
{

	// determine number of alpha sliders
	alpha_num = num_sliders;

	// which columns to use
	var_include_columns = INCLUDE_COLUMNS;

	// load up cluster alpha values
	$.when (request.get_array("dac-alpha-clusters", 0, mid)).then(
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

export default module;
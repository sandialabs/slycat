// This code provides support for the DAC scatter plot buttons.

// S. Martin
// 1/21/2021

import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import URI from "urijs";

import scatter_plot from "./dac-scatter-plot";
import selections from "./dac-manage-selections";
import request from "./dac-request-data.js";

import metadata_table from "./dac-table";

// public functions will be returned via the module variable
var module = {};

// model ID
var mid = URI(window.location).segment(-1);

// variables to use in analysis
var var_include_columns = null;

// max number of selections
var max_num_sel = null;

// difference button fisher ordering and current position
var fisher_order = [];
var fisher_pos = null;

// has the difference button ever been used?
var diff_button_used = false;
var diff_desired_state = null;

// maximum number of plots
var max_num_plots = null;

// color by selection menu (default is "Do Not Color")
var curr_color_by_sel = -1;
var color_by_cols = [-1];
var color_by_names = ["Do Not Color"];
var color_by_type = [];
var max_color_by_name_length = null;

// current actual color by data
var curr_color_by_col = [];

// keep track of number of metadata columns (not counting editable columns)
var num_metadata_cols = null;

// model origin data
var num_origin_col = null;
var model_origin = {};

// use PCA components
var use_PCA_comps = false;

module.setup = function (sel_color, MAX_NUM_PLOTS, init_subset_flag, init_zoom_flag, 
                         init_fisher_order, init_fisher_pos, init_diff_desired_state,
                         VAR_INCLUDE_COLUMNS, datapoints_meta, meta_include_columns, data_table,
                         editable_columns, MODEL_ORIGIN, init_color_by_sel, MAX_COLOR_NAME,
                         init_use_PCA_comps)
{

    // set up selection buttons (1-2-3 subset zoom)

    // activate selection buttons
    // This needs to be done by adding the "checked" property on the input element
    // instead of the "active" class on the label element
    // now that we are using bootstrap 5.
    var dac_sel_button_input_ids = ["#dac-scatter-button-subset-input",
                              "#dac-scatter-button-zoom-input",
                              "#dac-scatter-button-sel-1-input",
                              "#dac-scatter-button-sel-2-input",
                              "#dac-scatter-button-sel-3-input"];
    $(dac_sel_button_input_ids[selections.sel_type()+1]).prop("checked", true);

    // set up selection button colors
    $("#dac-scatter-button-sel-1").css("color", sel_color[0]);
    $("#dac-scatter-button-sel-2").css("color", sel_color[1]);
    $("#dac-scatter-button-sel-3").css("color", sel_color[2]);

    // maximum number of selections
    max_num_sel = sel_color.length;

    // bind selection/zoom buttons to callback operations
    $("#dac-scatter-button-sel-1").on("click",
        function() { selections.set_sel_type(1); scatter_plot.draw(); });
    $("#dac-scatter-button-sel-2").on("click",
        function() { selections.set_sel_type(2); scatter_plot.draw(); });
    $("#dac-scatter-button-sel-3").on("click",
        function() { selections.set_sel_type(3); scatter_plot.draw(); });
    $("#dac-scatter-button-subset").on("click",
        function() { selections.set_sel_type(-1); scatter_plot.draw(); })
    $("#dac-scatter-button-zoom").on("click",
        function() { selections.set_sel_type(0); scatter_plot.draw(); });
    
    // set initial zoom button indicator
    module.set_zoom_button(init_zoom_flag);

    // set initial subset button indicator
    module.set_subset_button(init_subset_flag);

    // set up difference buttons (< - >)

    // bind difference buttons to callback
    $("#dac-previous-three-button").on("click", previous_three);
    $("#dac-scatter-diff-button").on("click", diff_button);
    $("#dac-next-three-button").on("click", next_three);

    // include columns (variables and metadata)
    var_include_columns = VAR_INCLUDE_COLUMNS;

    // set up difference button state
    max_num_plots = MAX_NUM_PLOTS;
    fisher_order = init_fisher_order;
    fisher_pos = init_fisher_pos;
    if (fisher_order.length > 0) {
        diff_button_used = true;
    }
    diff_desired_state = init_diff_desired_state;

    // use PCA components
    use_PCA_comps = init_use_PCA_comps;

    // update difference buttons
    if (diff_button_used) {
        set_diff_arrows();
        module.toggle_difference(diff_desired_state);
    }

    // set up filter button

    // bind filter button to callback
    $("#dac-filter-plots-button").on("click", scatter_plot.filter_plots);

    // initialize filter button state
    module.set_filter_button();

    // set up color by menu

	// set maximum color by name length
    max_color_by_name_length = MAX_COLOR_NAME;
    
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
    model_origin["data"] = [MODEL_ORIGIN];
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

        // add to list in drop down
        if (editable_columns["attributes"][i]["type"] == "categorical") {
            color_by_type.push("categorical")
        } else {
            color_by_type.push("string");
        }
        color_by_cols.push(num_metadata_cols + num_origin_col + i);

        // make sure names aren't too long (if they are then truncate)
        var name_i = truncate_color_by_name(editable_columns["attributes"][i]["name"]);
        color_by_names.push(name_i);

	}

    // check init color by value (make sure it fits on list)
    if (color_by_cols.indexOf(init_color_by_sel) == -1) {
        init_color_by_sel = -1;
    }

    // compute initial curr color vector 
    if (init_color_by_sel == -1) {

        // no coloring
        curr_color_by_col = [];

    // editable column coloring
    } else if (init_color_by_sel >= num_metadata_cols + num_origin_col) {
        update_color_by_col_data (editable_columns, 
            init_color_by_sel - num_metadata_cols - num_origin_col,
            init_color_by_sel);

    // "From Model" origin column coloring
    } else if (init_color_by_sel == num_metadata_cols) {
        update_color_by_col_data (model_origin, 0, num_metadata_cols);

    // actual meta data coloring
    } else {
        update_color_by_col_data (data_table, init_color_by_sel, init_color_by_sel);
    };

    // populate pull down menu
    display_pull_down.bind($("#dac-scatter-select"))(init_color_by_sel);

}

// set zoom button background color
module.set_zoom_button = function(zoom_flag)
{

    // update zoom button status
    if (zoom_flag) {
        $("#dac-scatter-button-zoom").addClass("bg-warning");
    } else {
        $("#dac-scatter-button-zoom").removeClass("bg-warning");
    }

}

// set subset button background color
module.set_subset_button = function(subset_flag)
{

    // update subset button status
    if (subset_flag) {
        $("#dac-scatter-button-subset").addClass("bg-warning");
    } else {
        $("#dac-scatter-button-subset").removeClass("bg-warning");
    }

}

// set filter button background color
module.set_filter_button = function()
{

    // check if metadata table filters are active
    if (metadata_table.filters_active())
    {
        // turn on filter button
        $("#dac-filter-plots-button").prop("disabled", false);

    } else {

        // turn off filter button
        $("#dac-filter-plots-button").prop("disabled", true);
    }

    // update filtered/unfiltered state
    if (selections.filter_button_status()) {
        $("#dac-filter-plots-button").addClass("bg-warning");
    } else {
        $("#dac-filter-plots-button").removeClass("bg-warning");
    }
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
                     max_selection: max_num_plots,
					 include_columns: var_include_columns,
                     use_PCA_comps: use_PCA_comps},
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
		$("#dac-next-three-button").prop("disabled", true);

    } else {

        // enable next button
        $("#dac-next-three-button").prop("disabled", false);

    }

    // set back arrow
    if (fisher_pos - 3 < 0) {

        // disable previous button
		$("#dac-previous-three-button").prop("disabled", true);

    } else {
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

            // update color plot
            module.update_color_by_col(select_col);

            // fire new colorby event
		    var colorbyEvent = new CustomEvent("DACColorByChanged",
											  {detail: curr_color_by_sel});
		    document.body.dispatchEvent(colorbyEvent);

		});

}

// truncate name to max color by name
function truncate_color_by_name (name_i) {

    if (name_i.length > max_color_by_name_length) {
        name_i = name_i.substring(0,max_color_by_name_length) + " ...";
    }

    return name_i;
}

// update coloring for re-draw scatter plot
module.update_color_by_col = function(select_col)
{

    // check if current column matches selected column
    if (curr_color_by_sel != select_col) {

        // do nothing
        return;
    }

    // no coloring
    if (select_col == -1) {

        // revert to no color & re-draw
        curr_color_by_col = [];
        scatter_plot.update_color(curr_color_by_col);

    // editable column coloring
    } else if (select_col >= num_metadata_cols + num_origin_col) {

        // load editable columns
        client.get_model_parameter({
            mid: mid,
            aid: "dac-editable-columns",
            success: function (data)
            {
                update_color_by_col_data (data, 
                    select_col - num_metadata_cols - num_origin_col, select_col);
                scatter_plot.update_color(curr_color_by_col);
            },
            error: function () {

                // notify user that editable columns exist, but could not be loaded
                dialog.ajax_error('Server error: could not load editable column data.')
                ("","","")

                // revert to no color & re-draw
                curr_color_by_col = [];
                scatter_plot.update_color(curr_color_by_col);
            }
        });

    // "From Model" origin column coloring
    } else if (select_col == num_metadata_cols) {

        update_color_by_col_data (model_origin, 0, num_metadata_cols);
        scatter_plot.update_color(curr_color_by_col);

    // actual meta data coloring
    } else {

        // request new data from server
        $.when(request.get_table("dac-datapoints-meta", mid)).then(
            function (data)
            {
                update_color_by_col_data (data, select_col, select_col);
                scatter_plot.update_color(curr_color_by_col);
            },
            function ()
            {
                dialog.ajax_error ('Server failure: could not load color by data column.')("","","");

                // revert to no color & re-draw
                curr_color_by_col = [];
                scatter_plot.update_color(curr_color_by_col);
            }
        );
    };

}

// actual color plotting
function update_color_by_col_data (data, data_col, select_col)
{

    // check for string data
    if (color_by_type[color_by_cols.indexOf(select_col) - 1] == "string") {

        // get string data
        var color_by_string_data = data["data"][data_col];
        
        // attempt to convert strings to numbers
        let num_array = [];
        let any_nums = false;
        for (let i = 0; i < color_by_string_data.length; i++) {
            num_array.push(Number(color_by_string_data[i]));
            if (!Number.isNaN(num_array[i])) {
                any_nums = true;
            }
        }

        // if there are nay numbers, use those + NaNs for the remaining strings
        if (any_nums) {

            curr_color_by_col = num_array;
            
        } else {

            // use alphabetical order by number to color

            // natural sort compare for strings
            var comparer = function (a,b) {
                return a.localeCompare(b, navigator.languages[0] || navigator.language,
                        {numeric: true, ignorePunctuation: true});
            }

            // get unique sorted string data
            var unique_sorted_string_data = Array.from(new Set(color_by_string_data)).sort(comparer);
            
            // set curr_color_by_col
            set_curr_color_by_col (color_by_string_data, unique_sorted_string_data);
        
        }

    // for categorical data, use given order of categories
    } else if (color_by_type[color_by_cols.indexOf(select_col) - 1] == "categorical") {

        // get category labels
        var categories = data["categories"][data_col];

        // get string data
        var color_by_string_data = data["data"][data_col]

        // set curr_color_by_col
        set_curr_color_by_col (color_by_string_data, categories);

    } else {

        // get selected column from data base (number data)
        curr_color_by_col = data["data"][data_col];

    }

}

// set curr_color_by_col using strings, in order provided
function set_curr_color_by_col (color_by_string_data, ordered_strings)
{

    // get indices for original string data in the unique sorted string data
    curr_color_by_col = [];
    for (var i=0; i < color_by_string_data.length; i++) {
        curr_color_by_col.push(ordered_strings.indexOf(color_by_string_data[i]));
    }

}

module.get_color_by_col = function()
{
    return curr_color_by_col;
}

export default module;
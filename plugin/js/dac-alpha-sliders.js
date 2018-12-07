// This script contains the code for managing the alpha sliders on the left
// hand side of the user interface for dial-a-cluster.  The setup requires
// the ALPHA_STEP parameter defined in dac-ui.js.

// S. Martin
// 1/15/2015

import "jquery-ui";
import "jquery-ui/ui/widgets/sortable";



// return functions in module variables
var module = {};

// private variables
var alpha_num = null;
var alpha_names = null;
var alpha_values = [];
var alpha_order = [];

// maximum length of a slider name
var max_slider_name_length = null;

// which sliders to display
var var_include_columns = null;

module.setup = function (ALPHA_STEP, num_alpha, names_alpha, MAX_SLIDER_NAME, INCLUDE_COLUMNS)
{

	// sort out the information we need
	alpha_num = num_alpha;
	alpha_names = names_alpha;
	max_slider_name_length = MAX_SLIDER_NAME;

	// exclude columns, if requested
	var_include_columns = INCLUDE_COLUMNS;

	// truncate names if they are too long
	for (var i = 0; i < alpha_num; i ++) {
		if (alpha_names[i].length > max_slider_name_length) {
			alpha_names[i] = alpha_names[i].substring(0, max_slider_name_length) + " ...";
		}
	}

	// initialize alpha slider values to all 1 (unless they are
	// not included as variables to anlayze) and order to 1 ... n
	for (i = 0; i < alpha_num; i++) {

		if (var_include_columns.indexOf(i) != -1) {

			// push value of 1
			alpha_values.push(1.0);
			alpha_order.push(i);

		} else {

			// push value of 0
			alpha_values.push(0.0);
			alpha_order.push(i);

		}

	}

	// write out list of sliders to html file
	display_alpha_sliders.bind($("#dac-alpha-sliders"))(ALPHA_STEP);

	// make sliders sortable
	$("#dac-alpha-sliders").sortable();

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

		// generate the slider in the HTML (only if included)
		if (var_include_columns.indexOf(i) != -1) {

			// add to HTML
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

				// fire alpha value change event
				var alphaEvent = new CustomEvent("DACAlphaValuesChanged",
					{ detail: alpha_values });
				document.body.dispatchEvent(alphaEvent);

			});
		}
	};
}

// zero out all the sliders, and re-plot MDS coords
module.set_alpha_values = function (new_alpha_values)
{
	// copy new values and reset sliders
	for (var i = 0; i != alpha_num; ++i) {
		alpha_values[i] = new_alpha_values[i];

		// set slider value
		if (var_include_columns.indexOf(i) != -1) {
			$("#dac-alpha-slider-" + i).val(alpha_values[i]);
		}
	}

}

// get alpha values
module.get_alpha_values = function ()
{
	return alpha_values;
}

//return module;


export default module;
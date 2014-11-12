$(document).ready(function()
{
//////////////////////////////////////////////////////////////////////////////////////////
// Setup global variables.
//////////////////////////////////////////////////////////////////////////////////////////

var model = null;
var input_columns = null;
var output_columns = null;
var image_columns = null;
var rating_columns = null;
var category_columns = null;

var bookmarker = new bookmark_manager(server_root, "{{#full-project}}{{_id}}{{/full-project}}", "{{_id}}");
var bookmark = null;

var table_metadata = null;
var table_statistics = null;
var indices = null;
var x_index = null;
var y_index = null;
var v_index = null;
var images_index = null;
var x = null;
var y = null;
var v = null;
var images = null;
var selected_simulations = null;
var hidden_simulations = null;
var colormap = null;
var colorscale = null;
var auto_scale = null;
var filtered_v = null;

var table_ready = false;
var scatterplot_ready = false;
var controls_ready = false;

var session_cache = {};
var image_uri = document.createElement("a");

// END
});
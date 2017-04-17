// This script sets up the overall layout of the dial-a-cluster user
// interface, making calls out to different functions for each of
// the jQuery windows.

// S. Martin
// 1/15/2015

define("dac-model", ["dac-layout", "dac-request-data", "dac-alpha-sliders",
					 "dac-alpha-buttons", "dac-scatter-plot", "dac-plots",
					 "dac-table", "jquery", "d3", "domReady!"], 
    function(layout, request, alpha_sliders, alpha_buttons, scatter_plot, 
    		 plots, metadata_table, $, d3)
{

	// load ui parameters and initialize dial-a-cluser	
	$.when (request.get_parameters("dac-ui-parms", 0)).then(
			function (ui_parms)
			{
    
    			// the step size for the alpha slider (varies from 0 to 1)
    			var ALPHA_STEP = parseFloat(ui_parms["ALPHA_STEP"]);
    
    			// default width for the alpha sliders (in pixels)
    			var ALPHA_SLIDER_WIDTH = parseInt(ui_parms["ALPHA_SLIDER_WIDTH"]);
    
    			// default height of alpha buttons (in pixels)
    			var ALPHA_BUTTONS_HEIGHT = parseInt(ui_parms["ALPHA_BUTTONS_HEIGHT"]);
	
				// number of points over which to stop animation
				var MAX_POINTS_ANIMATE = parseInt(ui_parms["MAX_POINTS_ANIMATE"]);
	
				// border around scatter plot (fraction of 1)
				var SCATTER_BORDER = parseFloat(ui_parms["SCATTER_BORDER"]);
	
				// scatter button toolbar height
				var SCATTER_BUTTONS_HEIGHT = parseInt(ui_parms["SCATTER_BUTTONS_HEIGHT"]);
	
				// scatter plot colors (css/d3 named colors)
				var POINT_COLOR = ui_parms["POINT_COLOR"];
				var POINT_SIZE = parseInt(ui_parms["POINT_SIZE"]);
				var NO_SEL_COLOR = ui_parms["NO_SEL_COLOR"];
				var SELECTION_1_COLOR = ui_parms["SELECTION_1_COLOR"];
				var SELECTION_2_COLOR = ui_parms["SELECTION_2_COLOR"];
				var COLOR_BY_LOW = ui_parms["COLOR_BY_LOW"];
				var COLOR_BY_HIGH = ui_parms["COLOR_BY_HIGH"];
				var OUTLINE_NO_SEL = parseInt(ui_parms["OUTLINE_NO_SEL"]);
				var OUTLINE_SEL = parseInt(ui_parms["OUTLINE_SEL"]);
				
				// pixel adjustments for d3 time series plots
				var PLOT_ADJUSTMENTS = {
					PLOTS_PULL_DOWN_HEIGHT: parseInt(ui_parms["PLOTS_PULL_DOWN_HEIGHT"]),
					PADDING_TOP: parseInt(ui_parms["PADDING_TOP"]),
					PADDING_BOTTOM: parseInt(ui_parms["PADDING_BOTTOM"]),
					PADDING_LEFT: parseInt(ui_parms["PADDING_LEFT"]),
					PADDING_RIGHT: parseInt(ui_parms["PADDING_RIGHT"]),
					X_LABEL_PADDING: parseInt(ui_parms["X_LABEL_PADDING"]),
					Y_LABEL_PADDING: parseInt(ui_parms["Y_LABEL_PADDING"]),
					LABEL_OPACITY: parseFloat(ui_parms["LABEL_OPACITY"]),
					X_TICK_FREQ: parseInt(ui_parms["X_TICK_FREQ"]),
					Y_TICK_FREQ: parseInt(ui_parms["Y_TICK_FREQ"])
				};

				// set up jQuery layout for user interface
				layout.setup (ALPHA_SLIDER_WIDTH, ALPHA_BUTTONS_HEIGHT,
					SCATTER_BUTTONS_HEIGHT);
	
				// set up the alpha sliders
				alpha_sliders.setup (ALPHA_STEP);
	
				// set up the alpha buttons
				alpha_buttons.setup ();
	
				// set up the time series plots
				plots.setup(SELECTION_1_COLOR, SELECTION_2_COLOR, PLOT_ADJUSTMENTS);
	
				// set up the MDS scatter plot
				scatter_plot.setup(MAX_POINTS_ANIMATE, SCATTER_BORDER, POINT_COLOR,
					   POINT_SIZE, NO_SEL_COLOR, SELECTION_1_COLOR, SELECTION_2_COLOR,
					   COLOR_BY_LOW, COLOR_BY_HIGH, OUTLINE_NO_SEL, OUTLINE_SEL);
	
				// set up table (propagate selections through to scatter plot)
				metadata_table.setup(function () { scatter_plot.draw(); });
												
			},
			function ()
			{
				alert ("Server failure: could not load UI parameters.");
			}
	);
	
});

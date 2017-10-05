// This script sets up the overall layout of the dial-a-cluster user
// interface, making calls out to different functions for each of
// the jQuery windows.

// S. Martin
// 1/15/2015

define("dac-model", ["slycat-web-client", "slycat-dialog", "dac-layout", "dac-request-data",
                     "dac-alpha-sliders", "dac-alpha-buttons", "dac-scatter-plot", "dac-plots",
					 "dac-table", "jquery", "d3", "URI", "domReady!"],
function(client, dialog, layout, request, alpha_sliders, alpha_buttons, scatter_plot,
         plots, metadata_table, $, d3, URI)
{

	// load ui parameters and initialize dial-a-cluser layout
	$.when (request.get_parameters("dac-ui-parms")).then(
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

	            // check to see if server computations are complete
	            $.when (request.get_parameters("dac-polling-progress")).then (
	                function (progress) {

	                    // complete -- assign alpha parms, order, and var plot order
	                    if (progress[0] == "Done") {

                            // set up alpha slider value change event
                            document.body.addEventListener("DACAlphaValuesChanged", alpha_values_changed);

                            // set up selection change event
                            document.body.addEventListener("DACSelectionsChanged", selections_changed);

                            // set up difference calculation event
                            document.body.addEventListener("DACDifferenceComputed", difference_computed);

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
				            metadata_table.setup();

                        // not complete -- set up display window and poll
                        } else {

                            console.log ("Not done processing.");

                        }
		            },
		            function () {
    		            dialog.ajax_error ("Server failure: could not load DAC pre-processing data.")("","","");
    		        }
		        );
			},
			function ()
			{
				dialog.ajax_error ("Server failure: could not load UI parameters.")("","","");
			}
	);

    // custom event for change in alpha slider values
    function alpha_values_changed (new_alpha_values)
    {
        // update actual sliders
        alpha_sliders.set_alpha_values(new_alpha_values.detail);

        // update MDS scatter plot
        scatter_plot.update(new_alpha_values.detail);
    }

    // custom event for change in selection 1, selection 2, active selection
    function selections_changed (new_selections)
    {
        // update scatter plot
        scatter_plot.draw();

        // update selections in time series plot
        plots.update_plots (new_selections.detail.sel_1, new_selections.detail.sel_2);

		// update table - select corresponding rows (assumes they are stored in manage_selections.js)
		metadata_table.select_rows();

		// jump to top row in table for current selection (if there is one)
		if (new_selections.detail.active_sel.length > 0) {
		    metadata_table.jump_to (new_selections.detail.active_sel);
		}
    }

    // custom event for difference calculation
    function difference_computed (diff_values)
    {
        // show first three most different plots
        plots.change_selections(diff_values.detail);
    }

});

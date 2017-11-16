// This script sets up the overall layout of the dial-a-cluster user
// interface, making calls out to different functions for each of
// the jQuery windows.

// S. Martin
// 1/15/2015

define("dac-model", ["slycat-web-client", "slycat-dialog", "dac-layout", "dac-request-data",
                     "dac-alpha-sliders", "dac-alpha-buttons", "dac-scatter-plot", "dac-plots",
					 "dac-table", "jquery", "d3", "URI", "knockout", "domReady!"],
function(client, dialog, layout, request, alpha_sliders, alpha_buttons, scatter_plot,
         plots, metadata_table, $, d3, URI, ko)
{

    // height of slycat header/progress bar
    var SLYCAT_PROGRESS_HEADER = 200;
    var MIN_PROGRESS_TEXT_HEIGHT = 200;

    // set text area height to fill window
    $("#dac_processing_textarea").height(Math.max($(window).height() - SLYCAT_PROGRESS_HEADER,
                                                  MIN_PROGRESS_TEXT_HEIGHT));

    // maximum number of points to display for plots
    var MAX_TIME_POINTS = 500;

    // maximum number of plots (per selection)
    var MAX_NUM_PLOTS = 50;

    // model id from address bar
    var mid = URI(window.location).segment(-1);

    // constants for polling timeouts
    var ONE_MINUTE = 60000;
    var ONE_SECOND = 1000;

    // waits 1 minute past last successful progress update
    var endTime = Number(new Date()) + ONE_MINUTE;

    // polling interval is 1 second
    var interval = ONE_SECOND;

    // poll database for artifact "dac-poll-progress"
    (function poll() {

        client.get_model_parameter(
        {
            mid: mid,
            aid: "dac-polling-progress",
            success: function (result)
            {

                if (result[0] == "Done") {

                    // done uploading to database
                    launch_model();

                } else if (result[0] == "Error") {

                    dialog.ajax_error ("Server error: " + result[1] + ".")("","","");
                    launch_model();

                } else {

                    // update progress and output log
                    $("#dac_processing_progress_bar").width(result[1] + "%");
                    $("#dac_processing_progress_bar").text(result[0]);

                    // request error log
                    $.when(request.get_parameters("dac-parse-log")).then(
                        function(error_log)
                        {
                            $("#dac_processing_textarea").text(error_log[1]);
                        });

                    // reset time out and continue
                    endTime = Number(new Date()) + ONE_MINUTE;
                    window.setTimeout(poll, interval);
                }
            },
            error: function () {

                if (Number(new Date()) < endTime) {

                    // continue, do not reset timer
                    window.setTimeout(poll, interval);

                } else {

                    // give up
                    launch_model();

                }
            }
        });
    })();

    // setup and launch model
    function launch_model ()
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
					Y_TICK_FREQ: parseInt(ui_parms["Y_TICK_FREQ"]),
				};


	            // Remove progress element from DOM
	            $('#dac-progress-feedback').remove();

	            // set up jQuery layout for user interface
				layout.setup (ALPHA_SLIDER_WIDTH, ALPHA_BUTTONS_HEIGHT,
							  SCATTER_BUTTONS_HEIGHT);

                // set up alpha slider value change event
                document.body.addEventListener("DACAlphaValuesChanged", alpha_values_changed);

                // set up selection change event
                document.body.addEventListener("DACSelectionsChanged", selections_changed);

                // set up active selection change event
                document.body.addEventListener("DACActiveSelectionChanged", active_selection_changed);

                // set up difference calculation event
                document.body.addEventListener("DACDifferenceComputed", difference_computed);

                // load all relevant data and set up panels
                $.when(request.get_table_metadata("dac-variables-meta"),
		   	           request.get_table("dac-variables-meta"),
		   	           request.get_table_metadata("dac-datapoints-meta"),
			           request.get_table("dac-datapoints-meta")).then(
		   	           function (variables_meta, variables, data_table_meta, data_table)
		   	                {

		   	                    // set up the alpha sliders
				                alpha_sliders.setup (ALPHA_STEP, variables_meta[0]["row-count"],
				                                         variables[0]["data"][0]);

				                // set up the alpha buttons
				                alpha_buttons.setup (variables_meta[0]["row-count"]);

				                // set up the time series plots
				                plots.setup(SELECTION_1_COLOR, SELECTION_2_COLOR, PLOT_ADJUSTMENTS,
				                            MAX_TIME_POINTS, MAX_NUM_PLOTS, variables_meta, variables);

				                // set up the MDS scatter plot
				                scatter_plot.setup(MAX_POINTS_ANIMATE, SCATTER_BORDER, POINT_COLOR,
					                POINT_SIZE, NO_SEL_COLOR, SELECTION_1_COLOR, SELECTION_2_COLOR,
					                COLOR_BY_LOW, COLOR_BY_HIGH, OUTLINE_NO_SEL, OUTLINE_SEL, data_table_meta[0]);

				                // set up table (propagate selections through to scatter plot)
				                metadata_table.setup(data_table_meta, data_table);

		   	                },
		   	                function () {
		   	                    dialog.ajax_error ("Server error: could not load initial data.")("","","");

		   	                    // remove dac-plots so screen isn't so ugly
		                        for (var i = 0; i < 3; i++) {
		                            $("#dac-select-plot-" + (i+1)).remove();
		                            $("#dac-link-plot-" + (i+1)).remove();
		                            $("#dac-low-resolution-plot-" + (i+1)).remove();
		                            $("#dac-full-resolution-plot-" + (i+1)).remove();
		                            $("#dac-link-label-plot-" + (i+1)).remove();
		                        };

		   	                });

			},
			function ()
			{
				dialog.ajax_error ("Server failure: could not load UI parameters.")("","","");

				// remove model leaving only blank screen
				$("#dac-model").remove();
			}
	    );
    }

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
		    active_selection_changed ({detail: {active_sel: new_selections.detail.active_sel}});
		}
    }

    // custom event for jumping to an individual selection in the table
    function active_selection_changed (active_selection)
    {
        // jump to top row in table for current selection
        metadata_table.jump_to (active_selection.detail.active_sel);
    }

    // custom event for difference calculation
    function difference_computed (diff_values)
    {
        // show first three most different plots
        plots.change_selections(diff_values.detail);
    }

});
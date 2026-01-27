// This script sets up the overall layout of the dial-a-cluster user
// interface, making calls out to different functions for each of
// the jQuery windows.

// S. Martin
// 1/15/2015

import "../css/dac-ui.css";

// dial-a-cluster ui
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import layout from "./dac-layout.js";
import request from "./dac-request-data.js";
import alpha_sliders from "./dac-alpha-sliders.js";
import alpha_buttons from "./dac-alpha-buttons.js";
import scatter_buttons from "./dac-scatter-buttons.js";
import scatter_plot from "./dac-scatter-plot.js";
import plots from "./dac-plots.js";
import metadata_table from "./dac-table.js";
import selections from "./dac-manage-selections.js";
import URI from "urijs";
import "bootstrap";

// bookmarks & templates
import bookmark_manager from "js/slycat-bookmark-manager";

// disable-selection and draggable required for jquery.layout resizing functionality
import "jquery-ui";
import "jquery-ui/ui/disable-selection";
import "jquery-ui/ui/widgets/draggable";
import "layout-jquery3";

import React from "react";
import { createRoot } from "react-dom/client";
import Selector from "./components/Selector";

import { createStore, applyMiddleware, } from 'redux';
import { Provider, } from 'react-redux';
import { thunk } from 'redux-thunk';
import { createLogger, } from 'redux-logger';
import dac_reducer from './reducers';
import { 
    setZoomExtent,
    setZoomFlag,
} from './actions';

// wait for document ready
$(document).ready(function() {

    // bookmarker is a slycat book mark manager object
    var bookmarker = null;

    // bookmark is the actual book mark state
    var bookmark = null;

    // maximum number of points to display for plots
    var MAX_TIME_POINTS = 500;

    // maximum number of plots (per selection)
    var MAX_NUM_PLOTS = 33;

    // animation threshold (overrides push script value)
    var MAX_POINTS_ANIMATE = 2500;

    // focus selection color
    var FOCUS_COLOR = "black";

    // scatter plot points (circles or squares)
    var SCATTER_PLOT_TYPE = "circle";

    // colormap defaults
    var cont_colormap = null;

    // variable/meta include columns
    var var_include_columns = [];
    var meta_include_columns = [];

    // model id from address bar
    var mid = URI(window.location).segment(-1);

    // constants for polling timeouts
    var ONE_MINUTE = 60000;
    var ONE_SECOND = 1000;

    // constants for cutting off plot names, slider names
    var MAX_PLOT_NAME = 20;
    var MAX_SLIDER_NAME = 20;
    var MAX_COLOR_NAME = 20;

    // constant for maximum number of editable column categories
    var MAX_CATS = 50;

    // constant for maximum length of freetext in editable column
    var MAX_FREETEXT_LEN = 500;

    // editable column data (initialize to empty)
    var editable_columns = {num_rows: 0,
                            attributes: [],
                            categories: [],
                            data: []};

    // model origin data (initialize to empty)
    var model_origin = [];
    var num_origin_cols = 0;

    // use PCA components
    var use_PCA_comps = false;

    // use LOF values, if available
    var lof_values = [];

    // model name (for downloading tables)
    var MODEL_NAME = "";

    // waits 1 minute past last successful progress update
    var endTime = Number(new Date()) + ONE_MINUTE;

    // polling interval is 1 second
    var interval = ONE_SECOND;

    // if user is looking at textarea then don't scroll to bottom
    var user_scroll = false;
    $("#dac_processing_textarea").focus (function () { user_scroll = true });
    $("#dac_processing_textarea").focusout(function () { user_scroll = false });

    // poll database for artifact "dac-poll-progress"
    (function poll() {

        client.get_model_parameter(
        {
            mid: mid,
            aid: "dac-polling-progress",
            success: function (result)
            {

                if (result[0] == "Done") {

                    // Remove progress element from DOM
                    $('#dac-progress-feedback').remove();

                    // done uploading to database
                    check_preferences();

                } else if (result[0] == "Error") {

                    $("#dac-progress-feedback").show()

                    // update progress and output log
                    $("#dac_processing_progress_bar").text("No Data Loaded (See Info > Parse Log)");
                    $("#dac_processing_progress_bar").width(100 + "%");

                    dialog.ajax_error ("Server error: " + result[1] + ".")("","","");

                    // request error log
                    update_error_log(user_scroll);

                } else {

                    $("#dac-progress-feedback").show()

                    // update progress and output log
                    $("#dac_processing_progress_bar").text(result[0]);
                    $("#dac_processing_progress_bar").width(result[1] + "%");

                    // request error log
                    update_error_log(user_scroll);

                    // reset time out and continue
                    endTime = Number(new Date()) + ONE_MINUTE;
                    window.setTimeout(poll, interval);
                }
            },
            error: function () {

                if (Number(new Date()) < endTime) {

                    // check model for existence of "dac-polling-progress" artifact
                    client.get_model(
                    {
                        mid: mid,
                        success: function (result)
                        {
                            // if "dac-polling-progress" doesn't exist it's an older model, just load it
                            if (!("artifact:dac-polling-progress" in result))
                            {
                                check_preferences();
                            } else {

                                // otherwise keep trying, do not reset timer
                                window.setTimeout(poll, interval);

                            }
                        },
                        error: function ()
                        {
                            // couldn't even load model? -- give up
                            check_preferences();
                        }
                    });

                } else {
                    // all else fails -- give up
                    check_preferences();
                }
            }
        });
    })();

    // read and update error log
    function update_error_log (user_scroll)
    {
        $.when(request.get_parameters("dac-parse-log", mid)).then(
            function(error_log)
            {
                // update text box unless user has focused on it
                if (user_scroll == false) {
                    // display text then scroll to bottom
                    $("#dac_processing_textarea").text(error_log[1]);

                    // scroll to bottom
                    $("#dac_processing_textarea").scrollTop($("#dac_processing_textarea")[0].scrollHeight);
                }
            });
    }

    // return bookmark preference, if it exists.
    // otherwise initialize bookmark preference to existing preference
    function bookmark_preference (bookmark_name, existing_pref)
    {

        var bookmark_pref = existing_pref;
        if (bookmark_name in bookmark) {
                bookmark_pref = bookmark[bookmark_name];
            } else {
                var bookmark_state = {}
                bookmark_state[bookmark_name] = existing_pref;
                bookmarker.updateState(bookmark_state);
            }

        return bookmark_pref;
    }

    // check for preferences using bookmarks, and set up variables
    // note that we only set data independent bookmarks here, e.g. bookmarks
    // which do not depend on the model data so they need no error check, like
    // plotting circles vs. squares or color maps.
    function check_preferences ()
    {

        // get artifacts in model (to see if user has modified preferences)
        client.get_model (
        {
            mid: mid,
            success: function (result)
            {

                // save model name for naming tables
                MODEL_NAME = result.name;

                // set display parameters, if available
                if ('artifact:dac-display-parms' in result) {

                    var display_parms = result['artifact:dac-display-parms'];

                    MAX_PLOT_NAME = display_parms["dac-MAX-PLOT-NAME"];
                    MAX_COLOR_NAME = display_parms["dac-MAX-COLOR-NAME"];
                    MAX_SLIDER_NAME = display_parms["dac-MAX-SLIDER-NAME"];
                    MAX_TIME_POINTS = display_parms["dac-MAX-TIME-POINTS"];
                    MAX_NUM_PLOTS = display_parms["dac-MAX-NUM-PLOTS"];
                    MAX_POINTS_ANIMATE = display_parms["dac-MAX-POINTS-ANIMATE"];
                    SCATTER_PLOT_TYPE = display_parms["dac-SCATTER-PLOT-TYPE"];
                    MAX_CATS = display_parms["dac-MAX-CATS"];
                    MAX_FREETEXT_LEN = display_parms["dac-MAX-FREETEXT-LEN"];
                
                }

                // truncate model name to max name length
                MODEL_NAME = MODEL_NAME.substring(0, MAX_PLOT_NAME);

                // set colormap, if available
                if ('artifact:dac-cont-colormap' in result) {
                    var cont_data = result['artifact:dac-cont-colormap'];
                    var cont_data_0 = cont_data[0];
                    cont_colormap = JSON.parse(cont_data_0);
                }

                // get variable include columns
                if ('artifact:dac-var-include-columns' in result) {
                    var_include_columns = result['artifact:dac-var-include-columns'];
                }

                // get meta include columns
                if ('artifact:dac-meta-include-columns' in result) {
                    meta_include_columns = result['artifact:dac-meta-include-columns'];
                }                

                // set up bookmark object
                bookmarker = bookmark_manager.create(result.project, result._id);

                // get bookmarked state information
                bookmarker.getState(function(state)
                {

                    // initialize bookmark state
                    bookmark = state;

                    // Create Redux store and set its state based on what's in the bookmark
                    const state_tree = {
                        dac_zoom_extent: "dac-zoom-extent" in bookmark ? bookmark["dac-zoom-extent"] : null,
                        dac_zoom_flag: "dac-zoom-flag" in bookmark ? bookmark["dac-zoom-flag"] : false,
                        scatterplot_size: [],
                    }

                    // Adding middlewares to redux store
                    const middlewares = [];
                    // Lets us dispatch() functions
                    middlewares.push(thunk);
                    // Neat middleware that logs actions. 
                    // Logger must be the last middleware in chain, 
                    // otherwise it will log thunk and promise, 
                    // not actual actions.
                    // Adding it only in development mode to reduce console messages in prod
                    if (process.env.NODE_ENV === `development`) {
                        // Create logger for redux
                        const loggerMiddleware = createLogger({
                            // Setting console level to 'debug' for logger messages
                            level: 'debug',
                            // Enable diff to start showing diffs between prevState and nextState
                            // diff: true,
                        });
                        middlewares.push(loggerMiddleware);
                    }
                    
                    window.store = createStore(
                      dac_reducer, 
                      {
                        ...state_tree, 
                        ...bookmark.state, 
                        derived: {
                          mds_coords: [],
                        }
                      },
                      applyMiddleware(...middlewares)
                    );

                    // Save Redux state to bookmark whenever it changes
                    const bookmarkReduxStateTree = () => {
                      bookmarker.updateState({
                        state: 
                        // Remove derived property from state tree because it should be computed
                        // from model data each time the model is loaded. Otherwise it has the 
                        // potential of becoming huge. Plus we shouldn't be storing model data
                        // in the bookmark, just UI state.
                        // Passing 'undefined' removes it from bookmark. Passing 'null' actually
                        // sets it to null, so I think it's better to remove it entirely.
                        // eslint-disable-next-line no-undefined
                        { ...window.store.getState(), derived: undefined }
                      });
                    };
                    window.store.subscribe(bookmarkReduxStateTree);

                    // set up model origin column data
                    setup_model_origin();

                });


            },
            error: function () {

                // couldn't load model -- error
                dialog.ajax_error ("Server error: could not load model.")("","","");

            }
        });
    }

    // set up model origin data
    function setup_model_origin ()
    {

        // check for model origin data
        client.get_model(
        {

            mid: mid,
            success: function (result)
            {

                if ('artifact:dac-model-origin' in result) {

                    // load model origin data
                    client.get_model_parameter({

                        mid: mid,
                        aid: "dac-model-origin",
                        success: function (result)
                        {

                            model_origin = result;
                            num_origin_cols = 1;

                            // continue to editable columns
                            setup_editable_columns();

                        },
                        error: function () {

                            // notify user that editable columns exist, but could not be loaded
                            dialog.ajax_error('Server error: could not load model origin column data.')
                            ("","","")

                            // continue to editable columns
                            setup_editable_columns();
                        }
                    });

                } else {

                    setup_editable_columns();
                }
            }
        });

    }

    // set up table with editable columns
    function setup_editable_columns ()
    {

        // set up table
        client.get_model(
        {
            mid: mid,
            success: function (result)
            {

                // check for editable columns
                if ('artifact:dac-editable-columns' in result)
                {

                    // load editable columns
                    client.get_model_parameter({
                        mid: mid,
                        aid: "dac-editable-columns",
                        success: function (result)
                        {
                            // initialize table with editable columns
                            editable_columns = result;

                            // bookmark editable columns
                            bookmarker.updateState ({"dac-editable-cols-attributes": editable_columns["attributes"],
                                                     "dac-editable-cols-categories": editable_columns["categories"]});

                            // setup PCA flag
                            setup_PCA_comps();


                        },
                        error: function () {

                            // notify user that editable columns exist, but could not be loaded
                            dialog.ajax_error('Server error: could not load editable column data.')
                            ("","","")

                            // setup PCA flag
                            setup_PCA_comps();
                        }
                    });

                } else {

                    // check for existing bookmark (template)
                    var ec_attributes = [];
                    var ec_categories = [];

                    if ("dac-editable-cols-attributes" in bookmark)
                    {

                        ec_attributes = bookmark["dac-editable-cols-attributes"];
                        ec_categories = bookmark["dac-editable-cols-categories"];

                        // found non-empty bookmark
                        if (ec_attributes.length > 0) {

                            // get data table meta info
                            $.when(request.get_table_metadata("dac-datapoints-meta", mid)).then(
                                function (data_table_meta) {

                                // create new columns from bookmark
                                editable_columns["num_rows"] = data_table_meta["row-count"];
                                editable_columns["attributes"] = ec_attributes;
                                editable_columns["categories"] = ec_categories;

                                // create empty data
                                for (var i = 0; i < editable_columns["attributes"].length; i++) {

                                    // create column
                                    var col = [];
                                    for (var j = 0; j < editable_columns["num_rows"]; j++) {

                                        if (editable_columns["attributes"][i].type == "freetext") {

                                            // freetext column
                                            col.push("");

                                        } else {

                                            // categorical column
                                            col.push("No Value");
                                        }
                                    }

                                    // add column to data
                                    editable_columns["data"].push(col);
                                }

                                // push new columns to server
                                client.put_model_parameter ({
                                    mid: mid,
                                    aid: "dac-editable-columns",
                                    value: editable_columns,
                                    success: function () {

                                        // initialize table with templated editable columns

                                        // setup PCA flag
                                        setup_PCA_comps();

                                    },
                                    error: function () {

                                        dialog.ajax_error("Error creating templated columns.")("","","");

                                        // initialize table with empty editable columns
                                        editable_columns = {num_rows: 0,
                                            attributes: [],
                                            categories: [],
                                            data: []};

                                        // setup PCA flag
                                        setup_PCA_comps();

                                    },
                                })},
                                function() {

                                    dialog.ajax_error("Error creating templated columns.")("","","");

                                    // initialize table with empty editable columns
                                    editable_columns = {num_rows: 0,
                                        attributes: [],
                                        categories: [],
                                        data: []};

                                    // setup PCA flag
                                    setup_PCA_comps();
                                });

                            } else {

                                // initialize table with no editable columns

                                // setup PCA flag
                                setup_PCA_comps();

                            }

                    } else {

                        // initialize table with no editable columns

                        // setup PCA flag
                        setup_PCA_comps();
                    }
                }
            }
        });

    }

    // set up PCA flag
    function setup_PCA_comps () {

        // get model data
        client.get_model(
            {
                mid: mid,
                success: function (result)
                {
                    // check for PCA flag
                    if ('artifact:dac-use-PCA-comps' in result)
                    {
                        use_PCA_comps = true;
                    }

                    // check for LOF values
                    setup_LOF_values();
                }        
            });
    }

    function setup_LOF_values () {

        // get model data
        client.get_model(
            {
                mid: mid,
                success: function (result)
                {
                    // check for lof values
                    if ('artifact:dac-lof-values' in result)
                    {
                        // load LOF values
                        client.get_model_parameter({
                            mid: mid,
                            aid: "dac-lof-values",
                            success: function (result)
                            {
                                // save lof values
                                lof_values = result;

                                // go to model
                                launch_model();
                            },
                            error: function () {

                                // notify user that editable columns exist, but could not be loaded
                                dialog.ajax_error('Server error: could not load LOF data.')
                                ("","","")

                                // no lof values, go to model anyway
                                launch_model();
                            }
                        });
                        
                    } else {

                        // no lof values is OK too
                        launch_model();
                    }

                }        
            });
    }

    // setup and launch model
    function launch_model ()
    {

    	// load ui parameters and initialize dial-a-cluser layout
	    $.when (request.get_parameters("dac-ui-parms", mid)).then(
			function (ui_parms)
			{

    			// the step size for the alpha slider (varies from 0 to 1)
    			var ALPHA_STEP = parseFloat(ui_parms["ALPHA_STEP"]);

    			// default width for the alpha sliders (in pixels)
                // var ALPHA_SLIDER_WIDTH = parseInt(ui_parms["ALPHA_SLIDER_WIDTH"]);

     			// updated for download button (and bootstrap upgrade)
    			var ALPHA_SLIDER_WIDTH = 180;

    			// default height of alpha buttons (in pixels)
    			//var ALPHA_BUTTONS_HEIGHT = parseInt(ui_parms["ALPHA_BUTTONS_HEIGHT"]);

                // changed after bootstrap upgrade
                var ALPHA_BUTTONS_HEIGHT = 34;

				// border around scatter plot (fraction of 1)
				var SCATTER_BORDER = parseFloat(ui_parms["SCATTER_BORDER"]);

				// scatter button toolbar height
				var SCATTER_BUTTONS_HEIGHT = parseInt(ui_parms["SCATTER_BUTTONS_HEIGHT"]);

				// scatter plot colors (css/d3 named colors)
				var POINT_COLOR = ui_parms["POINT_COLOR"];
				var POINT_SIZE = parseInt(ui_parms["POINT_SIZE"]);
				var NO_SEL_COLOR = ui_parms["NO_SEL_COLOR"];

				// hard-coded third selection to all models (green)
				var SELECTION_COLOR = [ui_parms["SELECTION_1_COLOR"],
				                       ui_parms["SELECTION_2_COLOR"],
				                       'limegreen'];

                // hard-coded user selected colors  (R, B, G)
                // (for exporting tables, plots)
                var USER_SEL_COLORS = ["Red", "Blue", "Green"];

				var COLOR_BY_LOW = ui_parms["COLOR_BY_LOW"];
				var COLOR_BY_HIGH = ui_parms["COLOR_BY_HIGH"];
				var OUTLINE_NO_SEL = parseInt(ui_parms["OUTLINE_NO_SEL"]);
				var OUTLINE_SEL = parseInt(ui_parms["OUTLINE_SEL"]);

				// pixel adjustments for d3 time series plots
				var PLOT_ADJUSTMENTS = {

				    // hard-coded after change to bootstrap 4
				    PLOTS_PULL_DOWN_HEIGHT: 29,
                    PADDING_TOP: 10,
                    PADDING_BOTTOM: 30,

					// PLOTS_PULL_DOWN_HEIGHT: parseInt(ui_parms["PLOTS_PULL_DOWN_HEIGHT"]),
					// PADDING_TOP: parseInt(ui_parms["PADDING_TOP"]),
					// PADDING_BOTTOM: parseInt(ui_parms["PADDING_BOTTOM"]),

					PADDING_LEFT: parseInt(ui_parms["PADDING_LEFT"]),
					PADDING_RIGHT: parseInt(ui_parms["PADDING_RIGHT"]),
					X_LABEL_PADDING: parseInt(ui_parms["X_LABEL_PADDING"]),
					Y_LABEL_PADDING: parseInt(ui_parms["Y_LABEL_PADDING"]),
					LABEL_OPACITY: parseFloat(ui_parms["LABEL_OPACITY"]),
					X_TICK_FREQ: parseInt(ui_parms["X_TICK_FREQ"]),
					Y_TICK_FREQ: parseInt(ui_parms["Y_TICK_FREQ"]),
				};

	            // set up jQuery layout for user interface
				layout.setup (ALPHA_SLIDER_WIDTH, ALPHA_BUTTONS_HEIGHT,
							  SCATTER_BUTTONS_HEIGHT);

                // turn on main console (after layout, to avoid flicker on load)
                $("#dac-main-console").show()
                $("#dac-plots").show()

                // set up alpha slider value change event
                document.body.addEventListener("DACAlphaValuesChanged", alpha_values_changed);

                // set up lof button change event
                document.body.addEventListener("DACLOFButtonChanged", lof_button_changed);

                // set up selection change event
                document.body.addEventListener("DACSelectionsChanged", selections_changed);

                // set up active selection change event
                document.body.addEventListener("DACActiveSelectionChanged", active_selection_changed);

                // set up difference calculation event
                document.body.addEventListener("DACDifferenceComputed", difference_computed);

                // set up subset change event
                document.body.addEventListener("DACSubsetChanged", subset_changed);

                // set up coloring change (mainly to keep bookmarking in this module)
                document.body.addEventListener("DACColorByChanged", color_by_changed);

                // set up coloring change (mainly to keep bookmarking in this module)
                document.body.addEventListener("DACSelTypeChanged", sel_type_changed);

                // set up zoom change (mainly to keep bookmarking in this module)
                document.body.addEventListener("DACZoomChanged", zoom_changed);

                // set up plot selections change (to keep bookmarking in this module)
                document.body.addEventListener("DACPlotsChanged", plots_changed);

                // zoom change event for time series plots
                document.body.addEventListener("DACPlotZoomChanged", plot_zoom_changed);

                // link plots event for time series
                document.body.addEventListener("DACLinkPlotsChanged", link_plots_changed);

                // table order event
                document.body.addEventListener("DACTableOrderChanged", table_order_changed);

                // editable column event
                document.body.addEventListener("DACEditableColChanged", editable_col_changed);

                // table filter event
                document.body.addEventListener("DACFilterChanged", filter_changed);

                // filter button state event
                document.body.addEventListener("DACFilterButtonState", filter_button_state);

                // load all relevant data and set up panels
                $.when(
                  request.get_table_metadata("dac-variables-meta", mid),
                  request.get_table("dac-variables-meta", mid),
                  request.get_table_metadata("dac-datapoints-meta", mid),
                  request.get_table("dac-datapoints-meta", mid),
                ).then(
		   	          function (variables_meta, variables, data_table_meta, data_table)
                  {

                    // get number of variables, points and columns in table
                    var num_vars = variables_meta[0]["row-count"];
                    var num_cols = data_table_meta[0]["column-count"];
                    var num_editable_cols = editable_columns.attributes.length;
                    var num_points = data_table_meta[0]["row-count"];

                    // check variables to be included
                    var_include_columns = include_check(var_include_columns, num_vars, true);
                    meta_include_columns = include_check(meta_include_columns, num_cols, true);

                    // initialize sliders to all one, unless valid bookmark is available
                    var init_alpha_values = [];
                    for (var i = 0; i < num_vars; i++) {
                        init_alpha_values.push(1.0); }
                    if ("dac-slider-values" in bookmark) {

                        // make sure alpha values are the correct length
                        if (bookmark["dac-slider-values"].length == num_vars) {
                            init_alpha_values = bookmark["dac-slider-values"];
                        };
                    };

                    // get initial selections, using bookmarks if available
                    var init_sel_1 = include_check("dac-sel-1", num_points, false);
                    var init_sel_2 = include_check("dac-sel-2", num_points, false);
                    var init_sel_3 = include_check("dac-sel-3", num_points, false);

                    // get focus point
                    var init_focus = null;
                    if ("dac-sel-focus" in bookmark) {

                        // get bookmarked focus value
                        init_focus = bookmark["dac-sel-focus"];

                        // make sure focus is in at least one selection
                        if ((init_sel_1.indexOf(init_focus) == -1) &&
                            (init_sel_2.indexOf(init_focus) == -1) &&
                            (init_sel_3.indexOf(init_focus) == -1)) {
                              init_focus = null;
                        }
                    }

                    // get state of selection button, default to 1 (red)
                    var init_sel_type = 1;
                    if ("dac-sel-type" in bookmark) {
                        init_sel_type = bookmark["dac-sel-type"];
                    }

                    // set up maximum number of selections
                    var MAX_NUM_SEL = SELECTION_COLOR.length;
                    selections.setup(MAX_NUM_SEL);

                    // initialize selections/focus
                    selections.set_sel(init_sel_1, 1);
                    selections.set_sel(init_sel_2, 2);
                    selections.set_sel(init_sel_3, 3);
                    selections.set_focus(init_focus);
                    selections.set_sel_type(init_sel_type);

                    // initialize color by selection using bookmark, if any
                    var init_color_by_sel = -1;
                    if ("dac-color-by" in bookmark) {
                        init_color_by_sel = bookmark["dac-color-by"];
                    }

                    // initialize zoom extent, if bookmarked
                    var init_zoom_extent = null;
                    var init_zoom_flag = null;
                    if ("dac-zoom-extent" in bookmark) {
                        init_zoom_extent = bookmark["dac-zoom-extent"];

                        // check if button should be marked
                        if ("dac-zoom-flag" in bookmark) {
                            init_zoom_flag = bookmark["dac-zoom-flag"];
                            if (init_zoom_flag == false) {
                                init_zoom_extent = null;
                            }
                        }
                    }

                    // initialize subset center, if bookmarked
                    var init_subset_center = [.5, .5];
                    if ("dac-subset-center" in bookmark) {
                        init_subset_center = bookmark["dac-subset-center"];
                    }

                    // initialize subset itself, if bookmarked
                    var init_mds_subset = [];
                    var init_subset_flag = false;
                    for (var i = 0; i < num_points; i++ ) {
                        init_mds_subset.push(1);
                    }
                    if ("dac-mds-subset" in bookmark) {

                      // get bookmarked subset
                      var book_mds_subset = bookmark["dac-mds-subset"];

                      // check that subset is correct length
                      if (book_mds_subset.length == num_points) {
                        init_mds_subset = book_mds_subset;
                      }

                      // get subset button status
                      if ("dac-subset-flag" in bookmark) {
                        init_subset_flag = bookmark["dac-subset-flag"];
                      }
                    }
                    selections.update_subset(init_mds_subset);

                    // initialize lof button
                    var init_lof_button_state = true;
                    if ("dac-lof-button-state" in bookmark) {
                        init_lof_button_state = bookmark["dac-lof-button-state"];
                    }

                    // initialize difference button order and position
                    var init_fisher_order = [];
                    var init_fisher_pos = null;
                    if ("dac-fisher-order" in bookmark) {

                        // get bookmarked fisher order and position
                        // (both are stored at the same time when bookmarked)
                        init_fisher_order = bookmark["dac-fisher-order"];
                        init_fisher_pos = bookmark["dac-fisher-pos"];

                        // check that order is correct length
                        if (init_fisher_order.length != num_vars) {
                            init_fisher_order = [];
                            init_fisher_pos = null;
                        }
                    }

                    // initialize difference button status
                    var init_diff_desired_state = null;
                    if ("dac-diff-desired-state" in bookmark) {
                        init_diff_desired_state = bookmark["dac-diff-desired-state"];
                    }

                    // initialize plots selected
                    var init_plots_selected = [];
                    var init_plots_displayed = [1,1,1];
                    if ("dac-plots-selected" in bookmark) {

                        // both selected and displayed plots are bookmarked simultaneously
                        init_plots_selected = bookmark["dac-plots-selected"];
                        init_plots_displayed = bookmark["dac-plots-displayed"];

                        // check if plots are in included variables list
                        // if not, revert to first three variables
                        for (var i = 0; i < init_plots_selected.length; i++) {
                            if (var_include_columns.indexOf(init_plots_selected[i]) == -1) {
                                init_plots_selected = [];
                                init_plots_displayed = [1,1,1];
                            }
                        }
                    }

                    // initialize plot zoom values
                    var init_plots_zoom_x = new Array(3);
                    var init_plots_zoom_y = new Array(3);
                    for (var i = 0; i < 3; i++) {
                    init_plots_zoom_x[i] = ["-Inf", "Inf"];
                        init_plots_zoom_y[i] = ["-Inf", "Inf"];
                    }

                    // check for plot zoom bookmarks
                    if ("dac-plots-zoom-x" in bookmark) {

                        // both x and y are bookmarked at the same time
                        init_plots_zoom_x = bookmark["dac-plots-zoom-x"];
                        init_plots_zoom_y = bookmark["dac-plots-zoom-y"];
                    }

                    // check for plot links bookmark
                    var init_link_plots = [0,0,0];
                    if ("dac-link-plots" in bookmark) {
                        init_link_plots = bookmark["dac-link-plots"];
                    }

                    // check for sort order bookmark
                    var init_sort_order = null;
                    var init_sort_col = null;
                    if ("dac-table-order" in bookmark) {

                        // check if sort col exists
                        if (bookmark["dac-table-sort-col"] < (num_cols + num_editable_cols)) {
                            init_sort_order = bookmark["dac-table-order"];
                            init_sort_col = bookmark["dac-table-sort-col"];
                        }
                    }

                    // initialize table column filters, if bookmarked
                    var column_filters = [];
                    for (var i = 0; i < (num_cols + num_editable_cols + num_origin_cols); i++) {
                        column_filters.push("");
                    }
                    if ("dac-table-filters" in bookmark) {

                        // check if column filters are in table
                        if (bookmark["dac-table-filters"].length == column_filters.length) {
                            column_filters = bookmark["dac-table-filters"];
                        }
                    }

                    // initialize filter button state and filter mask
                    var init_filter_button = false;
                    var init_filter_mask = [];
                    for (var i = 0; i < num_points; i++) {
                        init_filter_mask.push(1.0);
                    }
                    if ("dac-filter-button-state" in bookmark) {
                        init_filter_button = bookmark["dac-filter-button-state"];

                        // check if filters is correct length
                        if (bookmark["dac-filter-mask"].length == num_points) {
                            init_filter_mask = bookmark["dac-filter-mask"];
                        }
                    }

                    // update filter mask/button in selections
                    selections.update_filter(init_filter_mask, init_filter_button);

                    // set up table with editable columns
                    metadata_table.setup(data_table_meta, data_table, meta_include_columns,
                      editable_columns, model_origin, MODEL_NAME, MAX_FREETEXT_LEN,
                      MAX_NUM_SEL, USER_SEL_COLORS, init_sort_order, init_sort_col,
                      column_filters
                    );

                    // set up the alpha sliders
                    alpha_sliders.setup(ALPHA_STEP, num_vars,
                      variables[0]["data"][0], MAX_SLIDER_NAME,
                      var_include_columns, init_alpha_values
                    );

                    // set up the alpha buttons
                    alpha_buttons.setup(num_vars, var_include_columns, use_PCA_comps);

                    // set up the time series plots
                    plots.setup(SELECTION_COLOR, FOCUS_COLOR, PLOT_ADJUSTMENTS,
                      MAX_TIME_POINTS, MAX_NUM_PLOTS, MAX_PLOT_NAME, MODEL_NAME,
                      variables_meta, variables, var_include_columns,
                      data_table[0]["data"][0].length, init_plots_selected,
                      init_plots_displayed, init_plots_zoom_x, init_plots_zoom_y,
                      init_link_plots
                    );
                    
                    // set up MDS scatter plot buttons
                    scatter_buttons.setup(SELECTION_COLOR, MAX_NUM_PLOTS, init_subset_flag, 
                      init_zoom_flag, init_fisher_order, init_fisher_pos, 
                      init_diff_desired_state, var_include_columns, data_table_meta[0], 
                      meta_include_columns, data_table[0], editable_columns, model_origin, 
                      init_color_by_sel, MAX_COLOR_NAME, use_PCA_comps, lof_values, 
                      init_lof_button_state
                    );

                    // set up the MDS scatter plot
                    var init_color_by_col = scatter_buttons.get_color_by_col();
                    scatter_plot.setup(
                      MAX_POINTS_ANIMATE, 
                      SCATTER_BORDER, 
                      POINT_COLOR,
                      POINT_SIZE, 
                      SCATTER_PLOT_TYPE, 
                      NO_SEL_COLOR, 
                      SELECTION_COLOR,
                      FOCUS_COLOR, 
                      COLOR_BY_LOW, 
                      COLOR_BY_HIGH, 
                      cont_colormap,
                      OUTLINE_NO_SEL, 
                      OUTLINE_SEL, 
                      var_include_columns,
                      init_alpha_values, 
                      init_color_by_col, 
                      init_zoom_extent, 
                      init_subset_center,
                      use_PCA_comps
                    );
                        
                    // remove loading spinner
                    $("#dac-model-loading").remove();

                    // Create React selector
                    const selector = 
                      (
                      <Provider store={store}>
                        <Selector 
                          // Padding around the scatterplot
                          SCATTER_BORDER={SCATTER_BORDER}
                        />
                      </Provider>
                      )
                    ;

                    const dac_selector_root = createRoot(document.getElementById('dac-selector-svg-container'));
                    dac_selector_root.render(selector);

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
                        $("#dac-plots-displayed-" + (i+1)).remove();
                        $("#dac-plots-not-displayed-" + (i+1)).remove();
                        $("#dac-download-plot-" + (i+1)).remove();
                    }

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

    // error checking for included rows/columns
    // bookmark_name is the bookmark tag,
    // num_include is the length the array is checked against
    // full is true if returned array is to include every index
    // when bookmark is not present, false to return empty array
    function include_check (bookmark_name, num_include, full)
    {

        // assume we include all meta data columns
        var include_columns = [];

        // check if bookmark_name is a string
        if (typeof(bookmark_name) !== 'string') {
            include_columns = bookmark_name;
        }

        // check bookmarks for variables to include
        if (bookmark_name in bookmark) {

            // maximum bookmarked variable to include
            var max_include = Math.max.apply(null,bookmark[bookmark_name]);

            // if the highest index variables is less than number of variables we
            // can use the bookmarked list of variable to include
            if (max_include < num_include) {
                include_columns = bookmark[bookmark_name];
            }
        }

        // change included from [] to list of indices, if necessary
        if (full) {
            if (include_columns.length == 0) {

                include_columns = [];
                for (var i = 0; i < num_include; i++) {
                    include_columns.push(i);
                }
            }
        }

        // return columns to include
        return include_columns;

    }

    // custom event for change in alpha slider values
    function alpha_values_changed (new_alpha_values)
    {
        // update actual sliders
        alpha_sliders.set_alpha_values(new_alpha_values.detail);

        // update MDS scatter plot
        scatter_plot.update(new_alpha_values.detail);

        // update lof button to show that it's out of date
        lof_button_changed({detail: false});

        // update bookmark to reflect new values
        bookmarker.updateState({"dac-slider-values": new_alpha_values.detail});
    }

    // custom event for change in lof button state
    function lof_button_changed (new_lof_state)
    {
        scatter_buttons.update_lof_button(new_lof_state.detail);

        // update bookmark to reflect to lof value
        bookmarker.updateState({"dac-lof-button-state": new_lof_state.detail});
    }

    // custom event for change in selection 1, selection 2, active selection
    function selections_changed (new_selections)
    {
        // re-order selection order randomly
        // (to prevent always showing 1st part of long selection)
        selections.shuffle();

        // update focus since selection changed
        selections.update_focus();

        // update scatter plot
        scatter_plot.draw();

        // show difference out of sync
        scatter_buttons.toggle_difference(false);

        // update selections in time series plot
        plots.update_plots();

		// update table - select corresponding rows (assumes they are stored in manage_selections.js)
		metadata_table.select_rows();

		// jump to top row in table for current selection (if there is one)
		metadata_table.jump_to (new_selections.detail.active_sel);

		// bookmark selections
		bookmarker.updateState ({"dac-sel-1": selections.sel(1), "dac-sel-2": selections.sel(2),
		                         "dac-sel-3": selections.sel(3), "dac-sel-focus": selections.focus(),
		                         "dac-diff-desired-state": false})
    }

    // custom event for jumping to an individual selection in the table
    function active_selection_changed (active_selection)
    {
        // update new active selection
        selections.set_focus(active_selection.detail.active_sel);

        // re-draw curves to show active selection
        plots.draw();

        // highlight in scatter plot
        scatter_plot.draw();

        // re-draw rows in table
        metadata_table.select_rows();

        // jump to focus, unless it was a defocus event
        if (active_selection.detail.active_sel != null) {
            metadata_table.jump_to ([active_selection.detail.active_sel]);
        }

        // bookmark focus selection
		bookmarker.updateState ({"dac-sel-focus": selections.focus()})
    }

    // custom event for difference calculation
    function difference_computed (diff_values)
    {
        // get variables passed
        var fisher_order = diff_values.detail.fisher_order;
        var fisher_pos = diff_values.detail.fisher_pos;
        var diff_desired_state = diff_values.detail.diff_desired_state;

        // show first three most different plots
        plots.change_selections(fisher_order.slice(fisher_pos));

        // bookmark difference values
        bookmarker.updateState({"dac-fisher-order": fisher_order,
                                "dac-fisher-pos": fisher_pos,
                                "dac-diff-desired-state": diff_desired_state});

    }

    // user changed subset (can change selections as well)
    function subset_changed (new_subset)
    {
        // update subset and selections
        var new_sel = selections.update_subset (new_subset.detail.new_subset);

        // re-draw curves to show new selections
        plots.draw();

        // re-draw scatter plot, before updating coordinates
        scatter_plot.draw();

        // update subset button status
        scatter_buttons.set_subset_button(new_subset.detail.subset_flag);

        // update change in selection
        if (new_sel[1]) {
            scatter_buttons.toggle_difference(false);
        }

        // reset zoom, if necessary
        if (new_subset.detail.zoom) {
            scatter_plot.reset_zoom();
        }

        // re-draw scatter plot, subset changed
        scatter_plot.update(alpha_sliders.get_alpha_values());

        // re-draw rows in table
        metadata_table.select_rows();

        // jump to either selection or at least subset
        if (new_sel[0].length > 0) {
            metadata_table.jump_to (new_sel[0]);
        }

        // bookmark subset data and selection data (also changes)
        bookmarker.updateState({"dac-mds-subset": new_subset.detail.new_subset,
                                "dac-subset-center": new_subset.detail.subset_center,
                                "dac-subset-flag": new_subset.detail.subset_flag,
                                "dac-sel-1": selections.sel(1), "dac-sel-2": selections.sel(2),
                                "dac-sel-3": selections.sel(3), "dac-sel-focus": selections.focus(),
                                "dac-diff-desired-state": false});

    }

    // event for changing time series plot selections
    function plots_changed (new_selections)
    {
        // bookmark new plot selections
        bookmarker.updateState({"dac-plots-selected": new_selections.detail.plots_selected,
                                "dac-plots-displayed": new_selections.detail.plots_displayed});
    }

    // event for changing coloring of scatter plot
    function color_by_changed (new_color_sel)
    {
        // bookmark selected color
        bookmarker.updateState({"dac-color-by": new_color_sel.detail});
    }

    // event for changing selection type
    function sel_type_changed (new_sel_type)
    {
        // bookmark selection type
        bookmarker.updateState({"dac-sel-type": new_sel_type.detail});
    }

    // event for zoom changes
    function zoom_changed (new_extent)
    {
        
        // update button status
        scatter_buttons.set_zoom_button(new_extent.detail.zoom);

        // dispatch update to zoom in redux
        window.store.dispatch(setZoomExtent(new_extent.detail.extent));
        window.store.dispatch(setZoomFlag(new_extent.detail.zoom));

        // bookmark new zoom extent
        bookmarker.updateState({"dac-zoom-extent": new_extent.detail.extent,
                                "dac-zoom-flag": new_extent.detail.zoom});
    }

    // event for zoom changes in time series plots
    function plot_zoom_changed (new_plot_zoom)
    {
        // bookmark new zoom extents (all three)
        bookmarker.updateState({"dac-plots-zoom-x": new_plot_zoom.detail.plots_zoom_x,
                                "dac-plots-zoom-y": new_plot_zoom.detail.plots_zoom_y})
    }

    // event for link plots changes in time series
    function link_plots_changed (new_links)
    {
        // bookmark new links
        bookmarker.updateState({"dac-link-plots": new_links.detail});
    }

    // event for table order changes
    function table_order_changed (new_order)
    {
        // bookmark new order
        bookmarker.updateState({"dac-table-order": new_order.detail.sort_order,
                                "dac-table-sort-col": new_order.detail.sort_col});
    }

    // event for change in editable column
    function editable_col_changed (col)
    {        
        // change color in scatter plot if necessary
        scatter_buttons.update_color_by_col(col.detail);
    }

    // event for table filter change
    function filter_changed (filter)
    {
        // if filter button is on, turn it off
        scatter_plot.turn_off_filter_button();

        // bookmark filter change
        bookmarker.updateState({"dac-table-filters": filter.detail.columnFilters});
    }

    // event for scatter button filter state
    function filter_button_state (state)
    {

        // update filter button state
        selections.update_filter (state.detail.filter_mask, state.detail.button_state);

        // update button appearance
        scatter_buttons.set_filter_button();

        // bookmark filter button state
        bookmarker.updateState({"dac-filter-button-state": state.detail.button_state,
                                "dac-filter-mask": state.detail.filter_mask});
    }

});
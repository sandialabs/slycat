// This script runs time filter wizard for DAC.
//
// S. Martin
// 1/10/2020

import api_root from "js/slycat-api-root";
import client from "js/slycat-web-client";
import markings from "js/slycat-selectable-markings";
import ko from "knockout";
import mapping from "knockout-mapping";
import fileUploader from "js/slycat-file-uploader-factory";
import dacWizardUI from "../html/dac-time-filter-wizard.html";
import request from "./dac-request-data.js";
import URI from "urijs";
import "jquery-ui/ui/widgets/slider";

function constructor(params)
{

    var component = {};

    // tabs in wizard ui
    component.tab = ko.observable(0);

    // get origin model ID
    var origin_model = params.models()[0]._id();

    // project/model information
    component.project = params.projects()[0];

    // default model name is "Unfinished" in case something goes wrong
    component.model = mapping.fromJS({_id: null, name: "Unfinished Dial-A-Cluster Model",
                            description: "", marking: markings.preselected()});

    // list of models in current project
    component.model_attributes = mapping.fromJS([]);

    // dac-generic format is selected by default
    component.dac_model_type = ko.observable("new");

    // time filter data
    var num_vars = 0;
    var var_names = [];
    var var_range = [];
    var time_points = [];

    // user selected time ranges
    var user_range = [];

    // creates a model of type "DAC"
    component.create_model = function() {

        client.post_project_models({
        pid: component.project._id(),
        type: "DAC",
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function(mid) {
            component.model._id(mid);
            assign_pref_defaults();
            list_variables();
        },
        error: function() {
            $("#dac-load-model-error").text("Server error creating model.");
            $("#dac-load-model-error").show();
        }
        });

    };

    // create a model as soon as the dialog loads
    // we rename, change description, and marking later.
    component.create_model();

    // if the user selects the cancel button we delete the model just created
    component.cancel = function() {
        if(component.model._id())
            client.delete_model({ mid: component.model._id() });
    };

    // assigns default ui preferences for DAC to slycat
    var assign_pref_defaults = function () {

        // assign defaults for all preferences, override available in push script

        // from dac-ui.pref file:
        // ----------------------
        var dac_ui_parms = {

            // the step size for the alpha slider (varies from 0 to 1)
            ALPHA_STEP: 0.001,

            // default width for the alpha sliders (in pixels)
            ALPHA_SLIDER_WIDTH: 170,

            // default height of alpha buttons (in pixels)
            ALPHA_BUTTONS_HEIGHT: 33,

            // number of points over which to stop animation
            MAX_POINTS_ANIMATE: 2500,

            // border around scatter plot (fraction of 1)
            SCATTER_BORDER: 0.025,

            // scatter button toolbar height
            SCATTER_BUTTONS_HEIGHT: 37,

            // scatter plot colors (css/d3 named colors)
            POINT_COLOR: 'whitesmoke',
            POINT_SIZE: 5,
            NO_SEL_COLOR: 'gray',
            SELECTION_1_COLOR: 'red',
            SELECTION_2_COLOR: 'blue',
            COLOR_BY_LOW: 'white',
            COLOR_BY_HIGH: 'dimgray',
            OUTLINE_NO_SEL: 1,
            OUTLINE_SEL: 2,

            // pixel adjustments for d3 time series plots
            PLOTS_PULL_DOWN_HEIGHT: 38,
            PADDING_TOP: 10,        // 10 (values when plot selectors were)
            PADDING_BOTTOM: 14,     // 24 (at the bottom of the plots)
            PADDING_LEFT: 37,
            PADDING_RIGHT: 10,
            X_LABEL_PADDING: 4,
            Y_LABEL_PADDING: 13,
            LABEL_OPACITY: 0.2,
            X_TICK_FREQ: 80,
            Y_TICK_FREQ: 40,

        };

        // upload the default ui parms
        client.put_model_parameter ({
            mid: component.model._id(),
            aid: "dac-ui-parms",
            value: dac_ui_parms,
            error: function () {

                $("#dac-load-model-error").text("Error uploading UI preferences.");
                $("#dac-load-model-error").show();

                $('.dac-gen-browser-continue').toggleClass("disabled", false);
                $('.pts-process-continue').toggleClass('disabled', false);

            },
        });

    }

    // populate models to choose from
    var list_variables = function () {

        // load variable names
        $.when(request.get_table("dac-variables-meta", origin_model),
               request.get_arrayset("dac-time-points", origin_model)).then(
		   	   function (variables, var_time_points)
                {

                    // variables names
                    var_names = variables[0]["data"][0];
                    num_vars = var_names.length;

                    // keep time points for checking minimum later
                    time_points = var_time_points[0];

                    // look through each time course
                    var bad_time_points = false;
                    for (var j = 0; j < time_points.length; j++) {

                        // compute variable min, max
                        var range_min = Math.min(...time_points[j]);
                        var range_max = Math.max(...time_points[j]);

                        // make sure time points are increasing
                        if (range_max <= range_min) {
                            bad_time_points = true;
                        }

                        // compute minimum time step
                        var min_step = range_max - range_min;
                        for (var k = 1; k < time_points[j].length; k++) {
                            var time_step = time_points[j][k] - time_points[j][k-1];
                            if (min_step > time_step) {
                                min_step = time_step;
                            }
                        }

                        // if min step is less than or equal to zero, use average step
                        var range_step = min_step;
                        if (range_step <= 0) {
                            range_step = (range_max - range_min)/(time_points[j].length - 1);
                        }

                        // var range is min, max, step for each time series
                        var_range.push ([range_min, range_max, range_step]);

                        // set user range to maximum by default
                        user_range.push ([range_min, range_max])

                    }

                    // do not display sliders if time points are bad
                    if (bad_time_points) {

                        $("#dac-load-model-error").text("Found non-increasing time series, can't create new model.");
                        $("#dac-load-model-error").show();
                        $(".browser-continue").prop("disabled", true);

                    } else {

                        // couple variables to sliders
                        display_var_sliders.bind($("#dac-time-sliders"))();

                    }

                },
		   	   function ()
		   	    {
		   	        $("#dac-load-model-error").text("Could not load model data.");
		   	        $("#dac-load-model-error").show();
		   	        $(".browser-continue").prop("disabled", true);
		   	    });
    }

    // populate sliders and values for time filters
    var display_var_sliders = function () {

        this.empty();

        // display time filter sliders
        for (var j = 0; j != num_vars; ++j)
        {

            // get min and max of variable range
            var range_min = var_range[j][0];
            var range_max = var_range[j][1];

            // step is min time step or average if min is zero
            var range_step = var_range[j][2];

            // add current range label to HTML
            var label_item = $('<label id="dac-time-label-' + j + '">').appendTo(this);
            label_item.text(var_names[j] + ": " + range_min + " - " + range_max);

            // add current slider to HTML
			var slider_item = $('<div id="dac-time-slider-' + j +
			    '" style="margin-bottom: 15px; margin-left: 10px; margin-right: 10px">').appendTo(this);

            $("#dac-time-slider-" + j).slider({
               range:true,
               min: range_min,
               max: range_max,
               values: [range_min, range_max],
               step: range_step,
               slide: function( event, ui ) {

                  // update text based on current slider vlaues
                  var slider_id = $(this).attr("id").split("-").pop();
                  $("#dac-time-label-" + slider_id).text(var_names[slider_id] +
                        ": " + ui.values[0] + " - " + ui.values[1]);

                  // update user range
                  user_range[slider_id][0] = ui.values[0];
                  user_range[slider_id][1] = ui.values[1];

               }
            });
        }
    }

    // reset sliders to full range
    component.reset_sliders = function () {

        for (var j = 0; j < num_vars; j++) {

            // reset actual sliders
            $("#dac-time-slider-" + j).slider({values: [var_range[j][0], var_range[j][1]]});
            $("#dac-time-label-" + j).text(var_names[j] + ": " + var_range[j][0] + " - " + var_range[j][1]);

            // reset saved values
            user_range[j][0] = var_range[j][0];
            user_range[j][1] = var_range[j][1];

        }

    }

    // done with sliders, check for minimum number of time points
    component.check_time_filters = function() {

        // turn off any errors
        $("#dac-load-model-error").hide();

        // compare user ranges to time points array (min number is 2)
        var num_time_points_OK = true;
        for (var i = 0; i < time_points.length; i++) {
            if (time_points[i].filter(function (time) {
                    return (time >= user_range[i][0] & time <= user_range[i][1]);
                }).length < 2) {
                num_time_points_OK = false;
            }
        }

        // put up error if user selected only one time point
        if (num_time_points_OK) {

            // change name back to blank
            component.model.name("")

            // go to upload page
            component.tab(1)

        } else {

            $("#dac-load-model-error").text("Please select at least two time points per variable.");
            $("#dac-load-model-error").show();

        }

    };

    // wizard finish model code
    // ************************

    // very last function called to launch model
    component.go_to_model = function(new_bookmarks) {

      // use same bookmarks for new model
      var bid = URI(window.location).query(true).bid;
      location = '/models/' + component.model._id() + '?bid=' + bid;

    };

    component.finish_model = function () {

        // check if name is valid
        if (component.model.name() == "") {

            $("#slycat-model-name").addClass("is-invalid");

        } else {

            // turn off model name error
            $("#slycat-model-name").removeClass("is-invalid");

            // declare import a success
            client.put_model(
            {
                mid: component.model._id(),
                name: component.model.name(),
                description: component.model.description(),
                marking: component.model.marking(),
                success: function()
                {
                    client.post_model_finish({
                    mid: component.model._id(),
                    success: function() {

                            // create time filtered model
                            client.post_sensitive_model_command({
                                mid: component.model._id(),
                                type: "DAC",
                                command: "filter_model",
                                parameters: {time_filter: user_range,
                                             origin_model: origin_model},
                                success: function (result)
                                {

                                    // start new model
                                    component.go_to_model();

                                },
                                error: function ()
                                {
                                    // turn off wait button
                                    $('.dac-launch-thread').toggleClass("disabled", false);

                                    $("#dac-filter-model-error").text("Server error: could not create time filtered model.")
                                    $("#dac-filter-model-error").show();
                                }
                            });

                        }
                    });
                },
                error: function() {

                    $("#dac-filter-model-error").text("Server error finishing model.")
                    $("#dac-filter-model-error").show();

                }
            });

        }
    };

    // function for operating the back button in the wizard
    component.back = function() {

        // get current tab
        var target = component.tab();

        // go back one
        component.tab(target-1);
    };

return component;
}

export default {
    viewModel: constructor,
    template: dacWizardUI,
}
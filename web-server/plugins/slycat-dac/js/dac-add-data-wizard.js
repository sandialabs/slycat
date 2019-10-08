// This script runs the input wizard for dial-a-cluster.
// It is heavily modified from the CCA wizard code.
//
// S. Martin
// 3/31/2017

import api_root from "js/slycat-api-root";
import client from "js/slycat-web-client";
import markings from "js/slycat-markings";
import ko from "knockout";
import mapping from "knockout-mapping";
import fileUploader from "js/slycat-file-uploader-factory";
import dacWizardUI from "../html/dac-add-data-wizard.html";
import URI from "urijs";

function constructor(params)
{

    var component = {};

    // get project and model IDs
    var origin_project = params.projects()[0];
    var origin_model = params.models()[0];

    // global variables to store model names and ids
    var model_names = [];
    var model_ids = [];
    var models_selected = [];

    // tabs in wizard ui
    component.tab = ko.observable(0);

    // project/model information
    component.project = params.projects()[0];
    // Alex removing default model name per team meeting discussion
    // component.model = mapping.fromJS({_id: null, name: "New Dial-A-Cluster Model",
    //                         description: "", marking: markings.preselected()});
    component.model = mapping.fromJS({_id: null, name: "Unfinished Dial-A-Cluster Model",
                            description: "", marking: markings.preselected()});

    // list of models in current project
    component.model_attributes = mapping.fromJS([]);

    // dac-generic format is selected by default
    component.dac_model_type = ko.observable("new");

    // creates a model of type "DAC"
    component.create_model = function() {

        // use large dialog format
        // $(".modal-dialog").addClass("modal-lg");

        // get origin model name and truncate, if necessary
        var origin_model_name = origin_model.name();

        // set labels to origin model
        $("#dac-add-data-project-model").text('Project onto this model ("' +
            origin_model_name + '").');
        $("#dac-add-data-select-model").text('Select models to combine with this model ("' +
            origin_model_name + '").');

        client.post_project_models({
        pid: component.project._id(),
        type: "DAC",
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function(mid) {
            component.model._id(mid);
            assign_pref_defaults();
            list_models();
        },
        error: function() {
            $("#dac-load-model-error").text("Error creating model.");
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

    // switches projection and new model
    component.select_type = function() {

        // go to upload page
        component.tab(1)

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
    var list_models = function () {

        client.get_project_models({
            pid: origin_project._id(),
            error: function () {
                $("#dac-load-model-error").text("Server error: could not retrieve models.");
                $("#dac-load-model-error").show();
            },
            success: function (result) {

                // look through models in this project
                for (var i = 0; i < result.length; i++) {

                    // is it a DAC model, and not this model, or the new model?
                    if ((result[i]["model-type"] == "DAC") &&
                       (result[i]["_id"] != origin_model._id()) &&
                       (result[i]["_id"] != component.model._id())) {

                        // keep model names and id
                        model_names.push(result[i]["name"]);
                        model_ids.push(result[i]["_id"]);
                    }
                }

                // put model names into gui attributes
                var attributes = [];
                for (var i = 0; i != model_names.length; i++) {

                    attributes.push({
                        name: model_names[i],
                        type: "string",
                        constant: null,
                        disabled: null,
                        Include: false,
                        hidden: false,
                        selected: false,
                        lastSelected: false,
                        tooltip: ""
                    });
                };

                // give access to gui
                mapping.fromJS(attributes, component.model_attributes);

            }});
    }

    // check if models are compatible
    component.check_models = function () {

        // get models selected (use empty-model for place holder
        // to prevent conversion from list when calling server)
        models_selected = [origin_model._id()];
        for (var i = 0; i != model_ids.length; i++) {

            // was model selected?
            if (component.model_attributes()[i].Include()) {
                models_selected.push(model_ids[i]);
            }
        }

        // must select at least one model
        if (models_selected.length == 1) {

            $("#dac-inc-model-error").text("Please select at least one model to include in the analysis.")
            $("#dac-inc-model-error").show();

        } else {

            // turn on wait button
            $('.dac-check-compatibility-continue').toggleClass("disabled", true);

            // turn off any errors
            $("#dac-inc-model-error").hide();

            // call server to check model compatibility
            client.get_model_command({
                mid: origin_model._id(),
                type: "DAC",
                command: "check_compatible_models",
                parameters: [models_selected],
		        success: function (result)
		        {
		            // turn off wait button
		            $('.dac-check-compatibility-continue').toggleClass("disabled", false);

		            // check for failure
		            if (result[0] == "Error") {

		                $("#dac-inc-model-error").text("Error: " + result[1] + "  Please make new selection.");
		                $("#dac-inc-model-error").show();

		            // continue with combination
		            } else {

                        // change name back to blank
                        component.model.name("")

                        // go to name model
                        component.tab(2);
		            }

		        },
		        error: function ()
		        {
		        	// turn off wait button
		            $('.dac-check-compatibility-continue').toggleClass("disabled", false);

                    $("#dac-inc-model-error").text("Server error: could not check model compatibility.");
                    $("#dac-inc-model-error").show();

		        }
            });
        }
    }

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

                            // combine by recomputing
                            client.get_model_command({
                                mid: component.model._id(),
                                type: "DAC",
                                command: "combine_models",
                                parameters: [models_selected, component.dac_model_type()],
                                success: function (result)
                                {

                                    // start new model
                                    component.go_to_model();

                                },
                                error: function ()
                                {
                                    // turn off wait button
                                    $('.dac-launch-thread').toggleClass("disabled", false);

                                    $("#dac-combine-model-error").text("Server error: could not combine models.")
                                    $("#dac-combine-model-error").show();
                                }
                            });

                        }
                    });
                },
                error: function() {

                    $("#dac-combine-model-error").text("Error finishing model.")
                    $("#dac-combine-model-error").show();

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
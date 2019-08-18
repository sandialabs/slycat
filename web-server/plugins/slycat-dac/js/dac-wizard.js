// This script runs the input wizard for dial-a-cluster.
// It is heavily modified from the CCA wizard code.
//
// S. Martin
// 3/31/2017

import api_root from "js/slycat-api-root";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import markings from "js/slycat-markings";
import ko from "knockout";
import mapping from "knockout-mapping";
import fileUploader from "js/slycat-file-uploader-factory";
import dacWizardUI from "../html/dac-wizard.html";


function constructor(params)
{

    var component = {};

    // tabs in wizard ui
    component.tab = ko.observable(0);

    // project/model information
    component.project = params.projects()[0];
    // Alex removing default model name per team meeting discussion
    // component.model = mapping.fromJS({_id: null, name: "New Dial-A-Cluster Model",
    //                         description: "", marking: markings.preselected()});
    component.model = mapping.fromJS({_id: null, name: "Unfinished Dial-A-Cluster Model",
                            description: "", marking: markings.preselected()});

    // DAC generic format file selections
    component.browser_dac_file = mapping.fromJS({
        path:null,
        selection: [],
        progress: ko.observable(null),
    });

    // PTS META/CSV zip file selection
    component.browser_zip_file = mapping.fromJS({
        path:null,
        selection: [],
        progress: ko.observable(null),
    });

    // DAC generic parsers
    component.parser_dac_file = ko.observable(null);

    // DAC META/CSV parser (now in zip file)
    component.parser_zip_file = ko.observable(null);

    // dac-generic format is selected by default
    component.dac_format = ko.observable("dac-gen");

    // parameters for testing PTS ingestion
    component.csv_min_size = ko.observable(null);
    component.min_num_dig = ko.observable(null);

    var num_vars = 0;

    // process pts continue or stop flag
    var process_continue = false;
    var already_processed = false;

    // ordering and locations of .var, .time, and .dist files
    var var_file_inds = [];
    var time_file_inds = [];
    var dist_file_inds = [];

    // csv/meta file information
    var csv_files = [];
    var csv_file_names = [];
    var meta_files = [];
    var meta_file_names = [];

    // upload state information

    // creates a model of type "DAC"
    component.create_model = function() {

        // use large dialog format
        // $(".modal-dialog").addClass("modal-lg");

        // set PTS parameter defaults
        component.csv_min_size = 10;
        component.min_num_dig = 3;

        client.post_project_models({
            pid: component.project._id(),
            type: "DAC",
            name: component.model.name(),
            description: component.model.description(),
            marking: component.model.marking(),
            success: function(mid) {
                component.model._id(mid);
                assign_pref_defaults();
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

    // switches between dac generic and pts tabs
    component.select_type = function() {
        var type = component.dac_format();

        if (type === "dac-gen") {
            component.tab(1);
        } else if (type === "pts") {
            component.tab(2);
        }
    };

    // DAC format upload code
    // **********************

    // this function uploads the meta data table in DAC generic format
    component.upload_dac_format = function() {

        $("#dac-gen-file-error").hide();

        // check for file selected
        if (component.browser_dac_file.selection().length > 0) {

            // get file extension
            var file = component.browser_dac_file.selection()[0];
            var file_ext = file.name.split(".");
            file_ext = file_ext[file_ext.length - 1];

            if (file_ext == 'zip') {

                // set model name back to blank
                component.model.name("");

                // go to model naming
                component.tab(3);

            } else {
                $("#dac-gen-file-error").text("Please select a file with the .zip extension.")
                $("#dac-gen-file-error").show();
            }

        } else {

            $("#dac-gen-file-error").text("Please select DAC generic .zip file.")
            $("#dac-gen-file-error").show();

        }

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

    // PTS format upload code
    // **********************

    // this function starts the upload process for the CSV/META format
    component.upload_pts_format = function() {

        // check PTS parse parameters
        var csv_parm = Math.round(Number(component.csv_min_size));
        var dig_parm = Math.round(Number(component.min_num_dig));

        // check for input parameter errors
        var no_errors = true;

        if (csv_parm < 2) {

            $("#dac-min-CSV").addClass("is-invalid");
            no_errors = false;

        } else {

            // clear error
            $("#dac-min-CSV").removeClass("is-invalid");
        }

        if (dig_parm < 1) {

            $("#dac-min-dig").addClass("is-invalid");
            no_errors = false;
        } else {

            // clear error
            $("#dac-min-dig").removeClass("is-invalid");
        }

        // check for file errors
        $("#dac-pts-file-error").hide();

        // check for file selected
        if (component.browser_zip_file.selection().length > 0) {

            // get file extension
            var file = component.browser_zip_file.selection()[0];
            var file_ext = file.name.split(".");
            file_ext = file_ext[file_ext.length - 1];

            if (file_ext != 'zip') {

                $("#dac-pts-file-error").text("Please select a file with the .zip extension.")
                $("#dac-pts-file-error").show();
                no_errors = false;
            }

        } else {

            $("#dac-pts-file-error").text("Please select PTS CSV/META .zip file.")
            $("#dac-pts-file-error").show();
            no_errors = false;
        }

        // if everything is OK go to next tab
        if (no_errors == true) {

            // set model name back to blank
            component.model.name("");

            // if already uploaded data, do not re-upload
            component.tab(3);

        }
    };

    // wizard finish model code
    // ************************

    // very last function called to launch model
    component.go_to_model = function() {
      location = '/models/' + component.model._id();
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

                            // set up pts format parameters

                            // file selected
                            var file = component.browser_zip_file.selection()[0];

                            // get csv and number digitizer parameters
                            var csv_parm = Math.round(Number(component.csv_min_size));
                            var dig_parm = Math.round(Number(component.min_num_dig));

                            // parameters for call to parser
                            var aids = [[csv_parm, dig_parm], ["DAC"]];
                            var parser = "dac-zip-file-parser";
                            var progress = component.browser_zip_file.progress;

                            // tab to show file upload
                            var tab = 2

                            // if not pts format, then change parameters
                            if (component.dac_format() == "dac-gen") {

                                // file selected
                                file = component.browser_dac_file.selection()[0];

                                // dac gen zip paraser parameters
                                aids = [["Null"], ["DAC"]];
                                parser = "dac-gen-zip-parser";
                                progress = component.browser_dac_file.progress;

                                // tab that shows file upload for DAC generic format
                                tab = 1;

                            }

                            // call to server

                            // turn on continue button
                            $(".dac-launch-thread").toggleClass("disabled", true);

                            console.log("Uploading file: " + file.name);

                            // upload file
                            var fileObject ={
                                pid: component.project._id(),
                                mid: component.model._id(),
                                file: file,
                                aids: aids,
                                parser: parser,
                                progress: progress,
                                progress_increment: 100,
                                success: function(){

                                        // turn off continue button
                                        $(".dac-launch-thread").toggleClass("disabled", false);

                                        // go to model
                                        component.go_to_model();

                                    },
                                error: function(){

                                    $("#dac-finish-model-error").text("There was a problem uploading the file: " + file);
                                    $("#dac-finish-model-error").show();

                                    $('.browser-continue').toggleClass("disabled", false);

                                    }
                                };
                            fileUploader.uploadFile(fileObject);

                            // show message
                            $(".dac-do-not-close-browser").show();

                            // show upload
                            component.tab(tab);

                         }
                    });
                },
                error: function() {
                    $("#dac-finish-model-error").text("Error finishing model.");
                    $("#dac-finish-model-error").show();
                }
            });
        }
    };

    // function for operating the back button in the wizard
    component.back = function() {

        var target = component.tab();

        // skip PTS ui tabs if we are DAC Generic format
        if(component.dac_format() == 'dac-gen' && component.tab() == 3)
        {
            target--;
        }

        // skip DAC Generic if we are PTS format
        if (component.dac_format() == 'pts' && component.tab() == 2)
        {
            target--;
        }

        target--;

        component.tab(target);
    };

return component;
}

// export default {
//     viewModel: constructor,
//     template: {require: "text!" + api_root + "resources/wizards/DAC/ui.html"}
// }

export default {
    viewModel: constructor,
    template: dacWizardUI,
}
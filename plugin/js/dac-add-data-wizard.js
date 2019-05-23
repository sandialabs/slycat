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
import dacWizardUI from "../html/dac-add-data-wizard.html";


function constructor(params)
{

    var component = {};

    // get project and model IDs
    var origin_project = params.projects()[0];
    var origin_model = params.models()[0];

    // tabs in wizard ui
    component.tab = ko.observable(0);

    // project/model information
    component.project = params.projects()[0];
    // Alex removing default model name per team meeting discussion
    // component.model = mapping.fromJS({_id: null, name: "New Dial-A-Cluster Model",
    //                         description: "", marking: markings.preselected()});
    component.model = mapping.fromJS({_id: null, name: "",
                            description: "", marking: markings.preselected()});

    // DAC generic format file selections
    component.browser_dac_file = mapping.fromJS({
        path:null,
        selection: [],
        progress: ko.observable(null),
    });
    component.browser_var_files = mapping.fromJS({
        path:null,
        selection: [],
        progress: ko.observable(null),
    });
    component.browser_time_files = mapping.fromJS({
        path:null,
        selection: [],
        progress: ko.observable(null),
    });
    component.browser_dist_files = mapping.fromJS({
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
    component.parser_var_files = ko.observable(null);
    component.parser_time_files = ko.observable(null);
    component.parser_dist_files = ko.observable(null);

    // DAC META/CSV parser (now in zip file)
    component.parser_zip_file = ko.observable(null);

    // dac-generic format is selected by default
    component.dac_model_type = ko.observable("new");

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
    var dac_upload = false;
    var csv_meta_upload = false;

    // creates a model of type "DAC"
    component.create_model = function() {

        // use large dialog format
        // $(".modal-dialog").addClass("modal-lg");

        // make sure upload state says nothing uploaded
        dac_upload = false;
        csv_meta_upload = false;
        var pref_defaults_upload = false;

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
            error: dialog.ajax_error("Error creating model.")
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
                dialog.ajax_error("Error uploading UI preferences.")("","","");
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
        if (csv_parm < 2 || dig_parm < 1) {

            dialog.ajax_error("The CSV parameter must be >= 2 and the digitizer parameter must be >= 1.")("","","");

        } else if (csv_meta_upload == true) {

            // if already uploaded data, do not re-upload
            component.tab(2);

        } else {

            // check for file selected
            if (component.browser_zip_file.selection().length > 0) {

                // get file extension
                var file = component.browser_zip_file.selection()[0];
                var file_ext = file.name.split(".");
                file_ext = file_ext[file_ext.length - 1];

                if (file_ext == 'zip') {

                    // do not re-upload files
                    csv_meta_upload = true;

                    // go to model naming
                    component.tab(2);

                } else {
                    dialog.ajax_error("Please select a file with the .zip extension.")("","","");
                }

            } else {
                dialog.ajax_error("Please select PTS CSV/META .zip file.")("","","");
            }
        }
    };

    // wizard finish model code
    // ************************

    // very last function called to launch model
    component.go_to_model = function() {
      location = '/models/' + component.model._id();
    };

    component.finish_model = function () {

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

                        // turn off continue button
                        $(".dac-launch-thread").toggleClass("disabled", true);

                        // upload zip file
                        var file = component.browser_zip_file.selection()[0];
                        console.log("Uploading file: " + file.name);

                        // get csv and number digitizer parameters
                        var csv_parm = Math.round(Number(component.csv_min_size));
                        var dig_parm = Math.round(Number(component.min_num_dig));

                        // pass # csv files and digitizers via aids
                        var fileObject ={
                            pid: component.project._id(),
                            mid: component.model._id(),
                            file: file,
                            aids: [[csv_parm, dig_parm, origin_model._id()], ["DAC"]],
                            parser: "dac-zip-file-parser",
                            progress: component.browser_zip_file.progress,
                            progress_increment: 100,
                            success: function(){

                                    // turn on continue button
                                    $(".dac-launch-thread").toggleClass("disabled", false);

                                    // go to model
                                    component.go_to_model();

                                },
                            error: function(){
                                dialog.ajax_error(
                                    "There was a problem uploading the file: " + file)
                                    ("","","");
                                    $('.pts-browser-continue').toggleClass("disabled", false);
                                }
                            };
                        fileUploader.uploadFile(fileObject);

                        // show message
                        $("#dac-do-not-close-browser").show();

                        // show upload
                        component.tab(1);

                    }
                });
            },
            error: dialog.ajax_error("Error updating model."),
        });
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

// export default {
//     viewModel: constructor,
//     template: {require: "text!" + api_root + "resources/wizards/DAC/ui.html"}
// }

export default {
    viewModel: constructor,
    template: dacWizardUI,
}
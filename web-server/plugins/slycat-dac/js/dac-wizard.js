// This script runs the input wizard for dial-a-cluster.
// It is heavily modified from the CCA wizard code.
//
// S. Martin
// 3/31/2017

import client from "js/slycat-web-client";
import markings from "js/slycat-selectable-markings";
import ko from "knockout";
import mapping from "knockout-mapping";
import fileUploader from "js/slycat-file-uploader-factory";
import dacWizardUI from "../html/dac-wizard.html";
import ZipInfo from "zipinfo.js";

function constructor(params)
{

    var component = {};

    // tabs in wizard ui
    component.tab = ko.observable(0);

    // tab labels for ui navigation
    var tabs = {'sel-format': 0,
                'dac-gen': 1,
                'pts': 2,
                'tdms': 3,
                'suffix-selection': 4,
                'tdms-options': 5,
                'name-model': 6};

    // project/model information
    component.project = params.projects()[0];

    // name defaults to "Unfinished" in case user aborts wizard prematurely
    component.model = mapping.fromJS({_id: null, name: "Unfinished Dial-A-Cluster Model",
                            description: "", marking: markings.preselected()});

    // DAC generic format file selections
    component.browser_dac_file = mapping.fromJS({
        path: null,
        selection: [],
        progress: ko.observable(null),
    });

    // PTS META/CSV zip file selection
    component.browser_zip_file = mapping.fromJS({
        path: null,
        selection: [],
        progress: ko.observable(null),
    });

    // tdms multiple file selection
    component.browser_tdms_files = mapping.fromJS({
        path: null,
        selection: [],
        progress: ko.observable(null),
    });

    // DAC generic parsers
    component.parser_dac_file = ko.observable(null);

    // DAC META/CSV parser (now in zip file)
    component.parser_zip_file = ko.observable(null);

    // tdms parser
    component.parser_tdms_files = ko.observable(null);

    // tdms suffixes to include
    component.suffix_attributes = mapping.fromJS([]);

    // dac-generic format is selected by default
    component.dac_format = ko.observable("tdms");
    component.dac_tdms_zip = ko.observable("false");

    // parameters for testing PTS ingestion
    component.csv_min_size = ko.observable(10);
    component.min_num_dig = ko.observable(3);

    // number of landmarks
    // (mathematical minimum number of landmarks is 3)
    var NUM_LANDMARKS = 200
    component.num_landmarks = ko.observable(NUM_LANDMARKS);

    // number of PCA components
    var NUM_COMPS = 10
    component.num_PCA_comps = ko.observable(NUM_COMPS);

    // use coordinates only (no landmarks)
    var CALC_TYPE = 'PCA';
    component.dac_calc_type = ko.observable(CALC_TYPE);

    // TDMS defaults
    var MIN_TIME_STEPS = 10;
    var MIN_NUM_CHANNELS = 2;
    var MIN_NUM_SHOTS = 1;
    var TDMS_TYPE = 'General';
    var UNION_TYPE = 'Union';
    var INFER_UNITS = true;
    var INFER_TIME = true;

    // parameters for testing TDMS ingestion
    component.min_time_steps = ko.observable(MIN_TIME_STEPS);
    component.min_num_channels = ko.observable(MIN_NUM_CHANNELS);
    component.min_num_shots = ko.observable(MIN_NUM_SHOTS);
    component.dac_tdms_type = ko.observable(TDMS_TYPE);
    component.dac_union_type = ko.observable(UNION_TYPE);
    component.dac_infer_units = ko.observable(INFER_UNITS);
    component.dac_infer_time = ko.observable(INFER_TIME);

    // TDMS file list
    var tdms_file_list = []

    // tdms zip suffixes
    var include_suffix = [];

    // upload state information

    // creates a model of type "DAC"
    component.create_model = function() {

        // use large dialog format
        // $(".modal-dialog").addClass("modal-lg");

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

    // switches between dac generic and pts tabs
    component.select_type = function() {
        var type = component.dac_format();

        if (type === "dac-gen") {
            component.tab(tabs['dac-gen']);
        } else if (type === "pts") {
            component.tab(tabs['pts']);
        } else if (type == "tdms") {
            component.tab(tabs['tdms']);
        }
    };

    // DAC format upload code
    // **********************

    // this function uploads the meta data table in DAC generic format
    component.upload_dac_format = function() {

        // keep track of input errors
        var no_errors = true;

        $("#dac-gen-file-error").hide();

        // check for file selected
        if (component.browser_dac_file.selection().length > 0) {

            // get file extension
            var file = component.browser_dac_file.selection()[0];
            var file_ext = file.name.split(".").pop().toLowerCase();

            if (file_ext != 'zip') {

                $("#dac-gen-file-error").text("Please select a file with the .zip extension.")
                $("#dac-gen-file-error").show();
                no_errors = false;
            }

        } else {

            $("#dac-gen-file-error").text("Please select DAC generic .zip file.")
            $("#dac-gen-file-error").show();
            no_errors = false;

        }

        // if everything is OK go to next tab
        if (no_errors == true) {

            // set model name back to blank
            component.model.name("");

            // if already uploaded data, do not re-upload
            component.tab(tabs['name-model']);

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

                $("#dac-load-model-error").text("Server error uploading UI preferences.");
                $("#dac-load-model-error").show();

            },
        });
    }

    // PTS format upload code
    // **********************

    // this function starts the upload process for the CSV/META format
    component.upload_pts_format = function() {

        // check PTS parse parameters
        var csv_parm = Math.round(Number(component.csv_min_size()));
        var dig_parm = Math.round(Number(component.min_num_dig()));
        var num_landmarks = parseInt(component.num_landmarks());
        var num_PCA_comps = parseInt(component.num_PCA_comps());

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

        if (component.dac_calc_type() == 'PCA') {

            if (!(num_PCA_comps >= 2)) {

                $("#dac-pts-pca-comps").addClass("is-invalid");
                no_errors = false;

            } else {

                // clear error
                $("#dac-pts-pca-comps").removeClass("is-invalid");
            }

        } else {

            // clear error
            $("#dac-pts-pca-comps").removeClass("is-invalid");
        }   

        if (component.dac_calc_type() == 'landmark') {

            if (!(num_landmarks >= 3)) {

                $("#dac-pts-landmarks").addClass("is-invalid");
                no_errors = false;

            } else {

                // clear error
                $("#dac-pts-landmarks").removeClass("is-invalid");
            }    
        } else {

            // clear error
            $("#dac-pts-landmarks").removeClass("is-invalid");
        } 

        // check for file errors
        $("#dac-pts-file-error").hide();

        // check for file selected
        if (component.browser_zip_file.selection().length > 0) {

            // get file extension
            var file = component.browser_zip_file.selection()[0];
            var file_ext = file.name.split(".").pop().toLowerCase();

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
            component.tab(tabs['name-model']);

        }
    };

    // this function uploads the switchtube TDMS format
    component.upload_tdms_format = function() {

        $("#dac-tdms-file-error").hide();

        // check for file type selected
        if (component.parser_tdms_files() == 'dac-tdms-file-parser') {

            // re-assert that we're doing tdms, non-zipped
            component.dac_tdms_zip('false');

            // check for file selected
            if (component.browser_tdms_files.selection().length > 0) {

                // check file extensions/get file name
                tdms_file_list = [];
                var tdms_files = true;
                var file_num = component.browser_tdms_files.selection().length;
                for (var i = 0; i < file_num; i++) {

                    // get file and extension
                    var file = component.browser_tdms_files.selection()[i];
                    var file_ext = file.name.split(".").pop().toLowerCase();

                    // save file name
                    tdms_file_list[i] = file.name;

                    if (file_ext != 'tdms' && file_ext != 'tdm') {
                        tdms_files = false;
                    }
                }

                if (tdms_files == false) {

                    $("#dac-tdms-file-error").text("Please select file(s) with the .tdms or .TDM extension.")
                    $("#dac-tdms-file-error").show();

                } else {

                    // get tdms load options
                    component.tab(tabs['tdms-options']);

                }

            } else {

                $("#dac-tdms-file-error").text("Please select .tdms or .TDM file(s).")
                $("#dac-tdms-file-error").show();
            }

        // user selected tdms .zip file parser
        } else {

            // indicate we are doing tdms zip
            component.dac_tdms_zip('true');

            // check for file selected
            if (component.browser_tdms_files.selection().length == 1) {

                // check .zip file extension
                var file = component.browser_tdms_files.selection()[0];
                var file_ext = file.name.split(".").pop().toLowerCase();

                if (file_ext == 'zip') {

                    // turn on wait button
                    $(".browser-continue").toggleClass("disabled", true);
                    $(".browser-continue").prop("disabled", true);

                    // read .zip file contents
                    if (file.arrayBuffer) {
                    
                        file.arrayBuffer().then(function(data) {
                            upload_tdms_extensions(data); });
                    
                    // .arrayBuffer() doesn't work with older browsers
                    } else {

                        const reader = new FileReader();
                        reader.onload = function onLoad(e) {
                          upload_tdms_extensions(reader.result);
                        };
                        reader.readAsArrayBuffer(file);

                    }

                } else {

                    $("#dac-tdms-file-error").text("Please select a .zip file containing .tdms of .TDM files.")
                    $("#dac-tdms-file-error").show();

                }

            } else {

                $("#dac-tdms-file-error").text("Please select one (and only one) TDMS .zip file.")
                $("#dac-tdms-file-error").show();

            }
        }
    };

    // upload tdms file extension for zip pane of wizard
    function upload_tdms_extensions (data) {

        data = new Uint8Array(data);
        var entries = ZipInfo.getEntries(data);

        // parse .zip file contents for .tdms file suffixes
        var file_suffix_set = new Set([]);
        for (var i = 0; i < entries.length; i++) {

            // is it a file?
            if (entries[i].directory == false) {

                // get file extension
                var file_ext = entries[i].filename.split(".").pop().toLowerCase();

                // is it a tdms file?
                if (file_ext == "tdms" || file_ext == "tdm") {

                    // get all possible suffixes
                    var all_file_suffixes = entries[i].filename.split("_");

                    // find last integer in filename (should be serial number)
                    for (var j = all_file_suffixes.length-1; j >= 0; j--) {
                        if (Number.isInteger(parseInt(all_file_suffixes[j]))) {
                            file_suffix_set.add(all_file_suffixes[j+1].split(".")[0]);
                            break;
                        }
                    }
                }
            }
        }

        // convert set to array
        var file_suffix = Array.from(file_suffix_set);

        // sort array
        file_suffix.sort();

        // check if there are any suffixes
        if (file_suffix.length == 0) {

            // no suffixes, error condition
            $("#dac-tdms-file-error").text("Please select a .zip file containing .tdms or .TDM files.")
            $("#dac-tdms-file-error").show();

            // turn off continue button
            $(".browser-continue").toggleClass("disabled", false);
            $(".browser-continue").prop("disabled", false);

        } else {

            // set up information for next tab
            var attributes = [];
            for(var i = 0; i != file_suffix.length; ++i)
            {
                name = file_suffix[i];
                attributes.push({
                    name: name,
                    type: "string",
                    constant: null,
                    disabled: null,
                    Include: true,
                    hidden: false,
                    selected: false,
                    lastSelected: false,
                    tooltip: ""
                });
            }
            mapping.fromJS(attributes, component.suffix_attributes);

            // turn off continue button
            $(".browser-continue").toggleClass("disabled", false);
            $(".browser-continue").prop("disabled", false);

            // go to next tab
            component.tab(tabs['suffix-selection']);
        }

    }

    // checks the suffix selection and continues
    component.check_suffix_selection = function () {

        // clear any errors
        $("#dac-inc-suffix-error").hide();

        // get suffix selection
        include_suffix = [];
        for(var i = 0; i != component.suffix_attributes().length; ++i) {
            if(component.suffix_attributes()[i].Include())
                include_suffix.push(component.suffix_attributes()[i].name());
        };

        // check for at least one suffix
        if (include_suffix.length < 1) {
            $("#dac-inc-suffix-error").show();

        } else {

            // go to options tab
            component.tab(tabs["tdms-options"]);
        }
    }

    // this function checks the TDMS upload format options
    component.check_tdms_options = function() {

        // check TDMS parse parameters
        var time_steps_parm = Math.round(Number(component.min_time_steps()));
        var channel_parm = Math.round(Number(component.min_num_channels()));
        var shots_parm = parseInt(component.min_num_shots());
        var num_landmarks = parseInt(component.num_landmarks());
        var num_PCA_comps = parseInt(component.num_PCA_comps());

        // check for input parameter errors
        var no_errors = true;

        if (time_steps_parm < 2) {

            $("#dac-min-time-steps").addClass("is-invalid");
            no_errors = false;

        } else {

            // clear error
            $("#dac-min-time-steps").removeClass("is-invalid");
        }

        if (channel_parm < 1) {

            $("#dac-min-channel").addClass("is-invalid");
            no_errors = false;

        } else {

            // clear error
            $("#dac-min-channel").removeClass("is-invalid");
        }

        if (isNaN(shots_parm)) {

            $("#dac-min-shots").addClass("is-invalid");
            no_errors = false;

        } else if (shots_parm < 0) {

            $("#dac-min-shots").addClass("is-invalid");
            no_errors = false;

        } else {

            // clear error
            $("#dac-min-shots").removeClass("is-invalid");

        }

        if (component.dac_calc_type() == 'PCA') {

            if (!(num_PCA_comps >= 2)) {

                $("#dac-tdms-pca-comps").addClass("is-invalid");
                no_errors = false;

            } else {

                // clear error
                $("#dac-tdms-pca-comps").removeClass("is-invalid");
            }

        } else {

            // clear error
            $("#dac-tdms-pca-comps").removeClass("is-invalid");
        }   

        if (component.dac_calc_type() == 'landmark') {

            if (!(num_landmarks >= 3)) {

                $("#dac-tdms-landmarks").addClass("is-invalid");
                no_errors = false;

            } else {

                // clear error
                $("#dac-tdms-landmarks").removeClass("is-invalid");
            }    
        } else {

            // clear error
            $("#dac-tdms-landmarks").removeClass("is-invalid");
        }

        // proceed to name model if no errors are present
        if (no_errors == true) {

                // set model name back to blank
                component.model.name("");

                // go to model naming
                component.tab(tabs['name-model']);
        };

    }

    // this function resets the TDMS load defaults
    component.reset_defaults = function () {

        // set TDMS defaults
        component.min_time_steps(MIN_TIME_STEPS);
        component.min_num_channels(MIN_NUM_CHANNELS);
        component.min_num_shots(MIN_NUM_SHOTS);
        component.num_landmarks(NUM_LANDMARKS);
        component.num_PCA_comps(NUM_COMPS);
        component.dac_calc_type(CALC_TYPE);
        component.dac_tdms_type(TDMS_TYPE);
        component.dac_union_type(UNION_TYPE);
        component.dac_infer_units(INFER_UNITS);
        component.dac_infer_time(INFER_TIME);

        // turn off any errors
        $("#dac-tdms-landmarks").removeClass("is-invalid");
        $("#dac-min-time-steps").removeClass("is-invalid");
        $("#dac-min-channel").removeClass("is-invalid");
        $("#dac-min-shots").removeClass("is-invalid");

    }

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

                            // check for multiple file upload (tdms only)
                            if (component.dac_format() == 'tdms' &&
                                component.dac_tdms_zip() == 'false') {

                                // upload multiple tdms files
                                upload_tdms_files();

                            } else {

                                // upload single zip file (could be different formats)
                                upload_zip_file();

                            }

                         }
                    });
                },
                error: function() {
                    $("#dac-finish-model-error").text("Server error finishing model.");
                    $("#dac-finish-model-error").show();
                }
            });
        }
    };

    // upload single zip file (could be pts, dac-gen, or tdms) to server
    function upload_zip_file() {

        // assume pts format parameters

        // file selected
        var file = component.browser_zip_file.selection()[0];

        // get csv/digitizer/landmark parameters
        var csv_parm = Math.round(Number(component.csv_min_size()));
        var dig_parm = Math.round(Number(component.min_num_dig()));
        var num_landmarks = parseInt(component.num_landmarks());
        var num_PCA_comps = parseInt(component.num_PCA_comps());
        
        // MDS no landmarks is the default
        var num_pca_landmarks = 0;
        var use_coordinates = false;

        // combine num_PCA_comps and num_landmarks
        if (component.dac_calc_type() == 'PCA') {

            num_pca_landmarks = num_PCA_comps;
            use_coordinates = true;

        } else if (component.dac_calc_type() == 'landmark') {

            num_pca_landmarks = num_landmarks;
        
        }
        
        // parameters for call to parser
        var aids = [[csv_parm, dig_parm, num_pca_landmarks, use_coordinates], ["DAC"]];
        var parser = "dac-zip-file-parser";
        var progress = component.browser_zip_file.progress;

        // tab to show file upload
        var tab = tabs['pts'];

        // if not pts format, then is it dac-gen?
        if (component.dac_format() == "dac-gen") {

            // file selected
            file = component.browser_dac_file.selection()[0];

            // dac gen zip parser parameters
            aids = [["Null"], ["DAC"]];
            parser = "dac-gen-zip-parser";
            progress = component.browser_dac_file.progress;

            // tab that shows file upload for DAC generic format
            tab = tabs['dac-gen'];

        }

        // if not dac-gen, is it tdms?
        if (component.dac_format() == 'tdms') {

            // file selected
            file = component.browser_tdms_files.selection()[0];
            
            // tdms parser parameters
            parser = "dac-tdms-zip-file-parser";
            progress = component.browser_tdms_files.progress;

            // pass user parameters to server
            aids = [[component.min_time_steps(), component.min_num_channels(),
                     component.min_num_shots(), num_pca_landmarks, use_coordinates,
                     component.dac_tdms_type(), component.dac_union_type(), 
                     Boolean(component.dac_infer_units()), 
                     Boolean(component.dac_infer_time()), include_suffix], ["DAC"]];

            // tab that shows file upload for tdms zip format
            tab = tabs['tdms'];

        }

        // call to server

        // turn off continue button
        $(".browser-continue").toggleClass("disabled", true);
        $(".browser-continue").prop("disabled", true);

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

                    // turn on continue button
                    $(".browser-continue").toggleClass("disabled", false);
                    $(".browser-continue").prop("disabled", false);

                    // go to model
                    component.go_to_model();

                },
            error: function(){

                $("#dac-finish-model-error").text("There was a problem uploading file: "
                                                  + file.name + ".");
                $("#dac-finish-model-error").show();

                $('.browser-continue').toggleClass("disabled", false);
                $(".browser-continue").prop("disabled", false);

                component.tab(tabs["name-model"]);

                }
            };
        fileUploader.uploadFile(fileObject);

        // show message
        $(".dac-do-not-close-browser").show();

        // show upload
        component.tab(tab);

    }

    // upload multiple tdms file list to server
    function upload_tdms_files() {

        // call to server

        // turn off continue button
        $(".browser-continue").prop("disabled", true);
        $(".browser-continue").toggleClass("disabled", true);

        // get parameters for file list upload
        var filelist = component.browser_tdms_files.selection()
        var parser = "dac-tdms-file-parser";
        var progress = component.browser_tdms_files.progress;

        // get PCA/landmark parameters
        var num_landmarks = parseInt(component.num_landmarks());
        var num_PCA_comps = parseInt(component.num_PCA_comps());
        
        // MDS no landmarks is the default
        var num_pca_landmarks = 0;
        var use_coordinates = false;

        // combine num_PCA_comps and num_landmarks
        if (component.dac_calc_type() == 'PCA') {

            num_pca_landmarks = num_PCA_comps;
            use_coordinates = true;

        } else if (component.dac_calc_type() == 'landmark') {

            num_pca_landmarks = num_landmarks;
        
        }

        // pass user parameters to server
        var aids = [[component.min_time_steps(), component.min_num_channels(),
                     component.min_num_shots(), num_pca_landmarks, use_coordinates,
                     component.dac_tdms_type(), component.dac_union_type(), 
                     Boolean(component.dac_infer_units()), 
                     Boolean(component.dac_infer_time()), tdms_file_list], ["DAC"]];

        // upload filelist
        var fileObject ={
            pid: component.project._id(),
            mid: component.model._id(),
            file: filelist,
            aids: aids,
            parser: parser,
            progress: progress,
            progress_increment: 100,
            success: function(){

                    // turn off continue button
                    $(".browser-continue").toggleClass("disabled", false);
                    $(".browser-continue").prop("disabled", false);

                    // go to model
                    component.go_to_model();

                },
            error: function(){

                $("#dac-finish-model-error").text("There was a problem uploading the selected file(s).");
                $("#dac-finish-model-error").show();

                $('.browser-continue').toggleClass("disabled", false);
                $(".browser-continue").prop("disabled", false);

                component.tab(tabs["name-model"]);

                }
            };
        fileUploader.uploadMultipleFiles(fileObject);

        // show message
        $(".dac-do-not-close-browser").show();

        // show upload
        component.tab(tabs["tdms"]);
    }

    // function for operating the back button in the wizard
    component.back = function() {

        // if we are at name model, go back to file selection/options
        if (component.tab() == tabs['name-model']) {

            if (component.dac_format() == 'dac-gen') {
                component.tab(tabs['dac-gen'])}

            if (component.dac_format() == 'pts') {
                component.tab(tabs['pts'])}

            if (component.dac_format() == 'tdms') {
                component.tab(tabs['tdms-options'])}

        // if we are in load tdms options, go back one or two tabs
        } else if (component.tab() == tabs['tdms-options']) {

            // for normal tdms files
            if (component.parser_tdms_files() == 'dac-tdms-file-parser') {
                component.tab(tabs['tdms']);

            // for .zip tdms files, re-select suffixes
            } else {
                component.tab(tabs['suffix-selection']);
            }

        // if we are selecting suffixes, go back to tdms file selection
        } else if (component.tab() == tabs['suffix-selection']) {
            component.tab(tabs['tdms']);

        // otherwise we are in file selection, go back to format selection
        } else {
            component.tab(tabs['sel-format']);
        };

    };

return component;
}

export default {
    viewModel: constructor,
    template: dacWizardUI,
}
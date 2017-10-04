// This script runs the input wizard for dial-a-cluster.
// It is heavily modified from the CCA wizard code.
//
// S. Martin
// 3/31/2017

define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "slycat-markings",
        "knockout", "knockout-mapping", "jquery", "slycat_file_uploader_factory"],
    function(server_root, client, dialog, markings, ko, mapping, $, fileUploader)
{

    function constructor(params)
    {

    var component = {};

    // tabs in wizard ui
    component.tab = ko.observable(0);

    // project/model information
    component.project = params.projects()[0];
    component.model = mapping.fromJS({_id: null, name: "New Dial-A-Cluster Model",
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
        progress_status: ko.observable(''),
    });

    // DAC generic parsers
    component.parser_dac_file = ko.observable(null);
    component.parser_var_files = ko.observable(null);
    component.parser_time_files = ko.observable(null);
    component.parser_dist_files = ko.observable(null);

    // DAC META/CSV parser (now in zip file)
    component.parser_zip_file = ko.observable(null);

    // dac-generic format is selected by default
    component.dac_format = ko.observable("dac-gen");

    // parameters for testing PTS ingestion
    component.csv_min_size = ko.observable(null);
    component.min_num_dig = ko.observable(null);

    // process pts continue or stop flag
    var process_continue = false;
    var already_processed = false;

    // process pts progress bar
    component.parse_progress = ko.observable(null);
    component.parse_progress_status = ko.observable("");

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
        pref_defaults_upload = false;

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

        // if already uploaded files then skip forward, do not re-upload
        if (dac_upload == true) {

            component.tab(3);

        } else {

            // isolate file extension, if file was selected
            var file = component.browser_dac_file.selection();
            var file_name = "no file selected";
            if (file.length == 1) {
                file_name = file[0].name;
            }
            var file_name_split = file_name.split(".");
            var file_ext = file_name_split[file_name_split.length - 1];

            // check for .dac extension
            if (file_ext == 'dac') {
                // proceed to upload variables.meta file, if present
                upload_var_meta_file();
            } else {
                // no .dac file selected
                dialog.ajax_error("Must select a .dac file.")("","","");
            }
        }
    };

    // uploads the variables.meta file to slycat
    var upload_var_meta_file = function () {

        // first we have to upload variables.meta in order to
        // find out how many variable files we should have
        // the number of variables is stored in the global num_vars

        // get all file names
        var files = component.browser_var_files.selection();
        var file_names = [];
        for (i = 0; i < files.length; i++) { 
            file_names[i] = files[i].name; 
        }

        // look for variables.meta
        var var_meta_ind = file_names.indexOf("variables.meta");

        if (var_meta_ind != -1) {

            // disable continue button since we are now uploading
            $('.dac-gen-browser-continue').toggleClass("disabled", true);

            // found variables.meta -- load file then call check variable file names
            var file = component.browser_var_files.selection()[var_meta_ind];
            var fileObject ={
                pid: component.project._id(),
                mid: component.model._id(),
                file: file,
                aids: ["dac-variables-meta"],
                parser: component.parser_var_files(),
                success: function(){
                    // check that variable names are present
                    check_var_files(file_names);
                },
                error: function(){
                    dialog.ajax_error(
                        "There was a problem parsing the variables.meta file.")
                        ("","","");
                    $('.dac-gen-browser-continue').toggleClass("disabled", false);
                }
            };
            fileUploader.uploadFile(fileObject);

        } else {

            dialog.ajax_error ("File variables.meta must be selected.")("","","");
            $('.dac-gen-browser-continue').toggleClass("disabled", false);

        }

    }

    // checks all the variable file names then calls to check time files
    var check_var_files = function (file_names) {

        // download variable meta data to check on number of files
        client.get_model_arrayset_metadata({
            mid: component.model._id(),
            aid: "dac-variables-meta",
            arrays: "0",
            statistics: "0/...",
            success: function(metadata) {

                // number of rows in variables.meta file (global variable)
                num_vars = metadata.arrays[0].shape[0];

                // get header names
                headers = metadata.arrays[0].attributes;
                num_headers = headers.length;

                // check header row in variables.meta
                headers_OK = true;
                if (num_headers == 4) {

                    if (headers[0].name != 'Name') { headers_OK = false };
                    if (headers[1].name != 'Time Units') { headers_OK = false };
                    if (headers[2].name != 'Units') { headers_OK = false };
                    if (headers[3].name != 'Plot Type') {headers_OK = false };

                } else {
                    headers_OK = false;
                }

                // check variable file names
                var all_var_files_found = true;
                for (i = 1; i <= num_vars; i++) {
                    var_file_inds[i-1] = file_names.indexOf("variable_" + i.toString() + ".var");
                    if (var_file_inds[i-1] == -1) {
                        all_var_files_found = false;
                    }
                }

                // next upload .time files
                if (headers_OK && (num_vars == (file_names.length-1)) && all_var_files_found) {
                    check_time_files();
                } else if ( headers_OK ) {
                    // missing .var files
                    dialog.ajax_error ("All *.var files must be selected.")("","","");
                    $('.dac-gen-browser-continue').toggleClass("disabled", false);
                } else {
                    // bad headers
                    dialog.ajax_error ("Header row in variables.meta is incorrect.")("","","");
                    $('.dac-gen-browser-continue').toggleClass("disabled", false);
                }
            }
        });
    }

    // checks time file names
    var check_time_files = function () {

        // redundant code for time files (very similar to code for var files)

        // get all file names
        var files = component.browser_time_files.selection();
        var file_names = [];
        for (i = 0; i < files.length; i++) { file_names[i] = files[i].name; }

        // check variable file names
        var all_time_files_found = true;
        for (i = 1; i <= num_vars; i++) {
            time_file_inds[i-1] = file_names.indexOf("variable_" + i.toString() + ".time");
            if (time_file_inds[i-1] == -1) {
                all_time_files_found = false;
            }
        }

        // finally check .dist files
        if (all_time_files_found) {
            check_dist_files();
        } else {
            // missing .time files
            dialog.ajax_error ("All *.time files must be selected.")("","","");
            $('.dac-gen-browser-continue').toggleClass("disabled", false);
        }
    }

    // check dist file names
    var check_dist_files = function () {

        // redundant code for dist files (very similar to code for time, var files)

        // get all file names
        var files = component.browser_dist_files.selection();
        var file_names = [];
        for (i = 0; i < files.length; i++) { file_names[i] = files[i].name; }

        // check variable file names
        var all_dist_files_found = true;
        for (i = 1; i <= num_vars; i++) {
            dist_file_inds[i-1] = file_names.indexOf("variable_" + i.toString() + ".dist");
            if (dist_file_inds[i-1] == -1) {
                all_dist_files_found = false;
            }
        }

        //  upload the files
        if (all_dist_files_found) {

            upload_dac_file();

        } else {
            // missing .dist files
            dialog.ajax_error ("All *.dist files must be selected.")("","","");
            $('.dac-gen-browser-continue').toggleClass("disabled", false);
        }
    }

    // start upload of all files to slycat
    var upload_dac_file = function () {

        // load DAC index .dac file then call to load variables.meta
        var file = component.browser_dac_file.selection()[0];
        var fileObject ={
            pid: component.project._id(),
            mid: component.model._id(),
            file: file,
            aids: ["dac-datapoints-meta"],
            parser: component.parser_dac_file(),
            progress: component.browser_dac_file.progress,
            success: function(){
                upload_var_files(0);
            },
            error: function(){
                dialog.ajax_error(
                    "There was a problem parsing the .dac file.")
                    ("","","");
                $('.dac-gen-browser-continue').toggleClass("disabled", false);
            }
        };
        fileUploader.uploadFile(fileObject);

    }

    // upload *.var files
    var upload_var_files = function (file_num) {

        // upload requested .var file then call again with next file
        var file = component.browser_var_files.selection()[var_file_inds[file_num]];
        console.log ("Uploading file: " + file.name);

        var fileObject ={
            pid: component.project._id(),
            mid: component.model._id(),
            file: file,
            aids: ["dac-var-data", file_num.toString(), "matrix"],
            parser: component.parser_var_files(),
            progress: component.browser_var_files.progress,
            progress_increment: 100/var_file_inds.length,
            success: function(){
                    if (file_num < (var_file_inds.length - 1)) {
                        upload_var_files(file_num + 1);
                    } else {
                        upload_time_files(0);
                    }
                },
            error: function(){
                dialog.ajax_error(
                    "There was a problem parsing the variables_" + (file_num+1).toString() + ".var file.")
                    ("","","");
                    $('.dac-gen-browser-continue').toggleClass("disabled", false);
                }
            };
        fileUploader.uploadFile(fileObject);

    }

    // uploads all the time series files to slycat
    var upload_time_files = function (file_num) {

        // code duplicated from uploading variable files

        // upload requested .time file then call again with next file
        var file = component.browser_time_files.selection()[time_file_inds[file_num]];
        console.log("Uploading file: " + file.name);

        var fileObject ={
            pid: component.project._id(),
            mid: component.model._id(),
            file: file,
            aids: ["dac-time-points", file_num.toString(), "matrix"],
            parser: component.parser_time_files(),
            progress: component.browser_time_files.progress,
            progress_increment: 100/time_file_inds.length,
            success: function(){
                    if (file_num < (time_file_inds.length - 1)) {
                        upload_time_files(file_num + 1);
                    } else {
                        upload_dist_files(0);
                    }
                },
            error: function(){
                dialog.ajax_error(
                    "There was a problem parsing the variables_" + (file_num+1).toString() + ".time file.")
                    ("","","");
                    $('.dac-gen-browser-continue').toggleClass("disabled", false);
                }
            };
        fileUploader.uploadFile(fileObject);

    }

    // uploads all the pairwsie distance matrix files to slycat
    var upload_dist_files =  function (file_num) {

        // code duplicated from uploading variable files

        // upload requested .time file then call again with next file
        var file = component.browser_dist_files.selection()[dist_file_inds[file_num]];
        console.log("Uploading file: " + file.name);

        var fileObject ={
            pid: component.project._id(),
            mid: component.model._id(),
            file: file,
            aids: ["dac-var-dist", file_num.toString(), "matrix"],
            parser: component.parser_dist_files(),
            progress: component.browser_dist_files.progress,
            progress_increment: 100/dist_file_inds.length,
            success: function(){
                    if (file_num < (dist_file_inds.length - 1)) {
                        upload_dist_files(file_num + 1);
                    } else {

                        // done uploading, start MDS initialization
                        init_MDS_coords();

                    }
                },
            error: function(){
                dialog.ajax_error(
                    "There was a problem parsing the variables_" + (file_num+1).toString() + ".dist file.")
                    ("","","");
                    $('.dac-gen-browser-continue').toggleClass("disabled", false);
                }
            };
        fileUploader.uploadFile(fileObject);

    }

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
		    COLOR_BY_LOW: 'yellow',
		    COLOR_BY_HIGH: 'limegreen',
		    OUTLINE_NO_SEL: 1,
		    OUTLINE_SEL: 2,

		    // pixel adjustments for d3 time series plots
			PLOTS_PULL_DOWN_HEIGHT: 38,
			PADDING_TOP: 24,
			PADDING_BOTTOM: 10,
		    PADDING_LEFT: 37,
			PADDING_RIGHT: 10,
			X_LABEL_PADDING: 4,
			Y_LABEL_PADDING: 13,
			LABEL_OPACITY: 0.2,
			X_TICK_FREQ: 80,
			Y_TICK_FREQ: 40

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

    // calls the server to initialize the MDS coords
    var init_MDS_coords = function () {

        // reset dac-polling-progress variable for MDS coord calculation
        client.put_model_parameter({
            mid: component.model._id(),
            aid: "dac-polling-progress",
            value: ["Progress", 0],
            success: function () {

                // call server to compute new coords
                client.get_model_command({
                    mid: component.model._id(),
                    type: "DAC",
                    command: "init_mds_coords",

                    // note: success and errors are handled by polling in model

                })

                // go name model
                dac_upload = true;
                $('.dac-gen-browser-continue').toggleClass("disabled", false);
                component.tab(3);

            },
            error: function () {
                dialog.ajax_error("Error starting MDS coordinate initialization.")("","","");
                $('.dac-gen-browser-continue').toggleClass("disabled", false);
            }
        });
    }

    // PTS format upload code
    // **********************

    // this function starts the upload process for the CSV/META format
    component.upload_pts_format = function() {

        // if already uploaded data, do not re-upload
        if (csv_meta_upload == true) {

            component.tab(3);

        } else {

            // check for file selected
            if (component.browser_zip_file.selection().length > 0) {

                // get file extension
                var file = component.browser_zip_file.selection()[0];
                var file_ext = file.name.split(".");
                file_ext = file_ext[file_ext.length - 1];

                if (file_ext == 'zip') {

                    // now go on to uploading and parsing
                    $('.pts-browser-continue').toggleClass("disabled", true);

                    console.log("Uploading file: " + file.name);

                    var fileObject ={
                        pid: component.project._id(),
                        mid: component.model._id(),
                        file: file,
                        aids: ["dac-pts-zip", 0],
                        parser: "dac-zip-file-parser",
                        progress: component.browser_zip_file.progress,
                        progress_increment: 100,
                        progress_final: 100,
                        progress_status: component.browser_zip_file.progress_status,
                        success: function(){

                                // do not re-upload files
                                csv_meta_upload = true;

                                $('.pts-browser-continue').toggleClass("disabled", false);
                                component.tab(3);

                            },
                        error: function(){
                            dialog.ajax_error(
                                "There was a problem parsing the file: " + file)
                                ("","","");
                                $('.pts-browser-continue').toggleClass("disabled", false);
                            }
                    };
                    dac_file_uploader.uploadFile(fileObject);

                } else {
                    dialog.ajax_error("Please select a file with the .zip extension.")("","","");
                }

            } else {
                dialog.ajax_error("Please select PTS CSV/META .zip file.")("","","");
            }
        }
    };

    // process button stops after processing finished
    component.process_pts_format_stop = function () {

        // set process continue to stop
        process_continue = false;

        // process pts data
        process_pts_format();

    };

    // continue buttons goes to next tab after processing
    component.process_pts_format_continue = function () {

        // set process to continue
        process_continue = true;

        // process pts data
        if (already_processed) {

            // skip ahead to next wizard screen
            $(".pts-process-continue").toggleClass("disabled", true);
            assign_pref_defaults();

        } else {

            process_pts_format();
        }

    };

    // after data is uploaded we can test the processing by examining
    // the log file, if desired
    var process_pts_format = function () {

        // check PTS parse parameters
        var csv_parm = Math.round(Number(component.csv_min_size));
        var dig_parm = Math.round(Number(component.min_num_dig));
        if (csv_parm < 2 || dig_parm < 3) {

            dialog.ajax_error("The CSV parameter must be >= 2 and the digitizer parameter must be >= 3.")("","","");

        } else {

            // disable both process and continue buttons
            $(".pts-process-continue").toggleClass("disabled", true);

            // push initial progress indicator to database
            client.put_model_parameter({
                mid: component.model._id(),
                aid: "dac-polling-progress",
                value: ["Parsing ...", 10],
                success: function () {

                    // start polling
                    poll_pts_parse();

                    // call server to transform data
                    client.get_model_command({
                        mid: component.model._id(),
                        type: "DAC",
                        command: "parse_pts_data",
                        parameters: [csv_parm, dig_parm]

                        // note: success and errors are handled by polling
                    })

                },
                error: function () {
                    dialog.ajax_error("Error starting PTS parsing.")("","","");
                    $('.pts-process-continue').toggleClass("disabled", false);
                }
            });
        };
    };

    // this function polls the "dac-poll-progress" variable while
    // the server is parsing the pts data
    function poll_pts_parse () {

        console.log ("Polling PTS parser.");

        // constants for timeouts
        var ONE_MINUTE = 60000;
        var ONE_SECOND = 1000;

        // waits 1 minute past last successful progress update
        var endTime = Number(new Date()) + ONE_MINUTE;

        // polling interval is 1 second
        var interval = ONE_SECOND;

        // poll database for artifact "dac-poll-progress"
        (function pts_poll() {

            client.get_model_parameter(
	        {
	            mid: component.model._id(),
      	        aid: "dac-polling-progress",
		        success: function (result)
		        {

                    // set progress bar to show we are parsing files

                    // update text box if parsing
                    if (result[0] == "Parsing ..." || result[0] == "Computing ...") {

                        // get parse error log
                        client.get_model_parameter(
		                {
			                mid: component.model._id(),
      		                aid: "dac-parse-log",
			                success: function (result)
				            {
					            // show log in text box
                                $('#dac-wizard-process-results').val(result[1]);
                            }
                        })
                    }

		            if (result[0] == "Done") {

		                // done uploading to database
                        component.parse_progress(100);
                        component.parse_progress_status('');

                        // when done uploading, we pass number vars in second
                        // position of the polling progress indicator
                        num_vars = result[1];

                        // get parse error log
                        client.get_model_parameter(
		                {
			                mid: component.model._id(),
      		                aid: "dac-parse-log",
			                success: function (result)
				            {
					            // show log in text box
                                $('#dac-wizard-process-results').val(result[1]);

                                // if nothing was processed then alert user
                                if (result[0] == "No Data") {

                                    dialog.ajax_error("Parser could not find any usable PTS data.  Please try different parameters, or restart wizard and select more files.")
                                        ("","","");
                                    $(".pts-process-continue").toggleClass("disabled", false);

                                } else {

                                    // keep track that data was successfully processed
                                    already_processed = true;

                                    // continue onto next stage, if desired
                                    if (process_continue) {
                                        assign_pref_defaults();
                                    } else {
                                        $(".pts-process-continue").toggleClass("disabled", false);
                                    }

                                };
				            },
			                error: function () {
			                    dialog.ajax_error("Server error retrieving parse results.")("","","");
			                    $('.pts-process-continue').toggleClass('disabled', false);
			                }
		                });

		            } else {

                        // update progress bar
                        component.parse_progress(result[1]);
                        component.parse_progress_status(result[0]);

		                // reset timeout and continue
                        endTime = Number(new Date()) + ONE_MINUTE;
                        window.setTimeout(pts_poll, interval);
		            }
		        },
		        error: function () {

                    if (Number(new Date()) < endTime) {

		                // continue, do not reset timer
                        window.setTimeout(pts_poll, interval);

                    } else {

                        // give up
                        dialog.ajax_error("Server error parsing PTS data.")("","","");
                        $(".pts-process-continue").toggleClass("disabled", false);

                    }
		        }
	        });
	    })();
    };

    // wizard finish model code
    // ************************

    // very last function called to launch model
    component.go_to_model = function() {
      location = server_root + 'models/' + component.model._id();
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
                    component.go_to_model();
                    }
                });
            },
            error: dialog.ajax_error("Error updating model."),
        });
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

    return {
    viewModel: constructor,
    template: { require: "text!" + server_root + "resources/wizards/DAC/ui.html"}
    };
});

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

    // PTS META/CSV file selections
    component.browser_csv_files = mapping.fromJS({
        path:null,
        selection: [],
        progress: ko.observable(null),
    });
    component.browser_meta_files = mapping.fromJS({
        path:null,
        selection: [],
        progress: ko.observable(null),
    });

    // DAC generic parsers
    component.parser_dac_file = ko.observable(null);
    component.parser_var_files = ko.observable(null);
    component.parser_time_files = ko.observable(null);
    component.parser_dist_files = ko.observable(null);

    // DAC META/CSV parsers
    component.parser_meta_files = ko.observable(null);
    component.parser_csv_files = ko.observable(null);

    // other attributes to pass to wizard (for example headers in metadata)
    component.meta_attributes = mapping.fromJS([]);
    component.var_attributes = mapping.fromJS([]);

    // dac-generic format is selected by default
    component.dac_format = ko.observable("dac-gen");

    // parameters for testing PTS ingestion
    component.csv_min_size = ko.observable(null);
    component.min_num_dig = ko.observable(null);

    // process pts continue or stop flag
    var process_continue = false;

    // number of variables (time series) in data
    var num_vars = 0;

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
        $(".modal-dialog").addClass("modal-lg");

        // make sure upload state says nothing uploaded
        dac_upload = false;
        csv_meta_upload = false;

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

    // this function is called to select variables to
    // include (after selecting metadata)
    component.include_variables = function() {

        // load first column and use to let user select metadata
        client.get_model_arrayset_data({
            mid: component.model._id(),
            aid: "dac-variables-meta",
            hyperchunks: "0/0/...",
            success: function(data) {

                // time series names
                var_names = data[0];

                // attributes for gui
                var attributes = [];
                var name = null;
                var type = null;
                var constant = null;
                var string = null;
                var tooltip = null;

                // put time series names into gui attributes
                for (var i = 0; i != var_names.length; i++) {

                    name = var_names[i];
                    type = "string";
                    tooltip = "";
                    attributes.push({
                        name: name,
                        type: type,
                        constant: constant,
                        disabled: null,
                        Include: true,
                        hidden: false,
                        selected: false,
                        lastSelected: false,
                        tooltip: tooltip
                    });

                }

                // give access to gui
                mapping.fromJS(attributes, component.var_attributes);
                component.tab(5);
            }
        });

    }

    // this function gets called after all data is uploaded,
    // including metadata table
    var include_metadata = function() {

        // load header row and use to let user select metadata
        client.get_model_arrayset_metadata({
            mid: component.model._id(),
            aid: "dac-datapoints-meta",
            arrays: "0",
            statistics: "0/...",
            success: function(metadata) {
                var attributes = [];
                var name = null;
                var type = null;
                var constant = null;
                var string = null;
                var tooltip = null;
                for(var i = 0; i != metadata.arrays[0].attributes.length; ++i)
                {
                    name = metadata.arrays[0].attributes[i].name;
                    type = metadata.arrays[0].attributes[i].type;
                    tooltip = "";
                    attributes.push({
                        name: name,
                        type: type,
                        constant: constant,
                        disabled: null,
                        Include: true,
                        hidden: false,
                        selected: false,
                        lastSelected: false,
                        tooltip: tooltip
                    });
                }
                mapping.fromJS(attributes, component.meta_attributes);

                // stop any spinning buttons that may have been triggered
                $('.dac-gen-browser-continue').toggleClass('disabled', false);
                $('.pts-browser-continue').toggleClass('disabled', false);

                component.tab(4);
            }
        });
    };

    // DAC format upload code
    // **********************

    // this function uploads the meta data table in DAC generic format
    component.upload_dac_format = function() {

        // if already uploaded files then skip forward, do not re-upload
        if (dac_upload == true) {

            component.tab(4);

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

        // now start uploads, beginning with metadata
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
                        dac_upload = true;
                        assign_pref_defaults();
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

        // default alpha parameters
        var dac_alpha_parms = [];
        var dac_alpha_order = [];
        //---------------------------
        for (i = 0; i < num_vars; i++) {
            dac_alpha_parms.push(1);
            dac_alpha_order.push(i);
        }

        // from variable-defaults.pref file
        // --------------------------------
        var dac_var_plot_order = [0, 1, 2];

        // from dac-ui.pref file:
        // ----------------------
        var dac_ui_parms = {

            // the step size for the alpha slider (varies from 0 to 1)
    	    ALPHA_STEP: 0.001,

    	    // default width for the alpha sliders (in pixels)
    	    ALPHA_SLIDER_WIDTH: 270,

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
			PADDING_TOP: 10,
			PADDING_BOTTOM: 24,
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
                $('.pts-browser-continue').toggleClass('disabled', false);
            },
            success: function () {

             // upload alpha parameters to slycat
             client.put_model_parameter({
                mid: component.model._id(),
                aid: "dac-alpha-parms",
                value: dac_alpha_parms,
                error: function () {
                    dialog.ajax_error("Error uploading alpha parameter preferences.")("","","");
                    $('.dac-gen-browser-continue').toggleClass("disabled", false);
                    $('.pts-browser-continue').toggleClass('disabled', false);
                },
                success: function () {

                // upload alpha order to slycat
                client.put_model_parameter({
                    mid: component.model._id(),
                    aid: "dac-alpha-order",
                    value: dac_alpha_order,
                    error: function () {
                        dialog.ajax_error("Error uploading alpha order preferences.")("","","");
                        $('.dac-gen-browser-continue').toggleClass("disabled", false);
                        $('.pts-browser-continue').toggleClass('disabled', false);
                    },
                    success: function () {

                    // upload plot order to slycat
                    client.put_model_parameter({
                        mid: component.model._id(),
                        aid: "dac-var-plot-order",
                        value: dac_var_plot_order,
                        error: function () {
                            dialog.ajax_error("Error uploading variable plot order preferences.")("","","");
                            $('.dac-gen-browser-continue').toggleClass("disabled", false);
                            $('.pts-browser-continue').toggleClass('disabled', false);
                        },
                        // now initialize MDS coords by calling server
                        success: function () {
                            init_MDS_coords();
                        }
                    }); }
                }); }
             }); }
        });
    }

    // calls the server to initialize the MDS coords
    var init_MDS_coords = function () {

        // call server to compute new coords
		client.get_model_command(
		{
			mid: component.model._id(),
      		type: "DAC",
			command: "init_mds_coords",
			success: function (result)
				{
					include_metadata();
				},
			error: function () {
			    dialog.ajax_error("Server error initializing MDS coordinates.")("","","");
			    $('.dac-gen-browser-continue').toggleClass("disabled", false);
			    $('.pts-browser-continue').toggleClass('disabled', false);
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

            // list out csv file names, check for .csv extension
            var unordered_csv_files = component.browser_csv_files.selection();
            csv_file_names = [];
            var csv_ext = true;
            for (i = 0; i < unordered_csv_files.length; i++) {

                // parse file name for .csv extension
                var file_name = unordered_csv_files[i].name;
                var file_name_split = file_name.split(".");
                if (file_name_split.length > 1) {
                    var file_ext = file_name_split[file_name_split.length - 1];

                    // if no .csv extension then we quit
                    if (file_ext != "csv") {
                        csv_ext = false;
                        break;
                    } else {
                        // remove .csv extension and keep file name
                        csv_file_names.push(file_name.substring(0, file_name.length - 4));
                    }
                } else {
                    csv_ext = false;
                    break;
                }
            }

            // list out meta file names, check for .ini extension (redundant code)
            meta_files = component.browser_meta_files.selection();
            meta_file_names = [];
            var meta_ext = true;
            for (i = 0; i < meta_files.length; i++) {

                // parse file name for .csv extension
                var file_name = meta_files[i].name;
                var file_name_split = file_name.split(".");
                if (file_name_split.length > 1) {
                    var file_ext = file_name_split[file_name_split.length - 1];

                    // if no .ini extension then we quit
                    if (file_ext != "ini") {
                        meta_ext = false;
                        break;
                    } else {
                        // remove .ini extension and keep file name
                        meta_file_names.push(file_name.substring(0, file_name.length - 4));
                    }
                } else {
                    meta_ext = false;
                    break;
                }
            }

            // check for matching file names between csv and meta files
            var files_match = true;
            if (csv_file_names.length == meta_file_names.length) {
                for (i = 0; i < csv_file_names.length; i++) {
                    if (meta_file_names.indexOf (csv_file_names[i]) == -1) {
                        files_match = false;
                        break;
                    }
                }
            } else {
                files_match = false;
            }

            // continue only if we have all csv and ini files and the files match
            if (unordered_csv_files.length == 0) {

                // no csv files
                dialog.ajax_error("Please select CSV files.")("","","");

            } else if (meta_files.length == 0) {

                // no meta files
                dialog.ajax_error("Please select META files.")("","","");

            } else if (!csv_ext) {

                // csv files have wrong extension
                dialog.ajax_error("CSV file selection contains file without .csv extension.")("","","");

            } else if (!meta_ext) {

                // meta files have wrong extension
                dialog.ajax_error("META file selection contains file without .ini extension.")("","","");

            } else if (unordered_csv_files.length != meta_files.length) {

                // different number of files
                dialog.ajax_error("Make sure CSV and META file selections have the same number of files.")("","","");

            } else if (!files_match) {

                // file names do not match
                dialog.ajax_error("Make sure the CSV and META file names have the same names (except for extensions).")
                    ("","","");

            } else {

                // everything is OK, reorder csv file order to match meta file order
                csv_files = [];
                for (i = 0; i < meta_file_names.length; i++) {
                    csv_files.push (unordered_csv_files[csv_file_names.indexOf(meta_file_names[i])])
                }

                // now go on to uploading and parsing
                $('.pts-browser-continue').toggleClass("disabled", true);
                upload_csv_files(0);
            }

            // for debugging:
            // console.log('csv files:');
            // console.log(csv_files);
            // console.log(csv_file_names);
            // console.log(csv_ext);

            // console.log('meta files:');
            // console.log(meta_files);
            // console.log(meta_file_names);
            // console.log(meta_ext);

            // console.log('files match:');
            // console.log(files_match);

        }
    };

    // parse files and upload to slycat database
    var upload_csv_files = function (file_num) {

        // upload requested .time file then call again with next file
        var file = csv_files[file_num];
        console.log("Uploading file: " + file.name);

        var fileObject ={
            pid: component.project._id(),
            mid: component.model._id(),
            file: file,
            aids: ["dac-pts-csv", file_num.toString()],
            parser: component.parser_csv_files(),
            progress: component.browser_csv_files.progress,
            progress_increment: 100/csv_files.length,
            success: function(){
                    if (file_num < (csv_files.length - 1)) {
                        upload_csv_files(file_num + 1);
                    } else {
                        upload_meta_files(0);
                    }
                },
            error: function(){
                dialog.ajax_error(
                    "There was a problem parsing the file: " + csv_file_names[file_num])
                    ("","","");
                    $('.pts-browser-continue').toggleClass("disabled", false);
                }
            };
        fileUploader.uploadFile(fileObject);
    };

    var upload_meta_files = function (file_num) {

        // upload requested .time file then call again with next file
        var file = meta_files[file_num];
        console.log("Uploading file: " + file.name);

        var fileObject ={
            pid: component.project._id(),
            mid: component.model._id(),
            file: file,
            aids: ["dac-pts-meta", file_num.toString()],
            parser: component.parser_meta_files(),
            progress: component.browser_meta_files.progress,
            progress_increment: 100/meta_files.length,
            success: function(){
                    if (file_num < (meta_files.length - 1)) {
                        upload_meta_files(file_num + 1);
                    } else {
                        $('.pts-browser-continue').toggleClass("disabled", false);
                        csv_meta_upload = true;
                        component.tab(3);
                    }
                },
            error: function(){
                dialog.ajax_error(
                    "There was a problem parsing the file: " + meta_file_names[file_num])
                    ("","","");
                    $('.pts-browser-continue').toggleClass("disabled", false);
                }
            };
        fileUploader.uploadFile(fileObject);
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
        process_pts_format();

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

            // disabled both process and continue buttons
            $(".pts-browser-continue").toggleClass("disabled", true);

            // call server to transform data
            client.get_model_command(
            {
                mid: component.model._id(),
                type: "DAC",
                command: "parse_pts_data",
                parameters: [meta_file_names, csv_parm, dig_parm],
                success: function (result)
                    {

                        // show log in text box
                        $('#dac-wizard-process-results').val(result[2]);

                        // if nothing was processed then alert user
                        if (result[0] == "No Data") {

                            dialog.ajax_error("Parser could not find any usable PTS data.  Please try different parameters, or restart wizard and select more files.")
                                ("","","");
                            $(".pts-browser-continue").toggleClass("disabled", false);

                        } else {

                            $(".pts-browser-continue").toggleClass("disabled", false);

                            // continue onto next stage, if desired
                            num_vars = Number(result[1]);
                            if (process_continue) { assign_pref_defaults(); };

                        };
                    },
                error: dialog.ajax_error("Server error parsing PTS data.")
            });
        };
    };

    // wizard finish model code
    // ************************

    // very last function called to launch model
    component.go_to_model = function() {
      location = server_root + 'models/' + component.model._id();
    };

    // this script gets called at the end of the 4th tab (after selecting columns to include)
    component.finish = function() {

        // record metadata columns that user wants to include
        var meta_include_columns = [];
        for(var i = 0; i != component.meta_attributes().length; ++i) {
        if(component.meta_attributes()[i].Include())
            meta_include_columns.push(i);
        };

        // record variables columns that user wants to include
        var var_include_columns = [];
        for(var i = 0; i != component.var_attributes().length; ++i) {
        if(component.var_attributes()[i].Include())
            var_include_columns.push(i);
        };

        // record desired metadata columns as an artifact in the new model
        client.put_model_parameter({
            mid: component.model._id(),
            value: meta_include_columns,
            aid: "dac-metadata-include-columns",
            input: true,
            success: function() {

                // now record desired variable columns as an artifact
                client.put_model_parameter({
                    mid: component.model._id(),
                    value: var_include_columns,
                    aid: "dac-var-include-columns",
                    input: true,
                    success: function() {
                        component.tab(6);
                    }
                });
            }

        });

    };

    // called after the last tab is finished to name the model
    component.name_model = function() {

        // remove CSV and META artifacts (doesn't actually matter if it works)
        client.delete_model_parameter({
            mid: component.model._id(),
            aid: "dac-pts-csv",
        });
        client.delete_model_parameter({
            mid: component.model._id(),
            aid: "dac-pts-meta",
        });

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
        if(component.dac_format() == 'dac-gen' && component.tab() == 4)
        {
            target--;
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

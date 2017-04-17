// This script runs the input wizard for dial-a-cluster.
// It is heavily modified from the CCA wizard code.
//
// S. Martin
// 3/31/2017

define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "slycat-markings",
        "knockout", "knockout-mapping", "slycat_file_uploader_factory"],
    function(server_root, client, dialog, markings, ko, mapping, fileUploader)
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
    component.browser_dac_file = mapping.fromJS({path:null, selection: []});
    component.browser_var_files = mapping.fromJS({path:null, selection: []});
    component.browser_time_files = mapping.fromJS({path:null, selection: []});
    component.browser_dist_files = mapping.fromJS({path:null, selection: []});
    component.browser_pref_files = mapping.fromJS({path:null, selection: []});

    // PTS META/CSV file selections
    component.browser_csv_files = mapping.fromJS({path:null, selection: []});
    component.browser_meta_files = mapping.fromJS({path:null, selection: []});

    // DAC generic parsers
    component.parser_dac_file = ko.observable(null);
    component.parser_var_files = ko.observable(null);
    component.parser_time_files = ko.observable(null);
    component.parser_dist_files = ko.observable(null);
    component.parser_pref_files = ko.observable(null);

    // DAC META/CSV parsers
    component.parser_meta_files = ko.observable(null);
    component.parser_csv_files = ko.observable(null);

    // other attributes to pass to wizard (for example headers in metadata)
    component.attributes = mapping.fromJS([]);

    // dac-generic format is selected by default
    component.dac_format = ko.observable("dac-gen");

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

    // this function gets called after metadata is uploaded via
    // local (upload_table) or remote (load_table) upload
    var upload_success = function() {

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
            mapping.fromJS(attributes, component.attributes);
            component.tab(3);
            $('.browser-continue').toggleClass("disabled", false);
        }
        });
    };

    // this function uploads the meta data table in DAC generic format
    component.upload_dac_format = function() {
        $('.dac-gen-browser-continue').toggleClass("disabled", true);

        // load DAC index .dac file then call to load variables.meta
        var file = component.browser_dac_file.selection()[0];
        var fileObject ={
            pid: component.project._id(),
            mid: component.model._id(),
            file: file,
            aids: ["dac-datapoints-meta"],
            parser: component.parser_dac_file(),
            success: function(){
                upload_var_meta_file();
            },
            error: function(){
                dialog.ajax_error(
                    "There was a problem parsing the .dac file.")
                    ("","","");
                $('.dac-gen-browser-continue').toggleClass("disabled", false);
            }
        };
        fileUploader.uploadFile(fileObject);
    };

    // uploads the variables.meta file to slycat
    var upload_var_meta_file = function () {

        // first we have to upload variables.meta in order to
        // find out how many variable files we should have

        // get all file names
        var files = component.browser_var_files.selection();
        var file_names = [];
        for (i = 0; i < files.length; i++) { file_names[i] = files[i].name; }

        // look for variables.meta
        var var_meta_ind = file_names.indexOf("variables.meta");
        if (var_meta_ind != -1) {

            // found variables.meta -- load file then call to load all variables
            var file = component.browser_var_files.selection()[var_meta_ind];
            var fileObject ={
                pid: component.project._id(),
                mid: component.model._id(),
                file: file,
                aids: ["dac-variables-meta"],
                parser: component.parser_var_files(),
                success: function(){
                    upload_var_files(file_names);
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

    // uploads all the variable files to slycat
    var upload_var_files = function (file_names) {

        // download variable meta data to check on number of files


        // check variable file names


        // load variables


        console.log("uploading variable files");
        console.log(file_names);

        upload_time_files();

    }

    // uploads all the time series files to slycat
    var upload_time_files = function () {

        upload_dist_files();

    }

    // uploads all the pairwsie distance matrix files to slycat
    var upload_dist_files =  function () {

        upload_pref_files();

    }

    // uploads or creates the ui preferences for DAC to slycat
    var upload_pref_files = function () {

        // look for preference files in file selections


        // assign defaults for all preferences, override afterwards

        // from alpha-parms.pref file
        //---------------------------

        // component.num_vars

        // from variable-defaults.pref file
        // --------------------------------

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
		    SCATTER_BUTTONS_HEIGHT: 35,

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
			PLOTS_PULL_DOWN_HEIGHT: 35,
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

        // did the user upload any ui preferences?


        // finally, upload preferences to slycat
        client.put_model_parameter ({
            mid: component.model._id(),
            aid: "dac-ui-parms",
            value: dac_ui_parms,
            error: dialog.ajax_error("Error uploading UI preferences.")
        });

        console.log("entered pref upload");
        console.log(component.browser_pref_files.selection().length);
        console.log(component.browser_pref_files.selection()[0]);

        upload_success();

    }

    // this function uploads the meta data table from the CSV/META format
    component.upload_pts_format = function() {
        $('.pts-browser-continue').toggleClass("disabled", true);
        //TODO: add logic to the file uploader to look for multiple files list to add
        console.log(component.browser_csv_files.selection());
        console.log(component.browser_meta_files.selection());

        var file = component.browser_csv_files.selection()[0];
        var fileObject ={
        pid: component.project._id(),
        mid: component.model._id(),
        file: file,
        aids: ["dac-datapoints-meta"],
        parser: component.parser(),
        success: function(){
            upload_success();
        },
        error: function(){
            dialog.ajax_error(
                "Did you choose the correct file and filetype?  There was a problem parsing the file.")
                ("","","");
            $('.pts-browser-continue').toggleClass("disabled", false);
        }
        };
        fileUploader.uploadFile(fileObject);
    };

    // very last function called to launch model
    component.go_to_model = function() {
      location = server_root + 'models/' + component.model._id();
    };

    // this script gets called at the end of the 4th tab (after selecting columns to include)
    component.finish = function() {

        // record columns that user wants to include
        var include_columns = [];
        for(var i = 0; i != component.attributes().length; ++i) {
        if(component.attributes()[i].Include())
            include_columns.push(i);
        }

        // for debugging: columns chosen to display
        // console.log (include_columns);

        // record desired columns as an artifact in the new model
        client.put_model_parameter({
            mid: component.model._id(),
            value: include_columns,
            aid: "dac-metadata-include-columns",
            input: true,
            success: function() {
                component.tab(4);
            }
        });

    };

    // called after the last tab is finished to name the model
    component.name_model = function() {

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

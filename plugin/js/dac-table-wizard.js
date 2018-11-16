// This script runs the preferences wizard for dial-a-cluster.
// It is heavily modified from the CCA wizard code.
//
// S. Martin
// 6/7/2018

import api_root from "js/slycat-api-root";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import markings from "js/slycat-markings";
import ko from "knockout";
import d3 from "js/d3.min";
import mapping from "knockout-mapping";
import fileUploader from "js/slycat-file-uploader-factory";
import dacWizardUI from "../html/dac-table-wizard.html";

function constructor(params)
{

    var component = {};

    // get project and model IDs
    component.project = params.projects()[0];
    component.model = params.models()[0];

    // tabs in wizard ui
    component.tab = ko.observable(0);

    // default is to add a free text column
    component.dac_add_remove = ko.observable("add-freetext");

    // name of column to add
    component.dac_freetext_name = ko.observable("");
    component.dac_categorical_name = ko.observable("");

    // name of category to add
    component.dac_new_category_name = ko.observable("");

    // file browser for list of categories
    component.browser_category_list = mapping.fromJS({
        path:null,
        selection: [],
        progress: ko.observable(null),
    });

    // parser for category list file
    component.parser_cat_list_file = ko.observable(null);

    // want a normal dialog size for this wizard
    $(".modal-dialog").removeClass("modal-lg");

    // keep track of editable columns (for possible removal)
    component.dac_remove_cols = mapping.fromJS([]);

    // keep track of user generated categories
    var cat_attributes = [];
    component.dac_categories = mapping.fromJS([]);

    // constant max number of categories (can be changed in preferences)
    var MAX_CATS = 50;

    // if the user selects the cancel button we quit, doing nothing
    component.cancel = function() { };

    // init removable columns information & update max categories
    var init_wizard = function () {

        // check model for existence of "dac-editable-columns" artifact
        client.get_model(
        {
            mid: component.model._id(),
            success: function (result)
            {

                // check for max categories setting in options
                if ("artifact:dac-options" in result) {

                    // get freetext length
                    client.get_model_parameter({
                        mid: component.model._id(),
                        aid: "dac-options",
                        success: function (options)
                        {
                            // check for max categories options
                            if (options.length > 6)
                            {
                                MAX_CATS = Number(options[6]);
                            }
                        }
                    });

                }

                // if "dac-editable-columns" exists then initialize editable columns
                if ("artifact:dac-editable-columns" in result)
                {

                    // get column names
                    client.get_model_parameter({
                        mid: component.model._id(),
                        aid: "dac-editable-columns",
                        success: function (result)
                        {

                            let ec_attributes = result["attributes"];

                            // next list out editable columns for the remove column part of the GUI
                            var attributes = [];
                            for(var i = 0; i !== ec_attributes.length; ++i)
                            {
                                attributes.push({
                                    name: ec_attributes[i].name,
                                    type: ec_attributes[i].type,
                                    constant: true,
                                    disabled: false,
                                    // important: the below "Remove" must match the name in
                                    // the slycat-table-ingestion HTML
                                    Remove: false,
                                    hidden: false,
                                    selected: false,
                                    lastSelected: false,
                                    tooltip: null
                                });
                            }

                            // give access to gui
                            mapping.fromJS(attributes, component.dac_remove_cols);

                            // expose remove radio button
                            $("#dac-table-wizard-remove-cols-radio").prop("disabled",false);
                            $("#dac-table-wizard-remove-cols-label").css("color", "black");
                            $("#dac-table-wizard-remove-help").hide();

                        }
                    });

                }
            }
        });

        // populate categories table (initially just "No Value")
        cat_attributes.push({
                            name: "No Value",
                            type: "string",
                            constant: true,
                            disabled: true,
                            Include: true,
                            hidden: false,
                            selected: false,
                            lastSelected: false,
                            tooltip: null
                        });

        // make categories accessible by UI
        mapping.fromJS(cat_attributes, component.dac_categories);

    }

    init_wizard();

    // switches between column add/remove
    component.select_type = function() {

        //
        var type = component.dac_add_remove();

        if (type === "add-freetext") {
            component.tab(1);
        } else if (type === "add-categorical") {
            component.tab(2);
        } else if (type === "remove-column") {
            component.tab(3);
        }
    };

    // makes a freetext column and returns to model
    component.freetext_finish = function () {

        // if no name given, error to user
        if (component.dac_freetext_name() == "") {

            dialog.ajax_error('Please enter a name for the new column in the "New Free Text Column" box.')
                ("","","")

        } else {

            // show spinner and wait
            $(".browser-continue").toggleClass("disabled", true);

            // call server add new free text column
            client.get_model_command({
                mid: component.model._id(),
                type: "DAC",
                command: "manage_editable_cols",
                parameters: ['add', 'freetext', component.dac_freetext_name(), -1, -1, -1, -1],
                success: function(result)
                {
                    // if user was a reader, then error, otherwise go to model
                    if (result["error"] === "reader") {
                        dialog.ajax_error("Access denied.  You must be a project writer or administrator to change the table data.")
                            ("","","");
                        $(".browser-continue").toggleClass("disabled", false);
                    } else {
                        component.go_to_model();
                    }
                },
                error: function ()
                {
                    dialog.ajax_error('Server error creating new free text column.')
                            ("","","");
                    $(".browser-continue").toggleClass("disabled", false);
                }
            });
        }

    }

    // add a category
    component.add_category = function () {

        // if no name given, error to user
        if (component.dac_new_category_name() == "") {

            dialog.ajax_error('Please enter a name for the new category in the "New Category" box.')
                ("","","")

        } else if (component.dac_categories().length >= MAX_CATS) {

            dialog.ajax_error('Number of categories exceeded.  Maximum number of categories is ' +
                MAX_CATS + '.  (This can be changed using Edit -> Model Preferences.)')
                ("","","")

        } else {

            // check that category name is distinct
            var cat_name_new = true;
            for (var i = 0; i != cat_attributes.length; ++i) {

                // check if user select/unselected a category
                cat_attributes[i]["Include"] = component.dac_categories()[i].Include();

                // check if category is already present
                if (cat_attributes[i].name === component.dac_new_category_name().trim()) {
                    cat_name_new = false;
                }
            }

            // if name is distinct, then add to list
            if (cat_name_new) {

                // add category to attribute list for gui
                cat_attributes.push({
                            name: component.dac_new_category_name().trim(),
                            type: "string",
                            constant: true,
                            disabled: false,
                            Include: true,
                            hidden: false,
                            selected: false,
                            lastSelected: false,
                            tooltip: null
                        });

                // make categories accessible by UI
                mapping.fromJS(cat_attributes, component.dac_categories);

            } else {

                // otherwise name is already on list, report error
                dialog.ajax_error("That category already exists in the category list.  Please use a new category name.")
                    ("","","");

            }
        }
    }

    // upload a list of cateogries
    component.upload_categories = function () {

            // disable continue button since we are now uploading
            $('.browser-continue').toggleClass("disabled", true);

            // load category file
            var file = component.browser_category_list.selection()[0];
            component.browser_category_list.progress(0);
            var fileObject ={
                pid: component.project._id(),
                mid: component.model._id(),
                file: file,
                aids: ["dac-cat-list", "0", "list"],
                parser: component.parser_cat_list_file(),
                progress: component.browser_category_list.progress,
                success: function(){

                    // get category list from database
                    client.get_model_parameter({
                        mid: component.model._id(),
                        aid: "dac-cat-list",
                        success: function (cat_list) {

                            // check list against current list for duplicates
                            var cat_name_new = true;
                            for (var i = 0; i != cat_attributes.length; ++i) {

                                // check if user select/unselected a category
                                cat_attributes[i]["Include"] = component.dac_categories()[i].Include();

                                // check if category already exists
                                if (cat_list.indexOf(cat_attributes[i].name) != -1) {
                                    cat_name_new = false;
                                }
                            }

                            // check length of list + length of current selection
                            if ((component.dac_categories().length +
                                cat_list.length) >= MAX_CATS) {

                                dialog.ajax_error('Too many categories in file. ' +
                                    'Maximum number of categories is ' + MAX_CATS +
                                    '.  (This can be changed using Edit -> Model Preferences.)')
                                    ("","","")
                                $('.browser-continue').toggleClass("disabled", false);

                            // update categories, if possible
                            } else if (cat_name_new) {

                                for (i = 0; i != cat_list.length; i++) {

                                    // add category to attribute list for gui
                                    cat_attributes.push({
                                                name: cat_list[i],
                                                type: "string",
                                                constant: true,
                                                disabled: false,
                                                Include: true,
                                                hidden: false,
                                                selected: false,
                                                lastSelected: false,
                                                tooltip: null
                                            });

                                    // make categories accessible by UI
                                    mapping.fromJS(cat_attributes, component.dac_categories);

                                    $('.browser-continue').toggleClass("disabled", false);

                                }

                            } else {

                                // don't update categories (duplicate entries)
                                dialog.ajax_error("Category file contains redundant category.  Please use new category names in file.")
                                    ("","","");
                                $('.browser-continue').toggleClass("disabled", false);

                            }
                        },
                        error: function () {

                            dialog.ajax_error("Server Error: Could not load the category list.")("","","");
                            $('.browser-continue').toggleClass("disabled", false);

                        },
                    });

                },
                error: function(){

                    dialog.ajax_error(
                        "There was a problem parsing the category list file.  Is a file selected?")
                        ("","","");
                    $('.browser-continue').toggleClass("disabled", false);

                }
            };
            fileUploader.uploadFile(fileObject);

    }

    // makes a categorical column and returns to model
    component.categorical_finish = function () {

        // record categories that user wants to use
        var cats_to_add = [];
        for(var i = 0; i != component.dac_categories().length; ++i) {
            if(component.dac_categories()[i].Include())
                cats_to_add.push(cat_attributes[i].name);
        };

        // if no name given, error to user
        if (component.dac_categorical_name() == "") {

            dialog.ajax_error('Please enter a name for the new column in the "New Cagegorical Column" box.')
                ("","","")

        // check to see if at least one category has been entered
        } else if (cats_to_add.length == 1) {

            dialog.ajax_error('Please enter/select at least one non "No Value" category.')
                ("","","")

        } else {

            // show spinner and reload model
            $(".browser-continue").toggleClass("disabled", true);

            // call server add new free text column
            client.get_model_command({
                mid: component.model._id(),
                type: "DAC",
                command: "manage_editable_cols",
                parameters: ['add', 'categorical', component.dac_categorical_name(),
                             cats_to_add, -1, -1, -1],
                success: function(result)
                {

                    // if user was a reader, then error, otherwise go to model
                    if (result["error"] === "reader") {
                        dialog.ajax_error("Access denied.  You must be a project writer or administrator to change the table data.")
                            ("","","");
                        $(".browser-continue").toggleClass("disabled", false);
                    } else {
                        component.go_to_model();
                    };

                },
                error: function ()
                {
                    dialog.ajax_error('Server error creating new free categorical column.')
                            ("","","");
                    $(".browser-continue").toggleClass("disabled", false);
                }
            });

        }

    };

    // removes a column and returns to model
    component.remove_finish = function () {

        // record columns that user wants to remove
        var rm_columns = [];
        for(var i = 0; i != component.dac_remove_cols().length; ++i) {
            if(component.dac_remove_cols()[i].Remove())
                rm_columns.push(i);
        };

        // if no name given, error to user
        if (rm_columns.length == 0) {

            dialog.ajax_error('Please select at least one column to remove.')
                ("","","")

        } else {

            // show spinner and reload model
            $(".browser-continue").toggleClass("disabled", true);

            // call server add new free text column
            client.get_model_command({
                mid: component.model._id(),
                type: "DAC",
                command: "manage_editable_cols",
                parameters: ['remove', -1, -1, -1 , rm_columns, -1, -1],
                success: function(result)
                {

                    // if user was a reader, then error, otherwise go to model
                    if (result["error"] === "reader") {
                        dialog.ajax_error("Access denied.  You must be a project writer or administrator to change the table data.")
                            ("","","");
                        $(".browser-continue").toggleClass("disabled", false);
                    } else {
                        component.go_to_model();
                    }

                },
                error: function ()
                {
                    dialog.ajax_error('Server error removing columns.')
                            ("","","");
                    $(".browser-continue").toggleClass("disabled", false);
                }
            });
        }
    };

    // very last function called to launch model
    component.go_to_model = function() {
      location = 'models/' + component.model._id();
    };

    // function for operating the back button in the wizard
    component.back = function() {

        var target = component.tab();

        target--;

        // for categorical tab, we skip back over the free text tab
        if (component.tab() == 2) {
            target--;
        }

        // for remove column tab, we skip back two steps
        if (component.tab() == 3) {
            target--;
            target--;
        }

        component.tab(target);
    };

    return component;
};

export default {
  viewModel: constructor,
  template: dacWizardUI
};
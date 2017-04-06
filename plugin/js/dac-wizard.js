// This script runs the input wizard for dial-a-cluster.
// It is modified from the CCA wizard code.  I'm not totally
// sure how all this code works, but I added comments where
// I understand what's going on.
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
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.model = mapping.fromJS({_id: null, name: "New Dial-A-Cluster Model",
                            description: "", marking: markings.preselected()});
    component.remote = mapping.fromJS({hostname: null, username: null, password: null, status: null,
                            status_type: null, enable: true, focus: false, sid: null, session_exists: false});
    component.remote.focus.extend({notify: "always"});
    component.browser = mapping.fromJS({path:null, selection: []});
    component.parser = ko.observable(null);
    component.attributes = mapping.fromJS([]);

    // local file input is selected by default
    component.cca_type = ko.observable("local");
    component.row_count = ko.observable(null);

    // the cca_type indicates local or remote file access,
    // but if I rename the variable the wizard quits functioning
    component.cca_type.subscribe(function(newValue) {
        if(newValue == 'local')
        {
        $(".modal-dialog").removeClass("modal-lg");
        }
        else
        {
        $(".modal-dialog").addClass("modal-lg");
        }
    });

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
            //component.tab(1);
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

    // switches between local and remote tabs
    component.select_type = function() {
        var type = component.cca_type();

        if (type === "local") {
            component.tab(1);
        } else if (type === "remote") {
            component.tab(2);
        }
    };

    // this function gets called after metadata is uploaded via
    // local (upload_table) or remote (load_table) upload
    var upload_success = function() {

        // load header row and use to let user select metadata
        client.get_model_arrayset_metadata({
        mid: component.model._id(),
        aid: "dac-wizard-metadata",
        arrays: "0",
        statistics: "0/...",
        success: function(metadata) {
            component.row_count(metadata.arrays[0].shape[0]); // Set number of rows
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
            component.tab(4);
            $('.browser-continue').toggleClass("disabled", false);
        }
        });
    };

    // this function uploads the meta data table from a local file
    component.upload_table = function() {
        $('.local-browser-continue').toggleClass("disabled", true);
        //TODO: add logic to the file uploader to look for multiple files list to add
        var file = component.browser.selection()[0];
        var fileObject ={
        pid: component.project._id(),
        mid: component.model._id(),
        file: file,
        aids: ["dac-wizard-metadata"],
        parser: component.parser(),
        success: function(){
            upload_success();
        },
        error: function(){
            dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
            $('.local-browser-continue').toggleClass("disabled", false);
        }
        };
        fileUploader.uploadFile(fileObject);
    };

    // this function accesses remote file systems
    component.connect = function() {
        component.remote.enable(false);
        component.remote.status_type("info");
        component.remote.status("Connecting ...");

        if(component.remote.session_exists())
        {
            component.tab(3);
            component.remote.enable(true);
            component.remote.status_type(null);
            component.remote.status(null);
        }
        else
        {
        client.post_remotes({
            hostname: component.remote.hostname(),
            username: component.remote.username(),
            password: component.remote.password(),
            success: function(sid) {
            component.remote.session_exists(true);
            component.remote.sid(sid);
            component.tab(3);
            component.remote.enable(true);
            component.remote.status_type(null);
            component.remote.status(null);
            },
            error: function(request, status, reason_phrase) {
            component.remote.enable(true);
            component.remote.status_type("danger");
            component.remote.status(reason_phrase);
            component.remote.focus("password");
            }
        });
        }
    };

    // this function uploads meta data from a remote server
    component.load_table = function() {
        $('.remote-browser-continue').toggleClass("disabled", true);
        var fileObject ={
        pid: component.project._id(),
        hostname: [component.remote.hostname()],
        mid: component.model._id(),
        paths: [component.browser.selection()],
        aids: ["dac-wizard-metadata"],
        parser: component.parser(),
        success: function(){
            upload_success();
        },
        error: function(){
            dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
            $('.remote-browser-continue').toggleClass("disabled", false);
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
            aid: "dac-wizard-metadata-include-columns",
            input: true,
            success: function() {
                component.tab(5);
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
        // Skip Upload Table tab if we're on the Choose Host tab.
        if(component.tab() == 2)
        {
            target--;
        }
        // Skip remote ui tabs if we are local
        if(component.cca_type() == 'local' && component.tab() == 4)
        {
            target--;
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

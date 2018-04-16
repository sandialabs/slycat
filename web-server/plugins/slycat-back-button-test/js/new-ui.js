/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "slycat-markings", "knockout", "knockout-mapping", "slycat_file_uploader_factory"], function(server_root, client, dialog, markings, ko, mapping, fileUploader)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.model = mapping.fromJS({_id: null, name: "New BBT Model", description: "", marking: markings.preselected()});
    component.remote = mapping.fromJS({hostname: null, username: null, password: null, status: null, status_type: null, enable: true, focus: false, sid: null});
    component.remote.focus.extend({notify: "always"});
    component.browser = mapping.fromJS({path:null, selection: []});
    component.parser = ko.observable(null);
    component.attributes = mapping.fromJS([]);
    component.scale_inputs = ko.observable(true);
    component.cca_type = ko.observable("local"); // local is selected by default...
    component.row_count = ko.observable(null);


    component.cancel = function() {
      if(component.remote.sid())
        client.delete_remote({ sid: component.remote.sid() });

      if(component.model._id())
        client.delete_model({ mid: component.model._id() });
    };

    component.create_model = function() {
      client.post_project_models({
        pid: component.project._id(),
        type: "cca",
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function(mid) {
          component.model._id(mid);
          component.tab(1);
        },
        error: dialog.ajax_error("Error creating model.")
      });
    };

    component.select_type = function() {
      var type = component.cca_type();

      if (type === "local") {
        $(".cca-tab-local").css("display", "block");
        component.tab(2);
      } else if (type === "remote") {
        $(".modal-dialog").addClass("modal-lg");
        $(".cca-tab-remote").css("display", "block");
        component.tab(3);
      }
    };

    var upload_success = function() {
      client.get_model_arrayset_metadata({
        mid: component.model._id(),
        aid: "data-table",
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
            constant = metadata.statistics[i].unique == 1;
            string = type == "string";
            tooltip = "";
            if(string)
            {
              tooltip = "This variable's values contain strings, so it cannot be included in the analysis.";
            }
            else if(constant)
            {
              tooltip = "This variable's values are all identical, so it cannot be included in the analysis.";
            }
            attributes.push({
              name: name, 
              type: type, 
              constant: constant,
              disabled: constant || string,
              Classification: type != "string" && !constant ? 'Input' : 'Neither',
              hidden: false,
              selected: false,
              lastSelected: false,
              tooltip: tooltip
            });
          }
          mapping.fromJS(attributes, component.attributes);
          component.tab(5);
          $('.browser-continue').toggleClass("disabled", false);
        }
      });
    };

    component.upload_table = function() {
//      $('.local-browser-continue').toggleClass("disabled", true);
      //TODO: add logic to the file uploader to look for multiple files list to add
      var file = component.browser.selection()[0];
      var fileObject ={
       pid: component.project._id(),
       mid: component.model._id(),
       file: file,
       aids: ["data-table"],
       parser: component.parser(),
       success: function(){
//         upload_success();
          alert("table uploaded! woot");
       },
       error: function(){
          dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
          $('.local-browser-continue').toggleClass("disabled", false);
        }
      };
      fileUploader.uploadFile(fileObject);
    };

    component.connect = function() {
      component.remote.enable(false);
      component.remote.status_type("info");
      component.remote.status("Connecting ...");
      client.post_remotes({
        hostname: component.remote.hostname(),
        username: component.remote.username(),
        password: component.remote.password(),
        success: function(sid) {
          component.remote.sid(sid);
          component.tab(4);
        },
        error: function(request, status, reason_phrase) {
          component.remote.enable(true);
          component.remote.status_type("danger");
          component.remote.status(reason_phrase);
          component.remote.focus("password");
        }
      });
    };

    component.load_table = function() {
      $('.remote-browser-continue').toggleClass("disabled", true);
      var fileObject ={
       pid: component.project._id(),
       sids: [component.remote.sid()],
       mid: component.model._id(),
       paths: [component.browser.selection()],
       aids: ["data-table"],
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
    
    component.go_to_model = function() {
      location = server_root + 'models/' + component.model._id();
    };

    component.finish = function() {
      var input_columns = [];
      var output_columns = [];
      for(var i = 0; i != component.attributes().length; ++i) {
        if(component.attributes()[i].Classification() == 'Input')
          input_columns.push(i);
        if(component.attributes()[i].Classification() == 'Output')
          output_columns.push(i);
      }

      if( input_columns.length >= component.row_count() || output_columns.length >= component.row_count() )
      {
        dialog.dialog({
          message:"The number of inputs must be less than " + component.row_count() + 
                  ". The number of outputs must be less than " + component.row_count() + 
                  ". You have selected " + input_columns.length +
                  " inputs and " + output_columns.length + " outputs."
        });
      }
      else if( input_columns.length == 0 )
      {
        dialog.dialog({
          message:"The number of inputs must be at least one."
        });
      }
      else if( output_columns.length == 0 )
      {
        dialog.dialog({
          message:"The number of outputs must be at least one."
        });
      }
      else
      {
        client.put_model_parameter({
          mid: component.model._id(),
          aid: "input-columns",
          value: input_columns,
          input: true,
          success: function() {
            client.put_model_parameter({
              mid: component.model._id(),
              aid: "output-columns",
              value: output_columns,
              input: true,
              success: function() {
                client.put_model_parameter({
                  mid: component.model._id(),
                  aid: "scale-inputs",
                  value: component.scale_inputs(),
                  input: true,
                  success: function() {
                    client.post_model_finish({
                      mid: component.model._id(),
                      success: function() {
                        component.tab(6);
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }

      
    };

    return component;
  }

  return {
    viewModel: constructor,
    template: { require: "text!" + server_root + "resources/wizards/new-bbt/ui.html"}
  };
});

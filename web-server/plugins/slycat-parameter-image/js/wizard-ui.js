/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import server_root from "js/slycat-server-root";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import markings from "js/slycat-markings";
import ko from "knockout";
import mapping from "knockout-mapping";
import fileUploader from "js/slycat-file-uploader-factory";
import "js/slycat-local-browser";
import "js/slycat-parser-controls";
import { remoteControlsReauth } from "js/slycat-remote-controls";
import "js/slycat-remote-browser";
import "js/slycat-table-ingestion";
import parameterImageWizardUI from "../wizard-ui.html";
import React from "react";
import ReactDOM from "react-dom";
import SmbRemoteFileBrowser from 'components/SmbRemoteFileBrowser.tsx'

function constructor(params)
{
  var component = {};
  component.tab = ko.observable(0);
  component.project = params.projects()[0];
  component.server_files = ko.observableArray();
  component.selected_file = ko.observable("");
  component.current_aids = ko.observable("");
  component.csv_data = ko.observableArray();
  component.error_messages = ko.observable("");
  // Alex removing default model name per team meeting discussion
  // component.model = mapping.fromJS({_id: null, name: "New Parameter Space Model", description: "", marking: markings.preselected()});
  component.model = mapping.fromJS({_id: null, name: "", description: "", marking: markings.preselected()});
  component.remote = mapping.fromJS({
    hostname: null, 
    username: null, 
    password: null, 
    status: null, 
    status_type: null, 
    enable: true, 
    focus: false, 
    sid: null, 
    session_exists: false,
    progress: ko.observable(null), 
    progress_status: ko.observable(''),
  });
  component.remote.focus.extend({notify: "always"});
  component.browser = mapping.fromJS({
    path:null, 
    selection: [], 
    progress: ko.observable(null), 
    progress_status: ko.observable(''),
  });
  component.parser = ko.observable(null);
  component.attributes = mapping.fromJS([]);
  component.server_root = server_root;
  component.ps_type = ko.observable(null);
  component.ps_type.subscribe(function(newValue) {
    // if(newValue == 'local')
    // {
    //   $(".modal-dialog").removeClass("modal-lg");
    // }
    // else
    // {
    //   $(".modal-dialog").addClass("modal-lg");
    // }
  });
  component.ps_type("remote"); // remote is selected by default...

  // Navigate to login controls and set alert message to 
  // inform user their session has been disconnected.
  component.reauth = function() {
    remoteControlsReauth(component.remote.status, component.remote.status_type);
    component.tab(2);
  }

  component.get_server_files = function() {
    component.browser.progress(10);
    component.browser.progress_status("Parsing...");

    client.put_project_csv_data({
        pid: component.project._id(),
        file_key: component.selected_file(),
        parser: component.parser(),
        mid: component.model._id(),
        aids: 'data-table',

        success: function(response) {
          var data = JSON.stringify(response);
          component.csv_data.push(data);
          upload_success(component.browser);
        },
          error: dialog.ajax_error("There was an error retrieving the CSV data."),
      });
    };

  component.get_server_file_names = function() {
      client.get_project_file_names({
          pid: component.project._id(),
          success: function(attachments) {
            var file;
            var fileName;
            for(var i = 0; i < attachments.length; i++) {
                file = attachments[i];
                fileName = file["file_name"];
                component.server_files.push(fileName);
            }
        },
        error: dialog.ajax_error("There was an error retrieving the CSV data."),
    });
  };

  component.create_model = function() {
    client.post_project_models({
      pid: component.project._id(),
      type: "parameter-image",
      name: component.model.name(),
      description: component.model.description(),
      marking: component.model.marking(),
      success: function(mid) {
        component.model._id(mid);
        component.remote.focus(true);
      },
      error: dialog.ajax_error("Error creating model."),
    });
  };

  component.get_error_messages = function() {
    client.get_model_parameter_fetch({
      mid: component.model._id(),
      aid: "error-messages"}).then((errors) => {
        var error_messages = "";
        if (errors.length >= 1) {
          // if there were errors, cleanup project data
          client.get_project_data_in_model_fetch({
            mid: component.model._id()}).then((did) => {
              if(did.length !== 0) {
                client.delete_project_data_fetch({did: did});
              }
            });

          for (var i = 0; i < errors.length; i++) {
            error_messages += (errors[i] + "\n");
          }
          component.error_messages(error_messages);
        }
        else {
          component.error_messages(error_messages);
        }
        if(component.error_messages().length == 0) {
          component.tab(4);
          $('.browser-continue').toggleClass("disabled", false);
        }
      });
  };

  // Create a model as soon as the dialog loads. We rename, change description and marking later.
  component.create_model();
  component.get_server_file_names();

  component.cancel = function() {
    if(component.model._id()) {
      client.get_project_data_in_model_fetch({
        mid: component.model._id()}).then((did) => {
          // if the data id isn't empty
          if(did.length !== 0) {
            // delete model first
            client.delete_model_fetch({ mid: component.model._id() }).then(() => {
              // Get list of model ids project data is used in
              client.get_project_data_parameter_fetch({ did: did, param: "mid"}).then((models) => {
                // if there are no more models using that project data, delete it
                if(models.length === 0) {
                  client.delete_project_data_fetch({ did: did });
                }
              });
            });
          }
          else { 
            // No data to delete
            client.delete_model_fetch({ mid: component.model._id() });
          }
        });
    }
  };

  component.select_type = function() {
    var type = component.ps_type();

    if (type === "local") {
      component.tab(1);
    } else if (type === "server") {
      component.existing_table();
    } else if (type === "remote") {
      component.tab(2);
    } else if (type === "smb") {
      component.tab(2);
      ReactDOM.render(
        <div>JSX RENDER</div>,
        document.querySelector(".smb-wizard")
      );
    }
  };

  var upload_success = function(uploader) {
    uploader.progress(95);
    uploader.progress_status('Finishing...');
    client.get_model_command({
      mid: component.model._id(),
      type: "parameter-image",
      command: "media-columns",
      success: function(media_columns) {
        client.get_model_table_metadata({
          mid: component.model._id(),
          aid: "data-table",
          success: function(metadata) {
            uploader.progress(100);
            uploader.progress_status('Finished');
            var attributes = [];
            for(var i = 0; i != metadata["column-names"].length; ++i)
              attributes.push({
                name:metadata["column-names"][i], 
                type:metadata["column-types"][i], 
                input:false,
                output:false,
                category:false,
                rating:false,
                image:media_columns.indexOf(i) !== -1,
                Classification: 'Neither',
                Categorical: false,
                Editable: false,
                hidden: media_columns.indexOf(i) !== -1,
                selected: false,
                lastSelected: false,
                disabled: false,
                tooltip: ""
              });
            mapping.fromJS(attributes, component.attributes);
            component.get_error_messages();
          }
        });
      }
    });
  };

  component.existing_table = function() {
        var fileName = component.selected_file;
        component.current_aids = fileName();
        component.get_server_files();
    };

  component.upload_table = function() {
    $('.local-browser-continue').toggleClass("disabled", true);
    var file = component.browser.selection()[0];

    var fileObject ={
     pid: component.project._id(),
     mid: component.model._id(),
     file: file,
     aids: [["data-table"], file.name],
     parser: component.parser(),
     progress: component.browser.progress,
     progress_status: component.browser.progress_status,
     progress_final: 90,
     success: function(){
       upload_success(component.browser);
     },
     error: function(){
        dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
        $('.local-browser-continue').toggleClass("disabled", false);
        component.browser.progress(null);
        component.browser.progress_status('');
      }
    };
    fileUploader.uploadFile(fileObject);
  };

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

  component.load_table = function() {
    $('.remote-browser-continue').toggleClass("disabled", true);
    const file_name = component.browser.selection()[0].split("/")[component.browser.selection()[0].split("/").length - 1];
    var fileObject ={
     pid: component.project._id(),
     hostname: [component.remote.hostname()],
     mid: component.model._id(),
     paths: [component.browser.selection()],
     aids: [["data-table"], file_name],
     parser: component.parser(),
     progress: component.remote.progress,
     progress_status: component.remote.progress_status,
     progress_final: 90,
     success: function(){
       upload_success(component.remote);
     },
     error: function(){
        dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
        $('.remote-browser-continue').toggleClass("disabled", false);
        component.remote.progress(null);
        component.remote.progress_status('');
      }
    };
    fileUploader.uploadFile(fileObject);
  };

  component.set_input = function(attribute) {
    attribute.output(false);
    attribute.category(false);
    attribute.rating(false);
    attribute.image(false);
    return true;
  };

  component.set_output = function(attribute) {
    attribute.input(false);
    attribute.category(false);
    attribute.rating(false);
    attribute.image(false);
    return true;
  };

  component.set_category = function(attribute) {
    attribute.input(false);
    attribute.output(false);
    attribute.rating(false);
    attribute.image(false);
    return true;
  };

  component.set_rating = function(attribute) {
    attribute.input(false);
    attribute.output(false);
    attribute.category(false);
    attribute.image(false);
    return true;
  };

  component.set_image = function(attribute) {
    attribute.input(false);
    attribute.output(false);
    attribute.category(false);
    attribute.rating(false);
    return true;
  };

  component.go_to_model = function() {
    location = server_root + 'models/' + component.model._id();
  };

  component.finish = function() {
    var input_columns = [];
    var output_columns = [];
    var rating_columns = [];
    var category_columns = [];
    var image_columns = [];
    for(var i = 0; i != component.attributes().length; ++i) {
      if(component.attributes()[i].Classification() == 'Input')
        input_columns.push(i);
      if(component.attributes()[i].Classification() == 'Output')
        output_columns.push(i);
      if(component.attributes()[i].Categorical())
        category_columns.push(i);
      if(component.attributes()[i].Editable())
        rating_columns.push(i);
      if(component.attributes()[i].image())
        image_columns.push(i);
    }

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
              aid: "rating-columns",
              value: rating_columns,
              input: true,
              success: function() {
                client.put_model_parameter({
                  mid: component.model._id(),
                  aid: "category-columns",
                  value: category_columns,
                  input: true,
                  success: function() {
                    client.put_model_parameter({
                      mid: component.model._id(),
                      aid: "image-columns",
                      value: image_columns,
                      input: true,
                      success: function() {
                        component.tab(5);
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  };

  component.name_model = function(formElement)
  {
    // Validating
    formElement.classList.add('was-validated');

    // If valid...
    if (formElement.checkValidity() === true)
    {
      // Clearing form validation
      formElement.classList.remove('was-validated');
      // Creating new model
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
    }
  };

  component.back = function() {
    var target = component.tab();

    // Need to clean up project data if backing from tab 4
    if(component.tab() == 4)
    {
      // Have to get the project data that was just added the current model
      client.get_project_data_in_model_fetch({
        mid: component.model._id()}).then((did) => {
          // if the data id isn't empty
          if(did[0] !== "") {
            // Remove project data id from model
            client.delete_project_data_in_model_fetch({did: did, mid: component.model._id()}).then(() => {
              // Remove model id from project data
              client.delete_model_in_project_data_fetch({mid: component.model._id(), did: did}).then(() => {
                // Get the list of models using that project data
                client.get_project_data_parameter_fetch({did: did, param: "mid"}).then((models) => {
                  // if there are no more models using that project data, delete it
                  if(models.length === 0) {
                      client.delete_project_data_fetch({did: did});
                    }
                  });
                });
              });
            }
          });
    }

    // Skip Upload Table tab if we're on the Choose Host tab.
    if(component.tab() == 2)
    {
      target--;
    }
    // Skip remote ui tabs if we are local
    if(component.ps_type() == 'local' && component.tab() == 4)
    {
      target--;
      target--;
    }
    if(component.ps_type() == 'server' && component.tab() == 4)
    {
      target--;
      target--;
      target--;
    }
    target--;
    component.tab(target);
  };

  return component;
}

export default {
  viewModel: constructor,
  template: parameterImageWizardUI,
};
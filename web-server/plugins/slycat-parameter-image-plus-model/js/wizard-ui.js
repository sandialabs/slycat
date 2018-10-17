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
import "js/slycat-remote-controls";
import "js/slycat-remote-browser";
import "js/slycat-table-ingestion";
import "js/slycat-remote-interface";
import "js/slycat-model-controls";
import parameterImagePlusWizardUI from "../wizard-ui.html";

function constructor(params)
{
  var component = {};
  component.tab = ko.observable(0);
  component.project = params.projects()[0];
  component.cluster_linkage = ko.observable("average"); // average is selected by default...
  component.cluster_column = ko.observable(false);
  component.image_columns_names = ko.observableArray();
  component.ps_type = ko.observable("remote"); // local is selected by default...
  component.matrix_type = ko.observable("remote"); // remote is selected by default...
  component.model = mapping.fromJS({_id: null, name: "New Parameter Image Model", description: "", marking: markings.preselected()});
  component.remote = mapping.fromJS({
    hostname: null, 
    username: null, 
    password: null, 
    status: null, 
    status_type: null, 
    enable: ko.computed(function(){return component.ps_type() == 'remote' ? true : false;}), 
    focus: false, 
    sid: null, 
    session_exists: false,
    path:null,
    selection: [],
    progress: ko.observable(null), 
    progress_status: ko.observable(''),
  });
  component.remote.focus.extend({notify: "always"});
  component.remote_matrix = mapping.fromJS({
    hostname: null, 
    username: null, 
    password: null, 
    status: null, 
    status_type: null, 
    enable: ko.computed(function(){return component.matrix_type() == 'remote' ? true : false;}), 
    focus: false, 
    sid: null, 
    session_exists: false,
    path:null, 
    selection: [], 
    progress: ko.observable(null), 
    progress_status: ko.observable(''),
  });
  component.remote_matrix.focus.extend({notify: "always"});
  component.browser = mapping.fromJS({
    path:null, 
    selection: [], 
    progress: ko.observable(null), 
    progress_status: ko.observable(''),
  });
  component.browser_matrix = mapping.fromJS({
    path:null, 
    selection: [], 
    progress: ko.observable(null), 
    progress_status: ko.observable(''),
  });
  component.parser = ko.observable(null);
  component.attributes = mapping.fromJS([]);
  component.image_attributes = ko.computed(function(){
    return ko.utils.arrayFilter(component.attributes(), function(attribute) {
      return attribute.image();
    });
  });
  component.image_attributes.subscribe(function(newValue){
    if(this.target().length > 0) {
      component.cluster_column( this.target()[0].name() );
      this.target().forEach(function(t) {
        component.image_columns_names.push(t.name());
      });
    }
  });
  component.server_root = server_root;
  component.distance_measures = ko.observableArray([
    { name: 'Correlation Distance', value: 'correlation-distance' },
    { name: 'Jaccard Distance', value: 'jaccard-distance' },
    { name: 'Jaccard Distance (2)', value: 'jaccard2-distance' },
    { name: 'One-Norm Distance', value: 'one-norm-distance' },
    { name: 'Cosine Distance', value: 'cosine-distance' },
    { name: 'Hamming Distance', value: 'hamming-distance' }
  ]);
  component.distance_measure = ko.observable('correlation-distance');

  // Let's use a large dialog for this wizard because there are so many steps
  $(".modal-dialog").addClass("modal-lg");

  component.create_model = function() {
    client.post_project_models({
      pid: component.project._id(),
      type: "parameter-image-plus",
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

  // Create a model as soon as the dialog loads. We rename, change description and marking later.
  component.create_model();

  component.cancel = function() {
    if(component.model._id())
      client.delete_model({ mid: component.model._id() });
  };

  component.select_type = function() {
    $('.local-browser-continue-data').toggleClass("disabled", true);
    var type = component.ps_type();

    if (type === "local") {
      component.upload_table();
    } else if (type === "remote") {
      component.connect();
    }
  };

  component.select_matrix_type = function() {
    $('.local-browser-continue-matrix').toggleClass("disabled", true);
    var type = component.matrix_type();

    if (type == "compute") {
      component.tab(4);
      $('.browser-continue').toggleClass("disabled", false);
    }
    else if (type === "local") {
      component.upload_distance_matrix();
    } else if (type === "remote") {
      component.connect_matrix();
    }
  };

  var upload_success = function(uploader) {
    uploader.progress(95);
    uploader.progress_status('Finishing...');
    client.get_model_command({
      mid: component.model._id(),
      type: "parameter-image-plus",
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
            {
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
            }
            // find the first image column and set its name to component.cluster_column
            // component.cluster_column

            mapping.fromJS(attributes, component.attributes);
            component.tab(2);
            $('.browser-continue').toggleClass("disabled", false);
          }
        });
      }
    });
  };

  component.upload_table = function() {
    //$('.local-browser-continue').toggleClass("disabled", true);
    //TODO: add logic to the file uploader to look for multiple files list to add
    var file = component.browser.selection()[0];
    var fileObject ={
     pid: component.project._id(),
     mid: component.model._id(),
     file: file,
     aids: ["data-table"],
     parser: component.parser(),
     progress: component.browser.progress,
     progress_status: component.browser.progress_status,
     progress_final: 90,
     success: function(){
       upload_success(component.browser);
     },
     error: function(){
        dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
        $('.browser-continue').toggleClass("disabled", false);
        component.browser.progress(null);
        component.browser.progress_status('');
      }
    };
    fileUploader.uploadFile(fileObject);
  };

  component.select_columns = function() {
    component.put_model_parameters();
    component.tab(3);

    // if (component.ps_type() === "remote") {
    //   component.tab(3);
    // } else {
    //   component.tab(4);
    // }
  };

  component.select_distance_measure = function() {
    component.distance_measure($('#distance_measure').val());
    component.tab(5);
  };

  component.select_compute = function() {
    var vm = ko.dataFor($('.slycat-remote-interface')[0]);
    vm.agent_function(component.distance_measure());
    vm.submit_job();
  };

  component.to_last_step = function() {
    component.tab(7);
  };

  var upload_matrix_success = function(uploader) {
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
            // var attributes = [];
            // for(var i = 0; i != metadata["column-names"].length; ++i)
            //   attributes.push({
            //     name:metadata["column-names"][i],
            //     type:metadata["column-types"][i],
            //     input:false,
            //     output:false,
            //     category:false,
            //     rating:false,
            //     image:media_columns.indexOf(i) !== -1,
            //     Classification: 'Neither',
            //     Categorical: false,
            //     Editable: false,
            //     hidden: media_columns.indexOf(i) !== -1,
            //     selected: false,
            //     lastSelected: false
            //   });
            // mapping.fromJS(attributes, component.attributes);
            component.finish();
            $('.browser-continue').toggleClass("disabled", false);
          }
        });
      }
    });
  };

  component.upload_distance_matrix = function() {
    //$('.local-browser-continue').toggleClass("disabled", true);
    var file = component.browser_matrix.selection()[0];
    var fileObject ={
     pid: component.project._id(),
     mid: component.model._id(),
     file: file,
     aids: ["distance-matrix"],
     parser: "slycat-csv-parser",
     progress: component.browser_matrix.progress,
     progress_status: component.browser_matrix.progress_status,
     progress_final: 90,
     success: function(){
       upload_matrix_success(component.browser_matrix);
     },
     error: function(){
        dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
        $('.browser-continue').toggleClass("disabled", false);
        component.browser_matrix.progress(null);
        component.browser_matrix.progress_status('');
      }
    };
    fileUploader.uploadFile(fileObject);
  };

  component.connect = function() {
    component.remote.status_type("info");
    component.remote.status("Connecting ...");

    if(component.remote.session_exists())
    {
      component.tab(1);
      $('.browser-continue').toggleClass("disabled", false);
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
          component.tab(1);
          $('.browser-continue').toggleClass("disabled", false);
          component.remote.status_type(null);
          component.remote.status(null);
        },
        error: function(request, status, reason_phrase) {
          component.remote.status_type("danger");
          component.remote.status(reason_phrase);
          component.remote.focus("password");
          $('.browser-continue').toggleClass("disabled", false);
        }
      });
    }
  };

  component.connect_matrix = function() {
    component.remote_matrix.status_type("info");
    component.remote_matrix.status("Connecting ...");

    if(component.remote.session_exists())
    {
      component.tab(6);
      $('.browser-continue').toggleClass("disabled", false);
      component.remote_matrix.status_type(null);
      component.remote_matrix.status(null);
    }
    else
    {
      client.post_remotes({
        hostname: component.remote_matrix.hostname(),
        username: component.remote_matrix.username(),
        password: component.remote_matrix.password(),
        success: function(sid) {
          component.remote_matrix.session_exists(true);
          component.remote_matrix.sid(sid);
          component.tab(6);
          $('.browser-continue').toggleClass("disabled", false);
          component.remote_matrix.status_type(null);
          component.remote_matrix.status(null);
        },
        error: function(request, status, reason_phrase) {
          component.remote_matrix.status_type("danger");
          component.remote_matrix.status(reason_phrase);
          component.remote_matrix.focus("password");
          $('.browser-continue').toggleClass("disabled", false);
        }
      });
    }
  };

  component.load_table = function() {
    $('.remote-browser-continue-data').toggleClass("disabled", true);
    var fileObject ={
     pid: component.project._id(),
     hostname: [component.remote.hostname()],
     mid: component.model._id(),
     paths: [component.remote.selection()],
     aids: ["data-table"],
     parser: component.parser(),
     progress: component.remote.progress,
     progress_status: component.remote.progress_status,
     progress_final: 90,
     success: function(){
       upload_success(component.remote);
     },
     error: function(){
        dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
        $('.browser-continue').toggleClass("disabled", false);
        component.remote.progress(null);
        component.remote.progress_status('');
      }
    };
    fileUploader.uploadFile(fileObject);
  };

  component.load_distance_matrix = function() {
    $('.remote-browser-continue-matrix').toggleClass("disabled", true);
    var fileObject ={
     pid: component.project._id(),
     hostname: [component.remote_matrix.hostname()],
     mid: component.model._id(),
     paths: [component.remote_matrix.selection()],
     aids: ["distance-matrix"],
     parser: "slycat-csv-parser",
     progress: component.remote_matrix.progress,
     progress_status: component.remote_matrix.progress_status,
     progress_final: 90,
     success: function(){
       upload_matrix_success(component.remote_matrix);
     },
     error: function(){
        dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
        $('.browser-continue').toggleClass("disabled", false);
        component.remote_matrix.progress(null);
        component.remote_matrix.progress_status('');
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

  component.put_model_parameters = function(callback) {
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
      // if(component.attributes()[i].input())
      //   input_columns.push(i);
      // if(component.attributes()[i].output())
      //   output_columns.push(i);
      // if(component.attributes()[i].category())
      //   category_columns.push(i);
      // if(component.attributes()[i].rating())
      //   rating_columns.push(i);
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
                        client.put_model_parameter({
                          mid: component.model._id(),
                          aid: "cluster-columns",
                          value: component.cluster_column(),
                          input: true,
                          success: function() {
                            client.put_model_parameter({
                              mid: component.model._id(),
                              aid: "default-image",
                              value: component.image_columns_names.indexOf(component.cluster_column()),
                              input: true,
                              success: function() {
                                client.put_model_parameter({
                                  mid: component.model._id(),
                                  aid: "cluster-measure",
                                  value: 'csv',
                                  input: true,
                                  success: function() {
                                    if (callback)
                                      callback();
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
              }
            });
          }
        });
      }
    });
  };

  component.finish = function() {
    component.tab(7);
    $('.browser-continue').toggleClass("disabled", false);
  };

  component.name_model = function() {
    client.put_model(
    {
      mid: component.model._id(),
      name: component.model.name(),
      description: component.model.description(),
      marking: component.model.marking(),
      success: function()
      {
        client.put_model_parameter({
          mid: component.model._id(),
          aid: "cluster-linkage",
          value: component.cluster_linkage(),
          input: true,
          success: function() {
            if (component.matrix_type() === "compute")
              component.go_to_model();
            else {
              client.post_model_finish({
                mid: component.model._id(),
                success: function() {
                  component.go_to_model();
                }
              });
            }
          }
        });
      },
      error: dialog.ajax_error("Error updating model."),
    });
  };

  component.back = function() {
    var target = component.tab();

    // Ask user if they want to cancel their compute job
    if(component.tab() == 7 && component.matrix_type() == 'compute')
    {
      dialog.confirm({
        title: 'Stop Computing Distances?',
        message: 'To go back, you need to stop the compute distances job. Do you want to stop this job and go back?',
        ok: function(){
          // Stop the compute job
          var contextData = ko.contextFor(document.getElementsByClassName('slycat-remote-interface')[0]).$data;
          var sid = contextData.remote.sid();
          var jid = contextData.jid();
          if(jid > -1 && sid !== null)
          {
            client.post_cancel_job({
              sid: sid,
              jid: jid,
              success: function(){
                go_back();
              },
              error: function(){
                go_back();
              }
            });
          }
          else
          {
            go_back();
          }
        },
        cancel: function(){
          return;
        }
      });

      function go_back(){
        target--;
        target--;
        component.tab(target);
      }
    }
    else
    {
      // Skip Select Table tabs if we are local
      if(component.tab() == 2 && component.ps_type() == 'local')
      {
        target--;
      }
      // Skip Compute Distances tab if we are on Select Distances tab
      else if(component.tab() == 6)
      {
        target--;
        target--;
      }
      // Skip Select Distances and Compute Distances tabs if we are doing local matrix
      else if(component.tab() == 7 && component.matrix_type() == 'local')
      {
        target--;
        target--;
        target--;
      }
      target--;
      component.tab(target);
    }
  };

  return component;
}

export default {
  viewModel: constructor,
  template: parameterImagePlusWizardUI
};
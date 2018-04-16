/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define(['slycat-server-root', 'slycat-web-client', 'slycat-dialog', 'slycat-markings', 'knockout', 'knockout-mapping', 'slycat_file_uploader_factory'], function(server_root, client, dialog, markings, ko, mapping, fileUploader) {
  function constructor(params) {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.model = mapping.fromJS({_id: null, name: 'New STL Model', description: '', marking: markings.preselected()});
    component.browser = mapping.fromJS({selection: []});

    component.cancel = function() {
      if (component.model._id())
        client.delete_model({ mid: component.model._id() });
    };

    component.create_model = function() {
      client.post_project_models({
        pid: component.project._id(),
        type: "stl",
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function(mid) {
          component.model._id(mid);
          component.tab(1);
        },
        error: dialog.ajax_error('Error creating model.'),
      });
    };

    component.go_to_model = function() {
      location = server_root + 'models/' + component.model._id();
    };

    component.finish = function() {
      $('.local-browser-continue').toggleClass("disabled", true);
      var nameArr = component.browser.selection()[0].name.split('.');
      var extension = nameArr[nameArr.length - 1].toLowerCase();

      if (extension !== 'stl') {
        dialog.dialog({
          title: 'Error',
          message: 'Only files with an .stl extension are valid'
        });
        $('.local-browser-continue').toggleClass("disabled", false);
        return;
      }
      //TODO: add logic to the file uploader to look for multiple files list to add
      var file = component.browser.selection()[0];
      var fileObject ={
       pid: component.project._id(),
       mid: component.model._id(),
       file: file,
       aids: ['geometry'],
       parser: 'slycat-blob-parser',
       success: function() {
         client.post_model_finish({
           mid: component.model._id(),
           success: function() {
             component.tab(2);
             $('.local-browser-continue').toggleClass("disabled", false);
           }
         });
       },
       error: function(){
         dialog.ajax_error('There was a problem uploading the file: ')();
         $('.local-browser-continue').toggleClass('disabled', false);
       }
      };
      fileUploader.uploadFile(fileObject);
    };

    return component;
  }

  return {
    viewModel: constructor,
    template: { require: 'text!' + server_root + 'resources/wizards/stl/ui.html' },
  };
});

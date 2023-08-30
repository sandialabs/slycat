/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

import server_root from "js/slycat-server-root";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import markings from "js/slycat-selectable-markings";
import ko from "knockout";
import mapping from "knockout-mapping";
import fileUploader from "js/slycat-file-uploader-factory";
import "js/slycat-local-browser";
import "js/slycat-remote-controls";
import { remoteControlsReauth } from "js/slycat-remote-controls";
import "js/slycat-table-ingestion";
import "js/slycat-model-controls";
import newCCAWizardUI from "../new-ui.html";

function constructor(params) {
  var component = {};
  component.tab = ko.observable(0);
  component.project = params.projects()[0];
  // Alex removing default model name per team meeting discussion
  // component.model = mapping.fromJS({_id: null, name: "New CCA Model", description: "", marking: markings.preselected()});
  component.model = mapping.fromJS({
    _id: null,
    name: "",
    description: "",
    marking: markings.preselected(),
  });
  console.debug(
    `CCA: new-ui.js: markings is: %o and markings.preselected() is: ${markings.preselected()} and markings.allowed() is: %o`,
    markings,
    markings.allowed(),
  );
  console.debug("CCA: new-ui.js: constructor: component.model: ", component.model);
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
    progress_status: ko.observable(""),
  });
  component.remote.focus.extend({ notify: "always" });
  component.browser = mapping.fromJS({
    path: null,
    selection: [],
    progress: ko.observable(null),
    progress_status: ko.observable(""),
  });
  component.parser = ko.observable(null);
  component.attributes = mapping.fromJS([]);
  component.scale_inputs = ko.observable(true);
  component.cca_type = ko.observable("local"); // local is selected by default...
  component.row_count = ko.observable(null);
  component.show_local_browser_error = ko.observable(false);

  component.cca_type.subscribe(function (newValue) {
    // if(newValue == 'local')
    // {
    //   $(".modal-dialog").removeClass("modal-lg");
    // }
    // else
    // {
    //   $(".modal-dialog").addClass("modal-lg");
    // }
  });

  // Navigate to login controls and set alert message to
  // inform user their session has been disconnected.
  component.reauth = function () {
    remoteControlsReauth(component.remote.status, component.remote.status_type);
    component.tab(2);
  };

  component.create_model = function () {
    client.post_project_models({
      pid: component.project._id(),
      type: "cca",
      name: component.model.name(),
      description: component.model.description(),
      marking: component.model.marking(),
      success: function (mid) {
        component.model._id(mid);
        //component.tab(1);
      },
      error: dialog.ajax_error("Error creating model."),
    });
  };

  // Create a model as soon as the dialog loads. We rename, change description and marking later.
  component.create_model();

  component.cancel = function () {
    if (component.model._id()) client.delete_model({ mid: component.model._id() });
  };

  component.select_type = function () {
    var type = component.cca_type();

    if (type === "local") {
      component.tab(1);
    } else if (type === "remote") {
      component.tab(2);
    }
  };

  var upload_success = function (uploader) {
    uploader.progress(95);
    uploader.progress_status("Finishing...");
    client.get_model_arrayset_metadata({
      mid: component.model._id(),
      aid: "data-table",
      arrays: "0",
      statistics: "0/...",
      success: function (metadata) {
        uploader.progress(100);
        uploader.progress_status("Finished");
        component.row_count(metadata.arrays[0].shape[0]); // Set number of rows
        var attributes = [];
        var name = null;
        var type = null;
        var constant = null;
        var string = null;
        var tooltip = null;
        for (var i = 0; i != metadata.arrays[0].attributes.length; ++i) {
          name = metadata.arrays[0].attributes[i].name;
          type = metadata.arrays[0].attributes[i].type;
          constant = metadata.statistics[i].unique == 1;
          string = type == "string";
          tooltip = "";
          if (string) {
            tooltip =
              "This variable's values contain strings, so it cannot be included in the analysis.";
          } else if (constant) {
            tooltip =
              "This variable's values are all identical, so it cannot be included in the analysis.";
          }
          attributes.push({
            name: name,
            type: type,
            constant: constant,
            disabled: constant || string,
            Classification: type != "string" && !constant ? "Input" : "Neither",
            hidden: false,
            selected: false,
            lastSelected: false,
            tooltip: tooltip,
          });
        }
        mapping.fromJS(attributes, component.attributes);
        component.tab(4);
        $(".browser-continue").toggleClass("disabled", false);
      },
    });
  };

  component.upload_table = function () {
    // check that a file has been selected
    if (component.browser.selection().length == 0) {
      component.show_local_browser_error(true);
      return;
    }
    component.show_local_browser_error(false);
    $(".local-browser-continue").toggleClass("disabled", true);
    
    //TODO: add logic to the file uploader to look for multiple files list to add
    var file = component.browser.selection()[0];
    let file_name = file.name;
    var fileObject = {
      pid: component.project._id(),
      mid: component.model._id(),
      file: file,
      aids: [["data-table"], file_name],
      parser: component.parser(),
      progress: component.browser.progress,
      progress_status: component.browser.progress_status,
      progress_final: 90,
      success: function () {
        upload_success(component.browser);
      },
      error: function () {
        dialog.ajax_error(
          "Did you choose the correct file and filetype?  There was a problem parsing the file: ",
        )();
        $(".local-browser-continue").toggleClass("disabled", false);
        component.browser.progress(null);
        component.browser.progress_status("");
      },
    };
    fileUploader.uploadFile(fileObject);
  };

  component.connect = function () {
    component.remote.enable(false);
    component.remote.status_type("info");
    component.remote.status("Connecting ...");

    if (component.remote.session_exists()) {
      component.tab(3);
      component.remote.enable(true);
      component.remote.status_type(null);
      component.remote.status(null);
    } else {
      client.post_remotes({
        hostname: component.remote.hostname(),
        username: component.remote.username(),
        password: component.remote.password(),
        success: function (sid) {
          component.remote.session_exists(true);
          component.remote.sid(sid);
          component.tab(3);
          component.remote.enable(true);
          component.remote.status_type(null);
          component.remote.status(null);
        },
        error: function (request, status, reason_phrase) {
          component.remote.enable(true);
          component.remote.status_type("danger");
          component.remote.status(reason_phrase);
          component.remote.focus("password");
        },
      });
    }
  };

  component.load_table = function () {
    $(".remote-browser-continue").toggleClass("disabled", true);
    const file_name = component.browser.selection()[0].split("/")[
      component.browser.selection()[0].split("/").length - 1
    ];
    var fileObject = {
      pid: component.project._id(),
      hostname: [component.remote.hostname()],
      mid: component.model._id(),
      paths: [component.browser.selection()],
      aids: [["data-table"], file_name],
      parser: component.parser(),
      progress: component.remote.progress,
      progress_status: component.remote.progress_status,
      progress_final: 90,
      success: function () {
        upload_success(component.remote);
      },
      error: function () {
        dialog.ajax_error(
          "Did you choose the correct file and filetype?  There was a problem parsing the file: ",
        )();
        $(".remote-browser-continue").toggleClass("disabled", false);
        component.remote.progress(null);
        component.remote.progress_status("");
      },
    };
    fileUploader.uploadFile(fileObject);
  };

  component.go_to_model = function () {
    location = server_root + "models/" + component.model._id();
  };

  component.finish = function () {
    var input_columns = [];
    var output_columns = [];
    for (var i = 0; i != component.attributes().length; ++i) {
      if (component.attributes()[i].Classification() == "Input") input_columns.push(i);
      if (component.attributes()[i].Classification() == "Output") output_columns.push(i);
    }

    if (
      input_columns.length >= component.row_count() ||
      output_columns.length >= component.row_count()
    ) {
      dialog.dialog({
        message:
          "The number of inputs must be less than " +
          component.row_count() +
          ". The number of outputs must be less than " +
          component.row_count() +
          ". You have selected " +
          input_columns.length +
          " inputs and " +
          output_columns.length +
          " outputs.",
      });
    } else if (input_columns.length == 0) {
      dialog.dialog({
        message: "The number of inputs must be at least one.",
      });
    } else if (output_columns.length == 0) {
      dialog.dialog({
        message: "The number of outputs must be at least one.",
      });
    } else {
      client.put_model_parameter({
        mid: component.model._id(),
        aid: "input-columns",
        value: input_columns,
        input: true,
        success: function () {
          client.put_model_parameter({
            mid: component.model._id(),
            aid: "output-columns",
            value: output_columns,
            input: true,
            success: function () {
              client.put_model_parameter({
                mid: component.model._id(),
                aid: "scale-inputs",
                value: component.scale_inputs(),
                input: true,
                success: function () {
                  component.tab(5);
                },
              });
            },
          });
        },
      });
    }
  };

  component.name_model = function (formElement) {
    // Validating
    formElement.classList.add("was-validated");

    // If valid...
    if (formElement.checkValidity() === true) {
      // Clearing form validation
      formElement.classList.remove("was-validated");
      // Creating new model
      client.put_model({
        mid: component.model._id(),
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function () {
          client.post_model_finish({
            mid: component.model._id(),
            success: function () {
              component.go_to_model();
            },
          });
        },
        error: dialog.ajax_error("Error updating model."),
      });
    }
  };

  component.back = function () {
    var target = component.tab();
    // Skip Upload Table tab if we're on the Choose Host tab.
    if (component.tab() == 2) {
      target--;
    }
    // Skip remote ui tabs if we are local
    if (component.cca_type() == "local" && component.tab() == 4) {
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
  template: newCCAWizardUI,
};

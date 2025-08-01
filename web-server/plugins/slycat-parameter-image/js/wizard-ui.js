/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import server_root from "js/slycat-server-root";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import markings from "js/slycat-selectable-markings";
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
import { createRoot } from "react-dom/client";
import RemoteFileBrowser from "components/RemoteFileBrowser";
import SmbAuthentication from "components/SmbAuthentication.tsx";
import HDF5Browser from "components/HDF5Browser.tsx";

function constructor(params) {
  var component = {};
  component.tab = ko.observable(0);
  component.project = params.projects()[0];
  component.file_extension = ko.observable("");
  component.server_files = ko.observableArray();
  component.selected_file = ko.observable("");
  component.current_aids = ko.observable("");
  component.csv_data = ko.observableArray();
  component.error_messages = ko.observable("");
  component.warning_messages = ko.observable("");
  component.useProjectData = ko.observable(false);
  component.enable = ko.observable(true);

  component.model = mapping.fromJS({
    _id: null,
    name: "",
    description: "",
    marking: markings.preselected(),
  });
  component.remote = mapping.fromJS({
    hostname: null,
    username: null,
    password: null,
    share: null,
    domain: null,
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
  component.server_root = server_root;
  component.ps_type = ko.observable(null);
  component.ps_type.subscribe(function (newValue) {
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
  component.smb_wizard_login_root = createRoot(document.querySelector(".smb-wizard-login"));
  component.smb_wizard_browse_root = createRoot(document.querySelector(".smb-wizard-browse"));

  // Navigate to login controls and set alert message to
  // inform user their session has been disconnected.
  component.reauth = function () {
    remoteControlsReauth(component.remote.status, component.remote.status_type);
    component.tab(2);
  };

  component.get_server_files = function () {
    component.browser.progress(10);
    component.browser.progress_status("Parsing...");

    client.put_project_csv_data({
      pid: component.project._id(),
      file_key: component.selected_file(),
      parser: component.parser(),
      mid: component.model._id(),
      aids: [["data-table"], component.current_aids()],

      success: function (response) {
        var data = JSON.stringify(response);
        component.csv_data.push(data);
        upload_success(component.browser);
      },
      error: dialog.ajax_error("There was an error retrieving the CSV data."),
    });
  };

  component.get_server_file_names = function () {
    client.get_project_file_names({
      pid: component.project._id(),
      success: function (attachments) {
        var file;
        var fileName;
        for (var i = 0; i < attachments.length; i++) {
          file = attachments[i];
          fileName = file["file_name"];
          component.server_files.push(fileName);
        }
      },
      error: dialog.ajax_error("There was an error retrieving the CSV data."),
    });
  };

  component.create_model = function () {
    client.post_project_models({
      pid: component.project._id(),
      type: "parameter-image",
      name: component.model.name(),
      description: component.model.description(),
      marking: component.model.marking(),
      success: function (mid) {
        component.model._id(mid);
        component.remote.focus(true);
      },
      error: dialog.ajax_error("Error creating model."),
    });
  };

  component.get_error_messages = function () {
    client
      .get_model_parameter_fetch({
        mid: component.model._id(),
        aid: "error-messages",
      })
      .then((errors) => {
        // keep track of both warnings and errors
        var error_messages = "";

        // check if there are actual errors or just warnings
        if (errors.length >= 1) {
          component.enable(false);
          if (!errors[0].includes("Oops")) {
            error_messages =
              "The errors listed below must be fixed before you can upload a model.\n\n";
          }

          // display warnings/errors
          for (var i = 0; i < errors.length; i++) {
            error_messages += "Error:\n" + errors[i] + "\n";
          }
          component.error_messages(error_messages);

          // if there were errors, cleanup project data
          if (error_messages.length > 0) {
            // delete model and data
            client
              .get_project_data_in_model_fetch({
                mid: component.model._id(),
              })
              .then((did) => {
                if (did.length !== 0) {
                  client.delete_project_data_fetch({ did: did });
                }
              });

            // set progress bar back to zero
            component.browser.progress(0);
            component.browser.progress_status("");

            // re-enable button
            $(".browser-continue").toggleClass("disabled", false);
          } else {
            component.tab(4);
            $(".browser-continue").toggleClass("disabled", false);
          }
        } else {
          component.error_messages(error_messages);
        }
        if (component.error_messages().length == 0) {
          if (component.parser() == "slycat-hdf5-parser") {
            component.tab(6);
            this.hdf5_input_browse();
          } else {
            if (component.ps_type() == "local") {
              upload_success(component.browser);
            } else if (component.ps_type() == "remote") {
              upload_success(component.remote);
            }
            component.tab(4);
            $(".browser-continue").toggleClass("disabled", false);
          }
        }
      });
  };

  // Create a model as soon as the dialog loads. We rename, change description and marking later.
  component.create_model();
  component.get_server_file_names();

  component.cancel = function () {
    component.smb_wizard_login_root.unmount();
    if (component.model._id()) {
      client
        .get_project_data_in_model_fetch({
          mid: component.model._id(),
        })
        .then((did) => {
          // if the data id isn't empty
          // delete model first
          client.delete_model_fetch({ mid: component.model._id() }).then(() => {
            // Get list of model ids project data is used in
            if (did.length >= 1) {
              client.get_project_data_parameter_fetch({ did: did, param: "mid" }).then((models) => {
                // if there are no more models using that project data, delete it
                if (models && models.length === 0) {
                  client.delete_project_data_fetch({ did: did });
                }
              });
            }
          });
        });
    }
  };

  const onSelectTableFile = function (path, fileType, file) {
    if (fileType === "f") {
      component.browser.path(path);
    }
  };
  const onSelectParserCallBack = function (ParserName) {
    component.parser(ParserName);
  };
  const onReauth = function () {
    console.log("onReauth");
  };

  const setSmbAuthValues = function (
    hostname,
    username,
    password,
    share,
    domain,
    session_exists,
    last_key,
  ) {
    component.remote.hostname(hostname);
    component.remote.username(username);
    component.remote.password(password);
    component.remote.share(share);
    component.remote.domain(domain);
    component.remote.session_exists(session_exists);
    //If the user hits enter key, try to connect
    if (last_key === "Enter") {
      component.connectSMB();
    }
  };

  component.select_type = function () {
    const selectElementLocal = document.getElementById("slycat-local-browser-file");
    const selectElementRemote = document.getElementById("slycat-remote-browser-files");
    // Local upload - Automatically chooses the parser based on selected file type
    if (selectElementLocal) {
      selectElementLocal.addEventListener("change", (event) => {
        component.file_extension(event.target.files[0]);
        if (typeof event.target.files[0] !== "undefined") {
          let file_name = event.target.files[0].name;
          let file_extension = file_name.split(".")[1];

          if (file_extension == "csv") {
            component.parser("slycat-csv-parser");
          } else if (file_extension == "dat") {
            component.parser("slycat-dakota-parser");
          } else if (file_extension == "h5" || file_extension == "hdf5") {
            component.parser("slycat-hdf5-parser");
          }
        }
      });
    }
    // Remote upload - Automatically chooses the parser based on selected file type
    if (selectElementRemote) {
      selectElementRemote.addEventListener("click", function () {
        if (component.browser.selection().length > 0) {
          if (typeof component.browser.selection()[0] !== "undefined") {
            const file_path = component.browser.selection()[0];
            const split_path = file_path.split("/");
            const file_name = split_path[split_path.length - 1];
            const file_extension = file_name.split(".")[1];

            if (file_extension == "csv") {
              component.parser("slycat-csv-parser");
            } else if (file_extension == "dat") {
              component.parser("slycat-dakota-parser");
            } else if (file_extension == "h5" || file_extension == "hdf5") {
              component.parser("slycat-hdf5-parser");
            }
          }
        }
      });
    }

    var type = component.ps_type();
    component.remote.username(null);
    component.remote.password(null);
    component.remote.hostname(null);
    if (type === "local") {
      component.tab(1);
    } else if (type === "server") {
      component.existing_table();
    } else if (type === "remote") {
      component.tab(2);
    } else if (type === "smb") {
      component.tab(2);
      component.smb_wizard_login_root.render(
        <div>
          <SmbAuthentication loadingData={false} callBack={setSmbAuthValues} />
        </div>,
      );
    }
  };

  var upload_success = function (uploader) {
    uploader.progress(95);
    uploader.progress_status("Finishing...");
    // Don't need to get column headers if HDF5 file
    if (component.parser() == "slycat-hdf5-parser") {
      $(".local-browser-continue").toggleClass("disabled", false);
      uploader.progress(100);
      uploader.progress_status("Finished");
      component.get_error_messages();
    } else {
      client.get_model_command({
        mid: component.model._id(),
        type: "parameter-image",
        command: "media-columns",
        success: function (media_columns) {
          client.get_model_table_metadata({
            mid: component.model._id(),
            aid: "data-table",
            success: function (metadata) {
              uploader.progress(100);
              uploader.progress_status("Finished");
              var attributes = [];
              for (var i = 0; i != metadata["column-names"].length; ++i)
                attributes.push({
                  name: metadata["column-names"][i],
                  type: metadata["column-types"][i],
                  input: false,
                  output: false,
                  category: false,
                  rating: false,
                  image: media_columns.indexOf(i) !== -1,
                  Classification: "Neither",
                  Categorical: false,
                  Editable: false,
                  hidden: media_columns.indexOf(i) !== -1,
                  selected: false,
                  lastSelected: false,
                  disabled: false,
                  tooltip: "",
                });
              mapping.fromJS(attributes, component.attributes);
              // component.get_error_messages();
            },
            error: function (errorThrown) {
              window.alert("There was a fatal error with your CSV.");
            },
          });
        },
      });
    }
  };

  component.existing_table = function () {
    var fileName = component.selected_file();
    component.current_aids(fileName);
    component.get_server_files();
  };

  component.upload_table = function () {
    // cleanup
    document.getElementById("slycat-local-browser-file").removeAttribute("onchange");
    document.getElementById("slycat-remote-browser-files").removeAttribute("onchange");

    // check that a file has been selected
    if (component.browser.selection().length == 0) {
      component.error_messages("You must selected a file before continuing.");
      return;
    }

    // set progress bar to zero
    component.browser.progress(0);
    component.browser.progress_status("");

    // get file data
    $(".local-browser-continue").toggleClass("disabled", true);
    var file = component.browser.selection()[0];
    var fileObject = {
      pid: component.project._id(),
      mid: component.model._id(),
      file: file,
      aids: [["data-table"], file.name],
      parser: component.parser(),
      progress: component.browser.progress,
      progress_status: component.browser.progress_status,
      progress_final: 90,
      success: function () {
        component.get_error_messages();
      },
      error: function () {
        let error_messages = "";

        client
          .get_model_parameter_fetch({
            mid: component.model._id(),
            aid: "error-messages",
          })
          .then((errors) => {
            if (errors.length > 0) {
              for (var i = 0; i < errors.length; i++) {
                error_messages += errors[i] + "\n";
              }
              dialog.ajax_error(error_messages)();
            }
          });

        $(".local-browser-continue").toggleClass("disabled", false);
        component.browser.progress(null);
        component.browser.progress_status("");
      },
    };

    fileUploader.uploadFile(fileObject, component.useProjectData());
  };

  component.hdf5_input_browse = function () {
    const hdf5_wizard_browse_root = createRoot(document.querySelector(".hdf5-wizard-input-browse"));
    hdf5_wizard_browse_root.render(
      <div>
        <HDF5Browser
          onSelectFileCallBack={onSelectTableFile}
          onReauthCallBack={onReauth}
          hostname={component.remote.hostname()}
          pid={component.project._id()}
          mid={component.model._id()}
        />
      </div>,
    );
  };

  component.hdf5_output_browse = function () {
    const hdf5_wizard_browse_root = createRoot(
      document.querySelector(".hdf5-wizard-output-browse"),
    );
    hdf5_wizard_browse_root.render(
      <div>
        <HDF5Browser
          onSelectFileCallBack={onSelectTableFile}
          onReauthCallBack={onReauth}
          hostname={component.remote.hostname()}
          pid={component.project._id()}
          mid={component.model._id()}
        />
      </div>,
    );
  };

  component.connectSMB = function () {
    component.remote.enable(false);
    component.remote.status_type("info");
    component.remote.status("Connecting ...");

    if (component.remote.session_exists()) {
      component.smb_wizard_browse_root.render(
        <div>
          <RemoteFileBrowser
            onSelectFileCallBack={onSelectTableFile}
            onSelectParserCallBack={onSelectParserCallBack}
            onReauthCallBack={onReauth}
            hostname={component.remote.hostname()}
            useSMB={true}
            showSelector={false}
          />
        </div>,
      );
      component.tab(3);
      component.remote.enable(true);
      component.remote.status_type(null);
      component.remote.status(null);
    } else {
      client
        .post_remotes_smb_fetch({
          user_name: component.remote.username().trim(),
          password: component.remote.password(),
          server: component.remote.hostname().trim(),
          share: component.remote.share().trim(),
        })
        .then((response) => {
          console.log("authenticated.", response);
          if (response.ok) {
            component.remote.session_exists(true);
            component.remote.enable(true);
            component.remote.status_type(null);
            component.remote.status(null);
            component.tab(3);
            const smb_wizard_browse_root = createRoot(document.querySelector(".smb-wizard-browse"));
            smb_wizard_browse_root.render(
              <div>
                <RemoteFileBrowser
                  onSelectFileCallBack={onSelectTableFile}
                  onReauthCallBack={onReauth}
                  hostname={component.remote.hostname()}
                  useSMB={true}
                  showSelector={false}
                />
              </div>,
            );
          } else {
            component.remote.enable(true);
            component.remote.status_type("danger");
            component.remote.focus("password");
          }
        })
        .catch((error) => {
          console.log("could not connect", error);
          component.remote.enable(true);
          component.remote.status_type("danger");
          component.remote.status(reason_phrase);
          component.remote.focus("password");
        });
    }
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

  component.load_hdf5_input = function () {
    const file_name = component.browser.path().split("/")[
      component.browser.path().split("/").length - 1
    ];

    let pathInput = component.browser.path();
    pathInput = pathInput.replace(/(?!^)\//g, "-");
    client.post_hdf5_table({
      path: pathInput,
      pid: component.project._id(),
      mid: component.model._id(),
      aids: [["data-table"], file_name],
      success: (results) => {
        console.log("Success!");
        component.tab(7);
        component.hdf5_output_browse();
      },
      error: (results) => {
        console.log("Failure...");
      },
    });
  };

  component.load_hdf5_output = function () {
    const file_name = component.browser.path().split("/")[
      component.browser.path().split("/").length - 1
    ];

    let pathInput = component.browser.path();
    pathInput = pathInput.replace(/(?!^)\//g, "-");
    client.post_hdf5_table({
      path: pathInput,
      pid: component.project._id(),
      mid: component.model._id(),
      aids: [["data-table"], file_name],
      success: (results) => {
        client.post_combine_hdf5_tables({
          mid: component.model._id(),
          success: (results) => {
            if (component.model._id() && component.useProjectData() == false) {
              client
                .get_project_data_in_model_fetch({
                  mid: component.model._id(),
                })
                .then((did) => {
                  // if the data id isn't empty
                  // delete model first
                  // client.delete_model_fetch({ mid: component.model._id() }).then(() => {
                  if (did.length >= 1) {
                    client
                      .get_project_data_parameter_fetch({ did: did, param: "mid" })
                      .then((models) => {
                        // if there are no more models using that project data, delete it
                        client.delete_project_data_fetch({ did: did });
                      });
                  }
                  // });
                });
            }
            component.finish();
          },
        });
      },
      error: (results) => {
        console.log("Failure...");
      },
    });
  };

  component.load_table_smb = function () {
    $(".remote-browser-continue").toggleClass("disabled", true);
    const file_name = component.browser.path().split("/")[
      component.browser.path().split("/").length - 1
    ];
    var fileObject = {
      pid: component.project._id(),
      hostname: [component.remote.hostname()],
      mid: component.model._id(),
      paths: [component.browser.path()],
      aids: [["data-table"], file_name],
      parser: component.parser(),
      progress: component.remote.progress,
      progress_status: component.remote.progress_status,
      progress_final: 90,
      success: function () {
        component.get_error_messages();
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
        component.get_error_messages();
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

  component.set_input = function (attribute) {
    attribute.output(false);
    attribute.category(false);
    attribute.rating(false);
    attribute.image(false);
    return true;
  };

  component.set_output = function (attribute) {
    attribute.input(false);
    attribute.category(false);
    attribute.rating(false);
    attribute.image(false);
    return true;
  };

  component.set_category = function (attribute) {
    attribute.input(false);
    attribute.output(false);
    attribute.rating(false);
    attribute.image(false);
    return true;
  };

  component.set_rating = function (attribute) {
    attribute.input(false);
    attribute.output(false);
    attribute.category(false);
    attribute.image(false);
    return true;
  };

  component.set_image = function (attribute) {
    attribute.input(false);
    attribute.output(false);
    attribute.category(false);
    attribute.rating(false);
    return true;
  };

  component.go_to_model = function () {
    location = server_root + "models/" + component.model._id();
  };

  component.finish = function () {
    var input_columns = [];
    var output_columns = [];
    var rating_columns = [];
    var category_columns = [];
    var image_columns = [];
    for (var i = 0; i != component.attributes().length; ++i) {
      if (component.attributes()[i].Classification() == "Input") input_columns.push(i);
      if (component.attributes()[i].Classification() == "Output") output_columns.push(i);
      if (component.attributes()[i].Categorical()) category_columns.push(i);
      if (component.attributes()[i].Editable()) rating_columns.push(i);
      if (component.attributes()[i].image()) image_columns.push(i);
    }

    if (component.parser() == "slycat-hdf5-parser") {
      client.put_model_parameter({
        mid: component.model._id(),
        aid: "rating-columns",
        value: rating_columns,
        input: true,
        success: function () {
          client.put_model_parameter({
            mid: component.model._id(),
            aid: "category-columns",
            value: category_columns,
            input: true,
            success: function () {
              client.put_model_parameter({
                mid: component.model._id(),
                aid: "image-columns",
                value: image_columns,
                input: true,
                success: function () {
                  component.tab(5);
                },
              });
            },
          });
        },
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
                aid: "rating-columns",
                value: rating_columns,
                input: true,
                success: function () {
                  client.put_model_parameter({
                    mid: component.model._id(),
                    aid: "category-columns",
                    value: category_columns,
                    input: true,
                    success: function () {
                      client.put_model_parameter({
                        mid: component.model._id(),
                        aid: "image-columns",
                        value: image_columns,
                        input: true,
                        success: function () {
                          component.tab(5);
                        },
                      });
                    },
                  });
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

    // Need to unmount smb remote file browser on back button.
    if (component.tab() == 3) {
      component.smb_wizard_browse_root.unmount();
    }

    // Need to clean up project data if backing from tab 4
    if (component.tab() == 4) {
      // Have to get the project data that was just added the current model
      client
        .get_project_data_in_model_fetch({
          mid: component.model._id(),
        })
        .then((did) => {
          // if the data id isn't empty
          if (did[0] !== "") {
            // Remove project data id from model
            client
              .delete_project_data_in_model_fetch({ did: did, mid: component.model._id() })
              .then(() => {
                // Remove model id from project data
                client
                  .delete_model_in_project_data_fetch({ mid: component.model._id(), did: did })
                  .then(() => {
                    // Get the list of models using that project data
                    client
                      .get_project_data_parameter_fetch({ did: did, param: "mid" })
                      .then((models) => {
                        // if there are no more models using that project data, delete it
                        if (models && models.length === 0) {
                          client.delete_project_data_fetch({ did: did });
                        }
                      });
                  });
              });
          }
        });
    }

    // Skip Upload Table tab if we're on the Choose Host tab.
    if (component.tab() == 2) {
      target--;
    }
    // Skip remote ui tabs if we are local
    if (component.ps_type() == "local" && component.tab() == 4) {
      target--;
      target--;
    }
    if (component.ps_type() == "server" && component.tab() == 4) {
      target--;
      target--;
      target--;
    }

    if (component.tab() == 6) {
      target--;
      target--;
      target--;
      target--;
      component.browser.progress(null);
      component.browser.progress_status("");
    }

    if (component.parser() == "slycat-hdf5-parser" && component.tab() == 5) {
      target++;
      target++;
      target++;
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

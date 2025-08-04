import React, { Component } from "react";
import RemoteFileBrowser from "components/FileBrowser/RemoteFileBrowser";
import ProgressBar from "components/ProgressBar.tsx";
import ModalLarge from "components/ModalLarge.tsx";
import ControlsButton from "components/ControlsButton";
import "../../css/controls-button-var-options.css";
import { FileSelector } from "./FileSelector";
import client from "js/slycat-web-client";
import fileUploader from "js/slycat-file-uploader-factory";
import SlycatRemoteControls from "components/SlycatRemoteControls.jsx";
import SlycatSelector from "components/SlycatSelector.tsx";
import ConnectButton from "components/ConnectButton.tsx";
import SlycatFormRadioCheckbox from "components/SlycatFormRadioCheckbox.tsx";
import NavBar from "components/NavBar.tsx";
import Warning from "components/Warning.tsx";
import _ from "lodash";
import checkColumns from "utils/check-columns.ts";
import { SLYCAT_AUTH_LABELS } from "utils/ui-labels";

let initialState = {};
const localNavBar = ["Locate Data", "Upload Table"];
const remoteNavBar = ["Locate Data", "Choose Host", "Select Table"];
const warningMessage = (
  <React.Fragment>
    <h4 className="alert-heading">
      By using this feature, you run the risk of corrupting your models.
    </h4>
    <p className="mt-3">
      Adding, removing, or changing the order of columns is currently not supported.
    </p>
    <p className="mb-0">
      If you do any of these things, it will corrupt all models using this data table.
    </p>
  </React.Fragment>
);

export default class ControlsButtonUpdateTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      modalId: "varUpdateTableModal",
      title: "Update Data Table",
      files: [new File([""], "filename")],
      disabled: true,
      progressBarHidden: true,
      progressBarProgress: 0,
      hostname: "",
      username: "",
      password: "",
      selectedOption: "local",
      visible_tab: "0",
      sessionExists: null,
      reauth: false,
      selected_path: "",
      loadingData: false,
      selectedNameIndex: 0,
      parserType: "slycat-csv-parser",
      currentColumns: [],
      newColumns: [],
      passedColumnCheck: true,
      failedColumnCheckMessage: ["This upload attempt has been rejected.\n"],
    };
    initialState = _.cloneDeep(this.state);
  }

  cleanup = () => {
    this.setState(initialState);
  };

  continue = () => {
    if (this.state.visible_tab === "0" && this.state.selectedOption === "local") {
      this.setState({ visible_tab: "1", selectedNameIndex: 1 });
    } else if (this.state.visible_tab === "0" && this.state.selectedOption === "remote") {
      this.setState({ visible_tab: "2", selectedNameIndex: 1 });
    } else if (this.state.visible_tab === "2") {
      this.setState({ visible_tab: "3", selectedNameIndex: 2 });
    }
  };

  back = () => {
    this.setState({
      failedColumnCheckMessage: ["This upload attempt has been rejected.\n"],
      passedColumnCheck: true,
      progressBarHidden: true,
      progressBarProgress: 0,
    });

    if (this.state.visible_tab === "1") {
      this.setState({ visible_tab: "0", selectedNameIndex: 0 });
    } else if (this.state.visible_tab === "2") {
      this.setState({ visible_tab: "0", selectedNameIndex: 0 });
    } else if (this.state.visible_tab === "3") {
      this.setState({ visible_tab: "2", selectedNameIndex: 1 });
    }
  };

  handleFileSelection = (selectorFiles) => {
    this.setState({ files: selectorFiles, disabled: false });
  };

  controlsCallBack = (newHostname, newUsername, newPassword, sessionExists) => {
    this.setState({
      hostname: newHostname,
      sessionExists: sessionExists,
      username: newUsername,
      password: newPassword,
    });
  };

  sourceSelect = (value) => {
    this.setState({ selectedOption: value });
  };

  uploadFile = () => {
    this.setState({
      failedColumnCheckMessage: ["This upload attempt has been rejected.\n"],
      passedColumnCheck: true,
    });
    this.state.selectedOption == "local" ? this.uploadLocalFile() : this.uploadRemoteFile();
  };

  updateVariableAliases = (mid, variable_aliases) => {
    return client
      .get_project_data_in_model_fetch({
        mid: mid,
      })
      .then((results) => {
        client.put_project_data_parameter({
          did: results[0],
          aid: "variable_aliases",
          input: false,
          value: variable_aliases,
          success: function () {
            location.reload();
          },
        });
      });
  };

  uploadLocalFile = () => {
    let mid = this.props.mid;
    let pid = this.props.pid;
    let variable_aliases = this.props.aliases;
    this.setState({ progressBarHidden: false, disabled: true });

    client
      .get_model_command_fetch({ mid: mid, type: "parameter-image", command: "delete-table" })
      .then((json) => {
        this.setState({ progressBarProgress: 33 });
        let file = this.state.files[0];

        /**
         * Checking the columns of the new CSV to make sure the order is the same, and they didn't add or remove any.
         */
        checkColumns(file, this.state.selectedOption, mid).then((results) => {
          if (results.passed) {
            this.setState({ passedColumnCheck: results.passed });
            let fileObject = {
              pid: pid,
              mid: mid,
              file: file,
              aids: [["data-table"], file.name],
              parser: this.state.parserType,
              success: () => {
                this.setState({ progressBarProgress: 75 });
                client
                  .post_sensitive_model_command_fetch({
                    mid: mid,
                    type: "parameter-image",
                    command: "update-table",
                    parameters: {
                      linked_models: json["linked_models"],
                    },
                  })
                  .then(() => {
                    this.setState({ progressBarProgress: 100 });
                    //this.closeModal();
                    if (Object.keys(variable_aliases).length !== 0) {
                      this.updateVariableAliases(mid, variable_aliases);
                    } else {
                      location.reload();
                    }
                  });
              },
            };
            fileUploader.uploadFile(fileObject);
          } else {
            this.state.failedColumnCheckMessage.push(results.reason);
            this.setState({ passedColumnCheck: results.passed });
          }
        });
      });
  };

  uploadRemoteFile = () => {
    let mid = this.props.mid;
    let pid = this.props.pid;
    let variable_aliases = this.props.aliases;
    this.setState({ progressBarHidden: false, disabled: true });

    client
      .get_remote_file_fetch({ hostname: this.state.hostname, path: this.state.selected_path })
      .then((response) => response.text())
      .then((file) => {
        checkColumns(file, this.state.selectedOption, mid).then((results) => {
          if (results.passed) {
            client
              .get_model_command_fetch({
                mid: mid,
                type: "parameter-image",
                command: "delete-table",
              })
              .then((json) => {
                this.setState({ progressBarProgress: 33 });
                let file = this.state.files;
                const file_name = file.name;
                let fileObject = {
                  pid: pid,
                  hostname: this.state.hostname,
                  mid: mid,
                  paths: this.state.selected_path,
                  aids: [["data-table"], file_name],
                  parser: this.state.parserType,
                  progress_final: 90,
                  success: () => {
                    this.setState({ progressBarProgress: 75 });
                    client
                      .post_sensitive_model_command_fetch({
                        mid: mid,
                        type: "parameter-image",
                        command: "update-table",
                        parameters: {
                          linked_models: json["linked_models"],
                        },
                      })
                      .then(() => {
                        this.setState({ progressBarProgress: 100 });
                        //this.closeModal();
                        if (Object.keys(variable_aliases).length !== 0) {
                          this.updateVariableAliases(mid, variable_aliases);
                        } else {
                          location.reload();
                        }
                      });
                  },
                };
                fileUploader.uploadFile(fileObject);
              });
          } else {
            this.state.failedColumnCheckMessage.push(results.reason);
            this.setState({ passedColumnCheck: results.passed });
          }
        });
      });
  };

  onSelectFile = (selectedPath, selectedPathType, file) => {
    // this.state.selectedPath, this.state.selectedPathType
    // type is either 'd' for directory or 'f' for file
    if (selectedPathType === "f") {
      this.setState({ files: file, disabled: false, selected_path: selectedPath });
    } else {
      this.setState({ disabled: true });
    }
  };

  onSelectParser = (type) => {
    this.setState({ parserType: type });
  };

  onReauth = () => {
    // console.log('onReauth');
    // Session has been lost, so update state to reflect this.
    this.setState({
      sessionExists: false,
      reauth: true,
    });
    // Switch to login controls
    this.setState({ visible_tab: "2", selectedNameIndex: 1 });
  };

  connectButtonCallBack = (sessionExists, loadingData) => {
    this.setState(
      {
        sessionExists,
        loadingData,
        reauth: false,
      },
      () => {
        if (this.state.sessionExists) {
          this.continue();
        }
      },
    );
  };

  /**
   * modal footer
   *
   * @memberof ControlsButtonUpdateTable
   */
  getFooterJSX = () => {
    let footerJSX = [];
    if (this.state.visible_tab != "0") {
      footerJSX.push(
        <button key={1} type="button" className="btn btn-light me-auto" onClick={this.back}>
          Back
        </button>,
      );
    }
    if (this.state.visible_tab === "1" || this.state.visible_tab === "3") {
      footerJSX.push(
        <button
          key={2}
          type="button"
          disabled={this.state.disabled}
          className="btn btn-danger"
          onClick={this.uploadFile}
        >
          Update Data Table
        </button>,
      );
    }
    if (this.state.sessionExists != true && this.state.visible_tab === "2") {
      footerJSX.push(
        <ConnectButton
          key={3}
          text="Continue"
          loadingData={this.state.loadingData}
          hostname={this.state.hostname}
          username={this.state.username}
          password={this.state.password}
          callBack={this.connectButtonCallBack}
        />,
      );
    } else if (this.state.visible_tab != "1" && this.state.visible_tab != "3") {
      footerJSX.push(
        <button key={4} type="button" className="btn btn-primary" onClick={this.continue}>
          Continue
        </button>,
      );
    }
    return footerJSX;
  };
  /**
   * modal body
   * @memberof ControlsButtonUpdateTable
   */
  getBodyJsx = () => {
    const options = [
      {
        text: "Comma separated values (CSV)",
        value: "slycat-csv-parser",
      },
      {
        text: "Dakota tabular",
        value: "slycat-dakota-parser",
      },
    ];
    return (
      <div>
        <Warning warningMessage={warningMessage} backgroundColor={"#FFFF99"} />
        {this.state.selectedOption === "local" ? (
          <NavBar navNames={localNavBar} selectedNameIndex={this.state.selectedNameIndex} />
        ) : (
          <NavBar navNames={remoteNavBar} selectedNameIndex={this.state.selectedNameIndex} />
        )}
        {this.state.visible_tab === "0" ? (
          <form className="ms-3">
            <SlycatFormRadioCheckbox
              checked={this.state.selectedOption === "local"}
              onChange={this.sourceSelect}
              value={"local"}
              text={"Local"}
            />
            <SlycatFormRadioCheckbox
              checked={this.state.selectedOption === "remote"}
              onChange={this.sourceSelect}
              value={"remote"}
              text={"Remote"}
            />
          </form>
        ) : null}

        {this.state.visible_tab === "1" ? (
          <div className="tab-content">
            <div className="form-horizontal">
              <FileSelector handleChange={this.handleFileSelection} />
              <SlycatSelector
                onSelectCallBack={this.props.onSelectParserCallBack}
                label={"Filetype"}
                options={options}
              />
            </div>
          </div>
        ) : null}

        {this.state.visible_tab === "1" && this.state.passedColumnCheck === false ? (
          <Warning warningMessage={this.state.failedColumnCheckMessage} />
        ) : null}

        {this.state.visible_tab === "2" ? (
          <SlycatRemoteControls
            loadingData={this.state.loadingData}
            callBack={this.controlsCallBack}
          />
        ) : null}

        {this.state.visible_tab === "2" && this.state.reauth ? (
          <div className="alert alert-danger" role="alert">
            Oops, your session has disconnected. Please {SLYCAT_AUTH_LABELS.signIn.toLowerCase()}{" "}
            again.
          </div>
        ) : null}

        {/* Hiding progress bar div when progress bar is also hidden,
          otherwise it still takes up vertical space. */}
        {!this.state.progressBarHidden ? (
          <div className="slycat-progress-bar">
            <ProgressBar
              hidden={this.state.progressBarHidden}
              progress={this.state.progressBarProgress}
            />
          </div>
        ) : null}

        {this.state.visible_tab === "3" ? (
          <RemoteFileBrowser
            onSelectFileCallBack={this.onSelectFile}
            onSelectParserCallBack={this.onSelectParser}
            onReauthCallBack={this.onReauth}
            hostname={this.state.hostname}
          />
        ) : null}

        {this.state.visible_tab === "3" && this.state.passedColumnCheck === false ? (
          <Warning warningMessage={this.state.failedColumnCheckMessage} />
        ) : null}
      </div>
    );
  };
  render() {
    return (
      <React.Fragment>
        <ModalLarge
          modalId={this.state.modalId}
          closingCallBack={this.cleanup}
          title={this.state.title}
          body={this.getBodyJsx()}
          footer={this.getFooterJSX()}
        />
        <ControlsButton
          icon="fa-upload"
          title={this.state.title}
          data_toggle="modal"
          data_target={"#" + this.state.modalId}
          button_style={this.props.button_style}
          id="controls-button-death"
        />
      </React.Fragment>
    );
  }
}

'use strict';
import React, { Component } from 'react';
import ProgressBar from 'components/ProgressBar';
import ControlsButton from './controls-button';
import '../../css/controls-button-var-options.css';
import { FileSelector } from './file-selector';
import client from "js/slycat-web-client";
import fileUploader from "js/slycat-file-uploader-factory";
import SlycatRemoteControls from 'components/SlycatRemoteControls';

export default class ControlsButtonUpdateTable extends Component {
  constructor(props) {
      super(props);
      this.state = {
          modalId: "varUpdateTableModal",
          title: "Update Table",
          files: [new File([""], "filename")],
          disabled: true,
          progressBarHidden: true,
          progressBarProgress: 0,
          hostname: "",
          username: "",
          password: "",
          mid: props.mid,
          pid: props.pid,
          selectedOption: "local"
      }
  }

  // const modalId = 'varUpdateTableModal';
  // const title = 'Update Table';
  // const [files, setfiles] = useState([new File([""], "filename")]);
  // const [disabled, setDisabled] = useState(true);
  // const [progressBarHidden, setProgressBarHidden] = useState(true);
  // const [progressBarProgress, setProgressBarProgress] = useState(0);
  //
  // const [hostName, setHostName] = useState("");
  // const [userName, setUserName] = useState("");
  // const [password, setPassword] = useState("");

  // const mid = props.mid;
  // const pid = props.pid;
  // const [selectedOption, setSelectedOption] = useState("local");

  cleanup = () =>
  {
    // setfiles([new File([""], "filename")]);
    // setDisabled(true);
    // setProgressBarHidden(true);
    // setProgressBarProgress(0);
    // setSelectedOption("local");
  };

  closeModal = (e) =>
  {
    this.cleanup();
    $('#' + this.state.modalId).modal('hide');
  };

  handleFileSelection = (selectorFiles) =>
  {
    // setfiles(selectorFiles);
    // setDisabled(false);
  };
  callBack = (newHostName, newUserName, newPassword) => {
      console.log(`hostname ${newHostName}::username${newUserName}Password::${newPassword}`);
      // setPassword(newPassword);
      // setUserName(newUserName);
      // setHostName(newHostName);
      // console.log(`hostname:: ${hostName} username${userName} Password::${password}`)
  };
  sourceSelect = (e) =>
  {
      console.log(e.target.value);
      // setSelectedOption(e.target.value);
      console.log(e);
  };

  uploadFile = () =>
  {
    console.log(files[0].name);
    // setProgressBarHidden(false);
    // setDisabled(true);
    client.get_model_command({
        mid: mid,
        type: "parameter-image",
        command: "delete-table",
        success: function (result_delete) {
            // setProgressBarProgress(33);
            console.log(result_delete);
            var file = files[0];

            var fileObject ={
             // pid: pid,
             mid: mid,
             file: file,
             aids: [["data-table"], file.name],
             parser: "slycat-csv-parser",
             success: function(){
               // setProgressBarProgress(75);
               client.post_sensitive_model_command({
                mid: mid,
                type: "parameter-image",
                command: "update-table",
                parameters: {
                  linked_models: result_delete["linked_models"],
                },
                success: function (result_update) {
                  // setProgressBarProgress(100);
                  console.log(result_update);
                  // this.closeModal();
                  location.reload();
                },
                error: console.log("There was a problem uploading the new data")
              });
             },
             error: function(){
                //dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
                //$('.local-browser-continue').toggleClass("disabled", false);
              }
            };
            fileUploader.uploadFile(fileObject);

          console.log("Success!");
        },
        error: function(){
        console.log("Failure.");
      }
    });
  };
  render() {
    return (
      <div>
        <div className='modal fade' data-backdrop='false' id={this.state.modalId}>
          <div className='modal-dialog'>
            <div className='modal-content'>
              <div className='modal-header'>
                <h3 className='modal-title'>{this.state.title}</h3>
                <button type='button' className='close' data-dismiss='modal' aria-label='Close'>
                </button>
              </div>
              <div className='modal-body'>
              <SlycatRemoteControls callBack={this.callBack}/>
              <div className='radio'>
                <label>
                  <input type='radio' value='local' checked={this.state.selectedOption === 'local'} onChange={this.sourceSelect}/>
                  Local {this.state.selectedOption === 'local' ? this.state.selectedOption: ''}
                </label>
                <label>
                  <input type='radio' value='remote' checked={this.state.selectedOption === 'remote'} onChange={this.sourceSelect}/>
                  Remote {this.state.selectedOption === 'remote' ? this.state.selectedOption: ''}
                </label>
              </div>
                <FileSelector handleChange = {this.handleFileSelection} />
              </div>
              <div className='slycat-progress-bar'>
                <ProgressBar
                  hidden={this.state.progressBarHidden}
                  progress={this.state.progressBarProgress}
                />
              </div>
              <div className='modal-footer'>
                <button type='button' disabled={this.state.disabled} className='btn btn-danger' onClick={this.uploadFile}>
                Update Data Table
                </button>
                <button type='button' className='btn btn-primary' onClick={this.closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
        <ControlsButton label='Update Table' title={this.state.title} data_toggle='modal' data_target={'#' + this.state.modalId}
                        button_style={this.props.button_style} id='controls-button-death' />
      </div>
    );
  };
}

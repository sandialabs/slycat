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
    this.setState({files:selectorFiles,disabled:false});
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
      this.setState({selectedOption:e.target.value});
  };

  uploadFile = () =>
  {
    let mid = this.props.mid;
    let pid = this.props.pid;
    this.setState({progressBarHidden:false,disabled:true});

    client.get_model_command_fetch({mid:mid, type:"parameter-image",command: "delete-table"})
        .then((json)=>{
            this.setState({progressBarProgress:33});
            let file = this.state.files[0];
            let fileObject ={
             pid: pid,
             mid: mid,
             file: file,
             aids: [["data-table"], file.name],
             parser: "slycat-csv-parser",
             success: () => {
                   this.setState({progressBarProgress:75});
                   client.post_sensitive_model_command_fetch(
                    {
                        mid:mid,
                        type:"parameter-image",
                        command: "update-table",
                        parameters: {
                          linked_models: json["linked_models"],
                        },
                    }).then(() => {
                        this.setState({progressBarProgress:100});
                        this.closeModal();
                        location.reload();
                    });
                }
            };
            fileUploader.uploadFile(fileObject);
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

              <div className='radio'>
                <label>
                  <input type='radio' value='local' checked={this.state.selectedOption === 'local'} onChange={this.sourceSelect}/>
                  Local
                </label>
                <label>
                  <input type='radio' value='remote' checked={this.state.selectedOption === 'remote'} onChange={this.sourceSelect}/>
                  Remote
                </label>
              </div>
                {this.state.selectedOption === 'remote'?<SlycatRemoteControls callBack={this.callBack}/>:
                    <FileSelector handleChange = {this.handleFileSelection} />}
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
  }
}

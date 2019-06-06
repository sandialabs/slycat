'use strict';
import React, { Component } from 'react';
import RemoteFileBrowser from 'components/RemoteFileBrowser.tsx'
import ProgressBar from 'components/ProgressBar.tsx';
import ModalLarge from 'components/ModalLarge.tsx';
import ControlsButton from 'components/ControlsButton';
import '../../css/controls-button-var-options.css';
import { FileSelector } from './file-selector';
import client from "js/slycat-web-client";
import fileUploader from "js/slycat-file-uploader-factory";
import SlycatRemoteControls from 'components/SlycatRemoteControls.jsx';
import SlycatSelector from 'components/SlycatSelector.tsx';
import ConnectButton from 'components/ConnectButton.tsx';
import SlycatFormRadioCheckbox from 'components/SlycatFormRadioCheckbox.tsx';
import NavBar from 'components/NavBar.tsx';
import Warning from 'components/Warning.tsx';
import _ from "lodash";

let initialState={};
const localNavBar = ['Locate Data', 'Upload Table'];
const remoteNavBar = ['Locate Data', 'Choose Host', 'Select Table'];
const warningMessage = ['Warning: By using this feature, you run the risk of corrupting your models.\n',
  'ADDING, REMOVING, OR CHANGING THE ORDER OF COLUMNS IS CURRENTLY NOT SUPPORTED.\n',
  'IF YOU DO ANY OF THESE THINGS, IT WILL CORRUPT ALL MODELS USING THIS DATA TABLE.\n'];

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
      selectedOption: "local",
      visible_tab: "0",
      sessionExists: null,
      selected_path: "",
      loadingData: false,
      selectedNameIndex: 0,
      parserType: "slycat-csv-parser",
      currentColumns: [],
      newColumns: [],
      passedColumnCheck: true,
      failedColumnCheckMessage: ['This upload attempt has been rejected.\n'],
    }
    initialState = _.cloneDeep(this.state);
  }

  cleanup = () =>
  {
    this.setState(initialState);
  };

  continue = () =>
  {
    if (this.state.visible_tab === "0" && this.state.selectedOption === "local")
    {
      this.setState({visible_tab: "1", selectedNameIndex: 1});
    }
    else if (this.state.visible_tab === "0" && this.state.selectedOption === "remote")
    {
      this.setState({visible_tab: "2", selectedNameIndex: 1});
    }
    else if (this.state.visible_tab === "2")
    {
      this.setState({visible_tab: "3", selectedNameIndex: 2});
    }
  };

  back = () => {
    if (this.state.visible_tab === "1") {
      this.setState({visible_tab: "0", selectedNameIndex: 0});
    }
    else if (this.state.visible_tab === "2") {
      this.setState({visible_tab: "0", selectedNameIndex: 0});
    }
    else if (this.state.visible_tab === "3")
    {
      this.setState({visible_tab: "2", selectedNameIndex: 1});
    }
  }

  handleFileSelection = (selectorFiles) =>
  {
    this.setState({files:selectorFiles,disabled:false});
  };

  controlsCallBack = (newHostname, newUsername, newPassword, sessionExists) => {
    this.setState({
      hostname: newHostname,
      sessionExists: sessionExists,
      username: newUsername,
      password: newPassword
    });
  };

  sourceSelect = (value) =>
  {
    this.setState({selectedOption:value});
  };

  uploadFile = () =>
  {
    this.state.selectedOption == "local"?
      this.uploadLocalFile():
      this.uploadRemoteFile();
  }

  checkColumns = (file) =>
  {
    let reader = new FileReader();

    reader.onload = (e) => {

      /**
       * Reads in the file being selected for upload, splits on '\n' to get the first row, which contains the column names.
       * Then splits on ',' to get the individual column names.
       */
      let column_row = e.target.result.split('\n');
      let columns = column_row[0].split(',');
      this.setState({newColumns: columns});
    };
    reader.readAsText(file);

    return client.get_model_table_metadata_fetch({mid: this.props.mid, aid: "data-table"}).then((json)=>{
      let passed = true;
      let reason = "";
      this.setState({currentColumns: json["column-names"]});

      if(this.state.currentColumns.length !== this.state.newColumns.length) {
        passed = false;
        reason = "csv-length";
      }
      else {
        this.state.currentColumns.forEach((column, i) => {
          if (column !== this.state.newColumns[i]) {
            passed = false;
            reason = "csv-order";
          }
        });
      }

      switch(reason) {
        case "csv-length":
          this.state.failedColumnCheckMessage.push('The CSV you have attempted to upload does not have the same number of columns ' +
            'as the CSV currently being used by the model.\n');
          break;
        case "csv-order":
          this.state.failedColumnCheckMessage.push('The CSV you have attempted to upload has a different order of columns ' +
            'than the CSV currently being used by the model.\n');
          break;
        default:
          throw new Error("bad case");
      }
      this.setState({passedColumnCheck: passed});
      return passed;
    })
  };

  uploadLocalFile = () =>
  {
    let mid = this.props.mid;
    let pid = this.props.pid;
    this.setState({progressBarHidden:false,disabled:true});

    client.get_model_command_fetch({mid:mid, type:"parameter-image",command: "delete-table"})
      .then((json)=>{
        this.setState({progressBarProgress:33});
        let file = this.state.files[0];

        /**
         * Checking the columns of the new CSV to make sure the order is the same, and they didn't add or remove any.
         */
        this.checkColumns(file).then((passed)=>{
          if(passed) {
            let fileObject = {
              pid: pid,
              mid: mid,
              file: file,
              aids: [["data-table"], file.name],
              parser: this.state.parserType,
              success: () => {
                this.setState({progressBarProgress: 75});
                client.post_sensitive_model_command_fetch(
                  {
                    mid: mid,
                    type: "parameter-image",
                    command: "update-table",
                    parameters: {
                      linked_models: json["linked_models"],
                    },
                  }).then(() => {
                  this.setState({progressBarProgress: 100});
                  this.closeModal();
                  location.reload();
                });
              }
            };
            fileUploader.uploadFile(fileObject);
          }
        });

      });
  };

  uploadRemoteFile = () => {
    let mid = this.props.mid;
    let pid = this.props.pid;
    this.setState({progressBarHidden:false,disabled:true});

    client.get_model_command_fetch({mid:mid, type:"parameter-image",command: "delete-table"})
      .then((json)=>{
        this.setState({progressBarProgress:33});
        let file = this.state.files;
        const file_name = file.name;
        let fileObject ={
          pid: pid,
          hostname: this.state.hostname,
          mid: mid,
          paths: this.state.selected_path,
          aids: [["data-table"], file_name],
          parser: this.state.parserType,
          progress_final: 90,
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
  }

  onSelectFile = (selectedPath, selectedPathType, file) => {
    // this.state.selectedPath, this.state.selectedPathType
    // type is either 'd' for directory or 'f' for file
    if(selectedPathType === 'f') {
      this.setState({files:file, disabled:false, selected_path:selectedPath});
    }
    else {
      this.setState({disabled:true});
    }
  }

  onSelectParser = (type) => {
    this.setState({parserType:type});
  }

  connectButtonCallBack = (sessionExists, loadingData) => {
    this.setState({
      sessionExists,
      loadingData
    },()=>{
      if(this.state.sessionExists){
        this.continue();
      }
    });
  }

  /**
   * modal footer
   *
   * @memberof ControlsButtonUpdateTable
   */
  getFooterJSX = () => {
    let footerJSX = [];
    if(this.state.visible_tab != "0"){
      footerJSX.push(
      <button key={1} type='button' className='btn btn-light mr-auto' onClick={this.back}>
        Back
      </button>
      );
    }
    if (this.state.visible_tab === "1" || this.state.visible_tab === "3") {
      footerJSX.push(
        <button key={2} type='button' disabled={this.state.disabled} className='btn btn-danger' onClick={this.uploadFile}>
        Update Data Table
        </button>
      );
    }
    if (this.state.sessionExists != true && this.state.visible_tab === "2") { 
      footerJSX.push(            
        <ConnectButton
          key={3}
          text="Continue"
          loadingData={this.state.loadingData}
          hostname = {this.state.hostname}
          username = {this.state.username}
          password = {this.state.password}
          callBack = {this.connectButtonCallBack}
        />
      );
    } else if (this.state.visible_tab != "1" && this.state.visible_tab != "3") {
      footerJSX.push( 
        <button key={4} type='button' className='btn btn-primary' onClick={this.continue}>
        Continue
        </button>
      )
    }
    return footerJSX;
  }
  /**
   * modal body
   * @memberof ControlsButtonUpdateTable
   */
  getBodyJsx = () => {
    const options = [{
      text:'Comma separated values (CSV)',
      value:'slycat-csv-parser'
    },
    {
      text:'Dakota tabular',
      value:'slycat-dakota-parser'
    }];
    return (
    <div>
      <Warning warningMessage={warningMessage} backgroundColor={'#FFFF99'}/>
      {this.state.selectedOption === 'local'?
      <NavBar navNames ={localNavBar} selectedNameIndex={this.state.selectedNameIndex} />:
      <NavBar navNames ={remoteNavBar} selectedNameIndex={this.state.selectedNameIndex} />}
      {this.state.visible_tab === "0" ?
        <form style={{marginLeft: '16px'}}>
          <SlycatFormRadioCheckbox
            checked={this.state.selectedOption === 'local'}
            onChange={this.sourceSelect}
            value={'local'}
            text={'Local'}
            style={{marginRight: '92%'}}
          />
          <SlycatFormRadioCheckbox
            checked={this.state.selectedOption === 'remote'}
            onChange={this.sourceSelect}
            value={'remote'}
            text={'Remote'}
            style={{marginRight: '89.7%'}}
          />
        </form>
        :null}

      {this.state.visible_tab === "1"?
      <div className='tab-content'>
        <div className="form-horizontal">
          <FileSelector handleChange = {this.handleFileSelection} />
          <SlycatSelector
            onSelectCallBack={this.props.onSelectParserCallBack}
            label={'Filetype'}
            options={options}
          />
        </div>
      </div>:null}

      {this.state.visible_tab === "1" && this.state.passedColumnCheck === false ?
        <Warning warningMessage={this.state.failedColumnCheckMessage}/>
      :null}

      {this.state.visible_tab === "2"?
      <SlycatRemoteControls
      loadingData={this.state.loadingData} 
      callBack={this.controlsCallBack}
      />
      :null}

      <div className='slycat-progress-bar'>
        <ProgressBar
          hidden={this.state.progressBarHidden}
          progress={this.state.progressBarProgress}
        />
      </div>

      {this.state.visible_tab === "3" ?
        <RemoteFileBrowser 
        onSelectFileCallBack={this.onSelectFile}
        onSelectParserCallBack={this.onSelectParser}
        hostname={this.state.hostname} 
        />:
      null}
    </div>
    );
  }
  render() {
    return (
      <div>
        <ModalLarge
          modalId = {this.state.modalId}
          closingCallBack = {this.cleanup}
          title = {this.state.title}
          body={this.getBodyJsx()}
          footer={this.getFooterJSX()}
        />
        <ControlsButton 
          label='Update Table' 
          title={this.state.title} 
          data_toggle='modal' 
          data_target={'#' + this.state.modalId}
          button_style={this.props.button_style} id='controls-button-death'
        />
      </div>
    );
  }
}

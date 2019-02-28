'use strict';
import React, { useState } from 'react';
import ControlsButton from './controls-button';
import '../../css/controls-button-var-options.css';
import { FileSelector } from './file-selector';
import client from "js/slycat-web-client";

export default function ControlsButtonUpdateTable(props) {
  const modalId = 'varUpdateTableModal';
  const title = 'Update Table';
  const [files, setfiles] = useState([new File([""], "filename")]);
  const [disabled, setDisabled] = useState(true);
  const mid = props.mid;

  const cleanup = () =>
  {
    setfiles([new File([""], "filename")]);
    setDisabled(true);
  };

  const closeModal = (e) =>
  {
    cleanup();
    $('#' + modalId).modal('hide');
  };

  const handleFileSelection = (selectorFiles) =>
  {
    setfiles(selectorFiles);
    setDisabled(false);
  };

  const uploadFile = () => 
  {
    console.log(files[0].name);

    client.get_model_command({
        mid: mid,
        type: "parameter-image",
        command: "update-table",
        success: function (result) {
          console.log(result);
          console.log("Success!");
        },
        error: function(){
        console.log("Failure.");
      }
    });

    closeModal();
  };

  return (
    <React.Fragment>
      <div className='modal fade' data-backdrop='false' id={modalId}>
        <div className='modal-dialog'>
          <div className='modal-content'>
            <div className='modal-header'>
              <h3 className='modal-title'>{title}</h3>
              <button type='button' className='close' data-dismiss='modal' aria-label='Close'>
              </button>
            </div>
            <div className='modal-body'>
              <FileSelector handleChange = {handleFileSelection} />
            </div>
            <div className='modal-footer'>
              <button type='button' disabled={disabled} className='btn btn-danger' onClick={uploadFile}>
               Update Data Table
              </button>
              <button type='button' className='btn btn-primary' onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <ControlsButton label='Update Table' title={title} data_toggle='modal' data_target={'#' + modalId} button_style={props.button_style} id='controls-button-death' />
    </React.Fragment>
  );
}

import React, { useState } from "react";
import ControlsButton from './controls-button';
import ko from "knockout";
import "../../css/controls-button-var-options.css";
import FileSelector from './file-selector';

export default function ControlsButtonUpdateTable(props) {
  const modalId = 'varUpdateTableModal';
  const title = 'Update Table';

  function closeModal(e) {
    $('#' + modalId).modal('hide');
  }

  return (
    <React.Fragment>
      <div className="modal fade" data-backdrop="false" id={modalId}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{title}</h3>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              </button>
            </div>
            <div className="modal-body">
              <FileSelector/>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <ControlsButton label="Update Table" title={title} data_toggle="modal" data_target={'#' + modalId} button_style={props.button_style} id="controls-button-var-options" />
    </React.Fragment>
  );
}

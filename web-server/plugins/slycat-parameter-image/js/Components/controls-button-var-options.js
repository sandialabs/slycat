import Papa from "papaparse";
import api_root from "js/slycat-api-root";
import _ from "lodash";
import {dialog} from "js/slycat-dialog";
import React, { useState } from "react";
import ControlsButton from './controls-button';
import "js/slycat-table-ingestion";
import ko from "knockout";
import "../../css/controls-button-var-options.css";

export default function ControlsButtonVarOptions(props) {
  const modalId = 'varOptionsModal';

  function closeModal(e) {
    $('#' + modalId).modal('hide');
  }

  function apply(e) {
    $('#' + modalId).modal('hide');
  }

  let axes_variables = [];
  for(let axes_variable of props.axes_variables)
  {
    axes_variables.push({
      'Axis Type': 'Linear',
      disabled: false,
      hidden: false,
      lastSelected: false,
      name: axes_variable.name,
      selected: false,
      tooltip: '',
    });
  }

  const fonts = [
    {name: "Arial", fontFamily: "Arial", },
    {name: "Arial Black", fontFamily: "Arial Black", },
    {name: "Courier", fontFamily: "Courier", },
    {name: "Courier New", fontFamily: "Courier New", },
    {name: "Georgia", fontFamily: "Georgia", },
    {name: "Tahoma", fontFamily: "Tahoma", },
    {name: "Times", fontFamily: "Times", },
    {name: "Times New Roman", fontFamily: "Times New Roman", },
    {name: "Trebuchet MS", fontFamily: "Trebuchet MS", },
    {name: "Verdana", fontFamily: "Verdana", },
  ];

  const fontItems = fonts.map((font, index) =>
    <li key={index} style={{fontFamily: font.fontFamily}}><a href="#">{font.name}</a></li>
  );

  return (
    <React.Fragment>
      <ControlsButton icon="fa-cog" title="Set Variable Options" data_toggle="modal" data_target={'#' + modalId} />
      <div className="modal fade" data-backdrop="static" id={modalId}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Edit Axes Scales</h3>
            </div>
            <div className="modal-body">
              <div className="slycat-axes-font">
                <div className="form-inline">
                  <div className="form-group">
                    <label htmlFor="font-family">Font</label>
                    <div className="dropdown font-family-dropdown">
                      <button className="btn btn-default dropdown-toggle" type="button" id="font-family" 
                        data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
                        Arial
                        <span className="caret"></span>
                      </button>
                      <ul className="dropdown-menu" aria-labelledby="dropdownMenu1">
                        {fontItems}
                      </ul>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="font-size">Size</label>
                    <input type="number" className="form-control" id="font-size"  max="40" min="6" step="1" 
                      value={props.font_size} 
                      onChange={props.onFontSizeChange}
                    />
                  </div>
                </div>
              </div>
              <hr />
              <slycat-table-ingestion 
                params={`variables: ` + JSON.stringify(axes_variables) + `,
                        properties: [
                          {name: 'Axis Type', type: 'select', values: ['Linear','Date & Time','Log']}
                        ]`}
              ></slycat-table-ingestion>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-default" onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={apply}>
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

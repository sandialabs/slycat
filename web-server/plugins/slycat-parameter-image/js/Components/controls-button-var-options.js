import React, { useState } from "react";
import ControlsButton from './controls-button';
import SlycatTableIngestion from "js/slycat-table-ingestion-react";
import "js/slycat-table-ingestion";
import ko from "knockout";
import "../../css/controls-button-var-options.css";

export default function ControlsButtonVarOptions(props) {
  const modalId = 'varOptionsModal';
  const title = 'Edit Axes Scales';

  function closeModal(e) {
    $('#' + modalId).modal('hide');
  }

  let axes_variables = [];
  for(let [index, axes_variable] of props.axes_variables.entries())
  {
    let scale_type = 'Linear';
    if(props.axes_variables_scale[index] !== undefined)
    {
      scale_type = props.axes_variables_scale[index];
    }
    axes_variables.push({
      'Axis Type': scale_type,
      // 'Alex Testing Bool True': true,
      // 'Alex Testing Bool False': false,
      disabled: false,
      hidden: false,
      lastSelected: false,
      name: axes_variable.name,
      selected: false,
      tooltip: '',
    });
  }
  // Testing various properties
  // axes_variables[1].disabled = true;
  // axes_variables[1].tooltip = 'Alex Testing Tooltip';

  let axes_properties = [{name: 'Axis Type', 
                          type: 'select', 
                          values: ['Linear','Date & Time','Log']
                        }];
  // // Testing boolean property
  // axes_properties.push({
  //   name: 'Alex Testing Bool True',
  //   type: 'bool',
  // });
  // // Testing boolean property
  // axes_properties.push({
  //   name: 'Alex Testing Bool False',
  //   type: 'bool',
  // });

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
    <li key={index} 
      style={{fontFamily: font.fontFamily}} 
      className={font.fontFamily == props.font_family ? 'active' : 'notactive'}
    >
      <a href="#" onClick={props.onFontFamilyChange}>{font.name}</a>
    </li>
  );

  return (
    <React.Fragment>
      <ControlsButton icon="fa-cog" title={title} data_toggle="modal" data_target={'#' + modalId} />
      <div className="modal fade" data-backdrop="static" id={modalId}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{title}</h3>
            </div>
            <div className="modal-body">
              <div className="slycat-axes-font">
                <div className="form-inline">
                  <div className="form-group">
                    <label htmlFor="font-family">Font</label>
                    <div className="dropdown font-family-dropdown">
                      <button className="btn btn-default dropdown-toggle" type="button" id="font-family" 
                        data-toggle="dropdown" aria-haspopup="true" aria-expanded="true" style={{fontFamily: props.font_family}}>
                        {props.font_family}
                        <span className="caret"></span>
                      </button>
                      <ul className="dropdown-menu" aria-labelledby="dropdownMenu1">
                        {fontItems}
                      </ul>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="font-size">Size</label>
                    <input type="number" className="form-control" id="font-size" max="40" min="6" step="1" 
                      value={props.font_size} 
                      onChange={props.onFontSizeChange}
                    />
                  </div>
                </div>
              </div>
              <hr />
              <slycat-table-ingestion 
                params={`variables: ${JSON.stringify(axes_variables)},
                        properties: ${JSON.stringify(axes_properties)}`}
              ></slycat-table-ingestion>
              <SlycatTableIngestion 
                variables={axes_variables}
                properties={axes_properties}
                onChange={props.onAxesVariableScaleChange}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

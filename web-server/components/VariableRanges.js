import React, { useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import css from "css/slycat-variable-alias-labels.scss";

export default function VariableAliasLabels(props) {

  let names = props.metadata['column-names'];
  let types = props.metadata['column-types'];
  let alias, aliasLength;
  let width = '60px';
  let text_align = 'text-center';

  function getVariableAlias(index) {
    let alias = names[index];
    if(props.variableAliases[index] !== undefined)
    {
      alias = props.variableAliases[index];
    }
    return alias;
  }

  return (
    <div className={`slycat-variable-alias-labels ${props.uniqueID}`}>
      <table className='table table-striped table-hover table-sm table-borderless'>
        <thead>
          <tr>
            <th scope='col' className='align-top' />
            <th scope='col' className={`align-top ${text_align}`}>Data Min</th>
            <th scope='col' className={`align-top ${text_align}`}>Axis Min</th>
            <th scope='col' className={`align-top ${text_align}`}>Axis Max</th>
            <th scope='col' className={`align-top ${text_align}`}>Data Max</th>
          </tr>
        </thead>
        <tbody>
        {
          names.map((variable, index) => {
            let alias = getVariableAlias(index);
            let type = types[index];
            aliasLength = alias.length;
            // Only show non-string variables
            if (type != 'string')
            {
              return (
                <tr key={index}>
                  <th scope='row' className='col-form-label-sm align-middle variable-name'>{alias}</th>
                  <td className={`align-middle ${text_align}`}
                    // className={`${minLength <= aliasLength && aliasLength <= maxLength  ? '' : 'was-validated'}`}
                  >
                    {/* <input type='text' className='form-control form-control-sm variable-alias'
                      required
                      name={index}
                      defaultValue={alias} 
                      onChange={props.onChange} />
                    <div className='invalid-feedback'>
                      Please enter a number betweeen {min} and {max}.
                    </div> */}
                    {props.table_statistics[index].min}
                  </td>
                  <td className={`${text_align}`}>
                    <div className='input-group input-group-sm'>
                      <input type='number' className='form-control form-control-sm axis-min' style={{width: width}}
                        // min={MIN_UNSELECTED_POINT_SIZE}
                        // max={MAX_UNSELECTED_POINT_SIZE} 
                        // step={POINT_SIZE_STEP} 
                        // value={this.props.unselected_point_size} 
                        // onChange={this.props.setUnselectedPointSize}
                      />
                      <div className='input-group-append'>
                        <button className='btn btn-outline-secondary' type='button'>
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td 
                    className={`${text_align} was-validated`}
                    style={{position: 'relative'}}
                  >
                    <div className='input-group input-group-sm'>
                      <input 
                        type='number' 
                        className='form-control form-control-sm axis-max' 
                        style={{width: width}}
                        required
                        data-toggle='tooltip' data-placement='right' title='Tooltip on right'
                        // min={MIN_UNSELECTED_POINT_SIZE}
                        // max={MAX_UNSELECTED_POINT_SIZE} 
                        // step={POINT_SIZE_STEP} 
                        // value={this.props.unselected_point_size} 
                        // onChange={this.props.setUnselectedPointSize}
                      />
                      <div className='input-group-append'>
                        <button className='btn btn-outline-secondary' type='button' disabled>
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className={`align-middle ${text_align}`}>
                    {props.table_statistics[index].max}
                  </td>
                </tr>
              )
            }
            
          })
        }
        </tbody>
      </table>
    </div>
  );
}
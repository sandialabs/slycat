import React, { useState } from "react";
import css from "css/slycat-variable-alias-labels.scss";

export default function VariableAliasLabels(props) {

  let variables = props.metadata['column-names'];
  let minLength = 1;
  let maxLength = 256;
  let alias, aliasLength;

  function getVariableAlias(index) {
    let alias = variables[index];
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
            <th scope='col' className='align-top'>Name</th>
            <th scope='col' className='align-top'>Label</th>
          </tr>
        </thead>
        <tbody>
        {
          variables.map((variable, index) => {
            alias = getVariableAlias(index);
            aliasLength = alias.length;
            return (
              <tr key={index}>
                <th scope='row' className='col-form-label-sm align-middle variable-name'>{variable}</th>
                <td className={`${minLength <= aliasLength && aliasLength <= maxLength  ? '' : 'was-validated'}`}>
                    <input type='text' className='form-control form-control-sm variable-alias'
                      minLength={minLength} 
                      maxLength={maxLength}
                      required
                      name={index}
                      defaultValue={alias} 
                      onChange={props.onChange} />
                    <div className='invalid-feedback'>
                      Please enter a label betweeen {minLength} and {maxLength} characters long.
                    </div>
                </td>
              </tr>
            )
          })
        }
        </tbody>
      </table>
    </div>
  );
}
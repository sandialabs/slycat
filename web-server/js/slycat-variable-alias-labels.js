import React, { useState } from "react";
import css from "css/slycat-variable-alias-labels.scss";

export default function SlycatVariableAliasLabels(props) {

  let variables = props.metadata['column-names'];

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
            return (
              <tr key={index}>
                <th scope='row' className='col-form-label-sm align-middle variable-name'>{variable}</th>
                <td>
                    <input className='form-control form-control-sm variable-alias' type='text' defaultValue={variable} />
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
import React, { useState } from "react";

export default function SlycatVariableAliasLabels(props) {

  let variables = props.metadata['column-names'];

  return (
    <div className={`slycat-variable-alias-labels ${props.uniqueID}`}>
      <table className="table table-striped table-hover table-sm table-borderless">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Label</th>
          </tr>
        </thead>
        <tbody>
        {
          variables.map((variable, index) => {
            return (
              <tr key={index}>
                <th scope="row">{variable}</th>
                <td>
                  <input className="form-control form-control-sm" type="text" defaultValue={variable} />
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
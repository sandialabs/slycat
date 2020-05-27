import React from "react";
import css from "css/slycat-variable-alias-labels.scss";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons'

export default function VariableAliasLabels(props) {

  let variables = props.metadata['column-names'];

  let clearLabel = (event) => {
    let index = event.currentTarget.name;
    let input = document.querySelector(`.slycat-variable-alias-labels input[name='${index}'`);
    input.value = '';
    props.onChange(event);
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
            let userInput = props.variableAliases[index] != undefined;
            return (
              <tr key={index}>
                <th scope='row' className='align-middle variable-name'>{variable}</th>
                <td>
                <div className='input-group input-group-sm'>
                    <input type='text' 
                      className={`form-control form-control-sm variable-alias 
                        ${userInput ? 'contains-user-input' : ''}`}
                      minLength='0' 
                      maxLength='256'
                      name={index}
                      defaultValue={props.variableAliases[index]} 
                      placeholder={variables[index]}
                      onChange={props.onChange} />
                    <div className='input-group-append'>
                      <button 
                        className='btn btn-outline-secondary' 
                        type='button'
                        title='Clear alias label.'
                        name={index}
                        value=''
                        disabled={!userInput}
                        onClick={clearLabel}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
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
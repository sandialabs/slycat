import React from "react";
import { connect } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faLessThan } from '@fortawesome/free-solid-svg-icons'
import css from "css/slycat-variable-ranges.scss";
import $ from 'jquery';

class VariableRanges extends React.Component {
  constructor(props) {
    super(props);

    let inputsArray = props.numericVariables.map((variable, index) => {
      return {
        [this.getName(variable.index, true)] : '',
        [`${this.getName(variable.index, true)}_valid`] : true,
        [this.getName(variable.index, false)] : '',
        [`${this.getName(variable.index, false)}_valid`] : true,
      }
    });

    let inputObject = Object.assign(...inputsArray);

    this.state = inputObject;

    this.names = props.metadata['column-names'];
    this.types = props.metadata['column-types'];
    this.width = '60px';
    this.text_align = 'text-center';
    this.class = 'slycat-variable-ranges';
  }

  componentDidMount() {
    // Enabling popover tooltips. Used for validation.
    $(`.${this.class} .lessThanValidationMessage[data-toggle="popover"]`).popover({
      // Specifying custom popover template to make text red by adding text-danger class.
      template: `
        <div class="popover" role="tooltip">
          <div class="arrow"></div>
          <h3 class="popover-header"></h3>
          <div class="popover-body text-danger"></div>
        </div>`
    })
  }

  getName = (index, minBool) => {
    return `${minBool ? 'min' : 'max'}_${index}`;
  }

  getVariableAlias = (index) => {
    let alias = this.names[index];
    if(this.props.variableAliases[index] !== undefined)
    {
      alias = this.props.variableAliases[index];
    }
    return alias;
  }

  handleChange = (event) => {
    let name = event.currentTarget.name;
    let inputString = event.currentTarget.value.trim();
    this.setState((previousState, props) => ({
      [name]: inputString,
      ...this.validateMinAndMax(name, inputString, previousState, props)
    }));
  }

  validateMinAndMax = (name, inputString, previousState, props) => {
    let index = name.slice(4);
    let min = name.startsWith('min');
    let inputNum = parseFloat(inputString);
    let prefix = min ? 'min' : 'max';
    let oppositePrefix = min ? 'max' : 'min';
    let oppositeName = `${oppositePrefix}${name.slice(3)}`;
    let oppositeInput = previousState[oppositeName];
    let oppositeNum = parseFloat(previousState[oppositeName]);
    let data = parseFloat(props.table_statistics[index][oppositePrefix]);
    let oppositeData = parseFloat(props.table_statistics[index][oppositePrefix]);
    let compare = oppositeInput == '' || Number.isNaN(oppositeNum) ? oppositeData : oppositeNum;
    let oppositeCompare = inputString == '' || Number.isNaN(inputNum) ? data : inputNum;
    
    // console.log(`opposite validity is: ${oppositeValidity}`);

    return {
      [`${name}_valid`]: this.validateMinOrMax(inputString, inputNum, min, compare),
      [`${oppositeName}_valid`]: this.validateMinOrMax(oppositeInput, oppositeNum, !min, oppositeCompare)
    };

  }

  validate = (inputString, inputNum, min, compare) => {
    // Empty field is always valid because the data value overrides it
    if(inputString == '')
    {
      return true;
    }
    // NaNs are invalid
    else if(Number.isNaN(inputNum))
    {
      return false;
    }
    else if(min ? inputNum < compare : inputNum > compare)
    {
      return true;
    }
    return false;
  }

  render() {
    return (
      <div className={`${this.class} ${this.props.uniqueID}`}>
        {/* <div className='alert alert-danger' role='alert'>
          Axis Min must be less than Axis Max.
        </div> */}
        <table className='table table-striped table-hover table-sm table-borderless'>
          <thead>
            <tr>
              <th scope='col' className='align-top' />
              <th scope='col' className={`align-top ${this.text_align}`}>Data Min</th>
              <th scope='col' className={`align-top ${this.text_align}`}>Axis Min</th>
              <th scope='col' className={`align-top ${this.text_align}`} />
              <th scope='col' className={`align-top ${this.text_align}`}>Axis Max</th>
              <th scope='col' className={`align-top ${this.text_align}`}>Data Max</th>
            </tr>
          </thead>
          <tbody>
          {
            this.props.numericVariables.map((variable, index) => {
                let minName = this.getName(variable.index, true);
                let maxName = this.getName(variable.index, false);
                let minNameValid = `${minName}_valid`;
                let maxNameValid = `${maxName}_valid`;
                let valueMin = variable.inputMin;
                let valueMax = variable.inputMax;

                return (
                  <tr key={index}>
                    <th scope='row' className='col-form-label-sm align-middle variable-name'>{variable.name}</th>
                    <td 
                      className={`align-middle ${this.text_align}`}
                    >
                      {variable.dataMin}
                    </td>
                    <td className={`${this.text_align}`}>
                      <div className='input-group input-group-sm'>
                        <input 
                          type='number' 
                          className={`form-control form-control-sm variable-range axis-min 
                            ${this.state[minNameValid] ? '' : 'is-invalid'}
                            ${this.state[minName] != '' ? 'contains-user-input' : ''}`} 
                          style={{width: this.width}}
                          name={minName}
                          placeholder={variable.dataMin}
                          value={this.state[minName]}
                          onChange={this.handleChange}
                        />
                        <div className='input-group-append'>
                          <button 
                            className='btn btn-outline-secondary' 
                            type='button'
                            name={minName}
                            value=''
                            disabled={this.state[minName] == ''}
                            onClick={this.handleChange}
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td 
                      className={`lessThanValidationMessageCell align-middle ${this.text_align}`}
                    >
                      <span 
                        className={`text-danger font-weight-bold lessThanValidationMessage
                          ${this.state[minNameValid] && this.state[maxNameValid] ? 'valid' : ''}
                        `}
                        data-toggle='popover' 
                        data-trigger='hover'
                        data-content='Axis Min must be less than Axis Max.'
                        data-placement='bottom'
                      >
                        <FontAwesomeIcon icon={faLessThan} />
                      </span>
                    </td>
                    <td 
                      className={`${this.text_align}`}
                      style={{position: 'relative'}}
                    >
                      <div className='input-group input-group-sm'>
                        <input 
                          type='number' 
                            className={`form-control form-control-sm variable-range axis-max
                            ${this.state[maxNameValid] ? '' : 'is-invalid'}
                            ${this.state[maxName] != '' ? 'contains-user-input' : ''}`}
                          style={{width: this.width}}
                          name={maxName}
                          placeholder={variable.dataMax}
                          value={this.state[maxName]}
                          onChange={this.handleChange}
                        />
                        <div className='input-group-append'>
                          <button 
                            className='btn btn-outline-secondary' 
                            type='button' 
                            name={maxName}
                            value=''
                            disabled={this.state[maxName] == ''}
                            onClick={this.handleChange}
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className={`align-middle ${this.text_align}`}>
                      {variable.dataMax}
                    </td>
                  </tr>
                )
              // }
              
            })
          }
          </tbody>
        </table>
      </div>
    );
  }
}

const mapStateToProps = (state, ownProps) => {

  // state.derived.variableAliases.map((alias, index));
  let names = ownProps.metadata['column-names'];
  let variableAliases = state.derived.variableAliases;

  let getVariableAlias = (index) => {
    let alias = names[index];
    if(variableAliases[index] !== undefined)
    {
      alias = variableAliases[index];
    }
    return alias;
  }

  let numericVariables = names
    .flatMap((name, index) => {
    if(ownProps.metadata['column-types'][index] != 'string')
    {
      return [{
        index: index,
        name: getVariableAlias(index),
        dataMin: ownProps.table_statistics[index].min,
        dataMax: ownProps.table_statistics[index].max,
        inputMin: state.axisMinMax ? state.axisMinMax.inputMin : '',
        inputMax: state.axisMinMax ? state.axisMinMax.inputMax : '',
        inputMinValid: false,
        inputMaxValid: false,
      }];
    }
    return [];
  });

  return {
    variableAliases: state.derived.variableAliases,
    numericVariables: numericVariables,
  }
};

export default connect(
  mapStateToProps,
  { 

  }
)(VariableRanges)
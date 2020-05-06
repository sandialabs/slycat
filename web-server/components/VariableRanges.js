import React from "react";
import { connect } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import css from "css/slycat-variable-ranges.scss";

class VariableRanges extends React.Component {
  constructor(props) {
    super(props);

    let inputsArray = props.numericVariables.map((variable, index) => {
      return {
        [`min_${variable.index}`] : '',
        [`max_${variable.index}`] : '',
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

  clearLabel = (event) => {
    let index = event.currentTarget.name;
    let input = document.querySelector(`.${this.class} input[name='${index}'`);
    input.value = '';
    props.onChange(event);
  }

  handleChange = (event) => {
    this.setState({
      [event.currentTarget.name]: event.currentTarget.value.trim()
    });
  }

  validateMin = (index) => {
    let inputMax = parseFloat(this.state[this.getName(index, false)]);
    let dataMax  = parseFloat(this.props.table_statistics[index].max);
    let compareMax = inputMax == '' || Number.isNaN(inputMax) ? dataMax : inputMax;
    let inputString = this.state[this.getName(index, true)];
    let inputMin = parseFloat(inputString);

    // Empty field is always valid because the data value overrides it
    if(inputString == '')
    {
      return true;
    }
    // NaNs are invalid
    else if(Number.isNaN(inputMin))
    {
      return false;
    }
    else if(inputMin < compareMax)
    {
      return true;
    }
    return false;
  }

  render() {
    return (
      <div className={`${this.class} ${this.props.uniqueID}`}>
        <div className='alert alert-danger' role='alert'>
          Axis Min must be less than Axis Max.
        </div>
        <table className='table table-striped table-hover table-sm table-borderless'>
          <thead>
            <tr>
              <th scope='col' className='align-top' />
              <th scope='col' className={`align-top ${this.text_align}`}>Data Min</th>
              <th scope='col' className={`align-top ${this.text_align}`}>Axis Min</th>
              <th scope='col' className={`align-top ${this.text_align}`}>Axis Max</th>
              <th scope='col' className={`align-top ${this.text_align}`}>Data Max</th>
            </tr>
          </thead>
          <tbody>
          {
            this.props.numericVariables.map((variable, index) => {
              // let alias = this.getVariableAlias(index);
              // let type = this.types[index];
              // Only show non-string variables
              // if (type != 'string')
              // {
                let minName = `min_${variable.index}`;
                let maxName = `max_${variable.index}`;
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
                          className={`form-control form-control-sm variable-range axis-min ${this.validateMin(variable.index) ? '' : 'is-invalid'}`} 
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
                      className={`${this.text_align}`}
                      style={{position: 'relative'}}
                    >
                      <div className='input-group input-group-sm'>
                        <input 
                          type='number' 
                          className='form-control form-control-sm variable-range axis-max is-invalid' 
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
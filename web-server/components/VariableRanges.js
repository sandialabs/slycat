import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faLessThan } from '@fortawesome/free-solid-svg-icons'
import css from "css/slycat-variable-ranges.scss";
import $ from 'jquery';

export default class VariableRanges extends React.PureComponent {
  constructor(props) {
    super(props);

    this.numericVariables = props.metadata['column-names']
      .flatMap((name, index) => {
        if(props.metadata['column-types'][index] != 'string')
        {
          return [{
            index: index,
            dataMin: props.table_statistics[index].min,
            dataMax: props.table_statistics[index].max,
          }];
        }
        return [];
      });

    let inputsArray = this.numericVariables.map((variable, index) => {
      let min = '';
      let max = '';
      let bookmark = this.props.variableRanges[variable.index];
      if (bookmark) 
      {
        min = bookmark.min != undefined ? bookmark.min : '';
        max = bookmark.max != undefined ? bookmark.max : '';
      }
      return {
        [this.getName(variable.index, true)] : min,
        [`${this.getName(variable.index, true)}_valid`] : true,
        [this.getName(variable.index, false)] : max,
        [`${this.getName(variable.index, false)}_valid`] : true,
      }
    });

    let inputObject = Object.assign(...inputsArray);

    this.state = inputObject;

    this.names = props.metadata['column-names'];
    this.types = props.metadata['column-types'];
    this.text_align = 'text-center';
    this.class = 'slycat-variable-ranges';
  }

  componentDidMount() {
    // Initializing popover tooltips. Used for validation.
    $(`.${this.class} .validationPopover`).popover({
      // Specifying custom popover template to make text red by adding text-danger class.
      template: `
        <div class="popover" role="tooltip">
          <div class="arrow"></div>
          <h3 class="popover-header"></h3>
          <div class="popover-body text-danger"></div>
        </div>`,
      placement: 'bottom',
      trigger: 'hover',
      content: 'Axis Min must be less than Axis Max.',
    });
    // Disabling popover tooltips for valid input fields.
    $(`.${this.class} .validationPopover.valid`).popover('disable');

  }

  componentDidUpdate() {
    // Disabling popover tooltips for valid input fields.
    $(`.${this.class} .validationPopover.valid`).popover('disable');
    // Enable popover tooltips for invalid input fields.
    $(`.${this.class} .validationPopover.is-invalid`).popover('enable');


    // Show any new validation popovers but only for the element that has focus, 
    // since that's the one the user will be interacting with. We don't want
    // popovers appearing all over the UI for all invalid input fields.
    $(`.${this.class} .validationPopover`).filter(':focus').popover('show');
    // Hide any open popovers when the state changes and the underlying input
    // is now valid.
    $(`.${this.class} .validationPopover.valid`).popover('hide');
  }

  clearAllVariableRanges = () => {
    // Called by ControlsButtonVarOptions component using a reference
    // to inform that all variable ranges have been cleared in the Redux store
    // so we need to clear the local state too to update the UI.
    let inputsArray = this.numericVariables.map((variable, index) => {
      return {
        [this.getName(variable.index, true)] : '',
        [`${this.getName(variable.index, true)}_valid`] : true,
        [this.getName(variable.index, false)] : '',
        [`${this.getName(variable.index, false)}_valid`] : true,
      }
    });
    this.setState(Object.assign(...inputsArray));
  }

  getVariableAlias = (index) => {
    let alias = this.props.metadata['column-names'][index];
    if(this.props.variableAliases[index] !== undefined)
    {
      alias = this.props.variableAliases[index];
    }
    return alias;
  }

  getName = (index, minBool) => {
    return `${minBool ? 'min' : 'max'}_${index}`;
  }

  handleChange = (event) => {
    console.log('handleChange');
    let name = event.currentTarget.name;
    let inputString = event.currentTarget.value.trim();
    this.setState((previousState, props) => ({
      [name]: inputString,
      ...this.validateMinAndMax(name, inputString, previousState, props)
    }));
  }

  validateMinAndMax = (name, inputString, previousState, props) => {
    console.log('validateMinAndMax');
    let index = name.slice(4);
    let min = name.startsWith('min');
    let inputNum = parseFloat(inputString);
    let prefix = min ? 'min' : 'max';
    let oppositePrefix = min ? 'max' : 'min';
    let oppositeName = `${oppositePrefix}${name.slice(3)}`;
    let oppositeInput = previousState[oppositeName];
    let oppositeNum = parseFloat(previousState[oppositeName]);
    let data = parseFloat(props.table_statistics[index][prefix]);
    let oppositeData = parseFloat(props.table_statistics[index][oppositePrefix]);
    let compare = oppositeInput == '' || Number.isNaN(oppositeNum) ? oppositeData : oppositeNum;
    let oppositeCompare = inputString == '' || Number.isNaN(inputNum) ? data : inputNum;
    
    return {
      [`${name}_valid`]: this.validateMinOrMax(inputString, inputNum, min, compare, index),
      [`${oppositeName}_valid`]: this.validateMinOrMax(oppositeInput, oppositeNum, !min, oppositeCompare, index)
    };

  }

  validateMinOrMax = (inputString, inputNum, min, compare, index) => {
    // console.log('validateMinOrMax');
    // Empty field is always valid because the data value overrides it
    if(inputString == '')
    {
      // Clear min or max in redux store since it's blank
      this.props.clearVariableRange(index, min ? 'min' : 'max');
      return true;
    }
    // NaNs are invalid
    else if(Number.isNaN(inputNum))
    {
      return false;
    }
    else if(min ? inputNum < compare : inputNum > compare)
    {
      // Save min or max to redux store since it's valid
      this.props.setVariableRange(index, inputNum, min ? 'min' : 'max');
      return true;
    }
    // Clear min or max in redux store when invalid
    this.props.clearVariableRange(index, min ? 'min' : 'max');
    return false;
  }

  render() {
    console.log('render in VariableRanges');
    const t0 = performance.now();

    let result = (
      <div className={`${this.class} ${this.props.uniqueID}`}>
        <table className='table table-striped table-hover table-sm table-borderless'>
          <thead>
            <tr>
              <th scope='col' className='align-top' />
              <th scope='col' className={`align-top text-nowrap px-2 ${this.text_align}`}>Data Min</th>
              <th scope='col' className={`align-top text-nowrap px-2 ${this.text_align}`}>Axis Min</th>
              <th scope='col' className={`align-top text-nowrap px-2 ${this.text_align}`} />
              <th scope='col' className={`align-top text-nowrap px-2 ${this.text_align}`}>Axis Max</th>
              <th scope='col' className={`align-top text-nowrap px-2 ${this.text_align}`}>Data Max</th>
            </tr>
          </thead>
          <tbody>
          {
            this.numericVariables.map((variable, index) => {
              let minName = this.getName(variable.index, true);
              let maxName = this.getName(variable.index, false);
              let minNameValid = `${minName}_valid`;
              let maxNameValid = `${maxName}_valid`;

              return (
                <tr key={index}>
                  <th scope='row' 
                    className='align-middle variable-name px-2'>
                    {this.getVariableAlias(variable.index)}
                  </th>
                  <td 
                    className={`align-middle px-2 ${this.text_align} data-min`}
                  >
                    {variable.dataMin}
                  </td>
                  <td className={`align-middle ${this.text_align} axis-min axis-input`}>
                    <div className='input-group input-group-sm'>
                      <input 
                        type='number' 
                        className={`form-control form-control-sm variable-range axis-min validationPopover
                          ${this.state[minNameValid] ? 'valid' : 'is-invalid'}
                          ${this.state[minName] != '' ? 'contains-user-input' : ''}`} 
                        name={minName}
                        placeholder={variable.dataMin}
                        value={this.state[minName]}
                        onChange={this.handleChange}
                      />
                      <div className='input-group-append'>
                        <button 
                          className='btn btn-outline-secondary' 
                          type='button'
                          title='Clear axis min.'
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
                      className={`text-danger font-weight-bold lessThanValidationMessage validationPopover is-invalid
                        ${this.state[minNameValid] && this.state[maxNameValid] ? 'valid' : ''}
                      `}
                    >
                      <FontAwesomeIcon icon={faLessThan} />
                    </span>
                  </td>
                  <td 
                    className={`align-middle ${this.text_align} axis-max axis-input`}
                  >
                    <div className='input-group input-group-sm'>
                      <input 
                        type='number' 
                          className={`form-control form-control-sm variable-range axis-max validationPopover
                          ${this.state[maxNameValid] ? 'valid' : 'is-invalid'}
                          ${this.state[maxName] != '' ? 'contains-user-input' : ''}`}
                        name={maxName}
                        placeholder={variable.dataMax}
                        value={this.state[maxName]}
                        onChange={this.handleChange}
                      />
                      <div className='input-group-append'>
                        <button 
                          className='btn btn-outline-secondary' 
                          type='button' 
                          title='Clear axis max.'
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
                  <td className={`align-middle px-2 ${this.text_align} data-max`}>
                    {variable.dataMax}
                  </td>
                </tr>
              )
            })
          }
          </tbody>
        </table>
      </div>
    );

    const t1 = performance.now();
    console.log(`Call to render VariableRanges took ${t1 - t0} milliseconds.`);

    return result;
  }
}
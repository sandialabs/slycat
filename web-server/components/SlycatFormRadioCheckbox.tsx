'use strict';
import * as React from 'react';
import { v1 as uuidv1 } from 'uuid';

/**
 */
export interface SlycatFormRadioCheckboxProps {
  checked: boolean
  onChange: Function
  value: string
  text: string
  style?: any
}

/**
 * not used
 */
export interface SlycatFormRadioCheckboxState {
}
/**
 * class that creates a a form with checkboxes
 * some other process
 */
export default class SlycatFormRadioCheckbox extends React.Component<SlycatFormRadioCheckboxProps, SlycatFormRadioCheckboxState> {
  /**
   * not used
   */
  public constructor(props:SlycatFormRadioCheckboxProps) {
    super(props)
    this.state = {}
  }

  public render () {
    let uuid = uuidv1();
    return (
      <div className="form-check justify-content-start mb-2">
        <input type="radio" className="form-check-input" 
          value={this.props.value} 
          name={uuid} id={uuid} 
          checked={this.props.checked}
          onChange={(e)=>this.props.onChange(e.target.value)} />
        <label className="form-check-label" style={this.props.style} htmlFor={uuid}>
          {this.props.text}
        </label>
      </div>
    );
  }
}

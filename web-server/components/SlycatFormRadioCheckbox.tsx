'use strict';
import * as React from 'react';

/**
 */
export interface SlycatFormRadioCheckboxProps {
  checked: boolean
  onChange: Function
  value: string
  text: string
  style: any
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
    return (
      <div className="form-check">
        <label className="form-check-label" style={this.props.style} htmlFor="radio1">
          <input type="radio" className="form-check-input" value={this.props.value} checked={this.props.checked} onChange={(e)=>this.props.onChange(e.target.value)}/>
          {this.props.text}
        </label>
      </div>
    );
  }
}

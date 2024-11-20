'use strict';
import * as React from 'react';
import { v1 as uuidv1 } from 'uuid';
import { int } from 'vtk.js/Sources/types';

/**
 */
export interface MappingRadioButtonProps {
  checked: boolean
  onChange: Function
  value: string
  text: string
  style?: any
  idx: int
  name: string
}

/**
 * not used
 */
export interface MappingRadioButtonState {
}
/**
 * class that creates a a form with checkboxes
 * some other process
 */
export default class MappingRadioButtonCheckbox extends React.Component<MappingRadioButtonProps, MappingRadioButtonState> {
  /**
   * not used
   */
  public constructor(props:MappingRadioButtonProps) {
    super(props)
    this.state = {}
  }

  public render () {
    let uuid = uuidv1();

    return (
      <div className="form-check justify-content-start mb-2">
        <input type="radio" className="form-check-input" 
          value={this.props.value} 
          name={(typeof this.props.name !== 'undefined') ? this.props.name : uuid} id={(Number.isInteger(this.props.idx)) ? this.props.idx.toString() : uuid}
          onChange={(e)=>this.props.onChange(e.target.value, e.target.id)} />
        <label className="form-check-label" style={this.props.style} htmlFor={uuid}>
          {this.props.text}
        </label>
      </div>
    );
  }
}
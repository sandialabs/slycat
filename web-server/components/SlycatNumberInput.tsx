'use strict';
import * as React from 'react';

/**
 */
export interface SlycatNumberInputProps {
  value: number
  style?: any
  label: string
  callBack: Function
  id?: string
  warning?: string
}

/**
 * not used
 */
export interface SlycatNumberInputState {
  value: number
}
/**
 * class that creates a a form with checkboxes
 * some other process
 */
export default class SlycatNumberInput extends React.Component<SlycatNumberInputProps, SlycatNumberInputState> {
  /**
   * not used
   */
  public constructor(props:SlycatNumberInputProps) {
    super(props)
    this.state = {
      value: props.value
    }
  }

  onValueChange = (value:number) => {
    // localStorage.setItem("slycat-remote-controls-username", value);
    if(value === '') {
      value = 1;
    }
    this.setState({value: value});
    this.props.callBack(value);
  };

  public render () {
    return (
    <div className='form-group row mb-3'>
        <label className='col-sm-2 col-form-label'>{this.props.label}</label>
        <div className='col-sm-9'>
          <input
            id={this.props.id}
            className='form-control' type='number' min={1}
            value={this.state.value}
            onChange={(e)=>this.onValueChange(e.target.value)}
          />
          <div className="invalid-feedback">
            {this.props.warning}
          </div>
        </div>
    </div>
    );
  }
}

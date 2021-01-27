'use strict';
import * as React from 'react';

/**
 */
export interface SlycatTextInputProps {
  onChange?: Function
  value: string
  style?: any
  label: string
  callBack: Function
  id?: string
  warning?: string
}

/**
 * not used
 */
export interface SlycatTextInputState {
  value: string
}
/**
 * class that creates a a form with checkboxes
 * some other process
 */
export default class SlycatTextInput extends React.Component<SlycatTextInputProps, SlycatTextInputState> {
  /**
   * not used
   */
  public constructor(props:SlycatTextInputProps) {
    super(props)
    this.state = {
      value: props.value
    }
  }

  onValueChange = (value:string) => {
    // localStorage.setItem("slycat-remote-controls-username", value);
    // this.setState({value: value});
    this.setState({value:value});
    this.props.callBack(value);
  };

  public render () {
    return (
    <div className='form-group row mb-3'>
        <label className='col-sm-2 col-form-label'>{this.props.label}</label>
        <div className='col-sm-9'>
          <input
            id={this.props.id}
            className='form-control' type='text'
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

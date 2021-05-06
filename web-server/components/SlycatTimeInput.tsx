'use strict';
import * as React from 'react';

/**
 */
export interface SlycatTimeInputProps {
  hours: number
  minutes: number
  minCallBack: Function
  hourCallBack: Function
  label: string
}

/**
 * not used
 */
export interface SlycatTimeInputState {
  hours: number
  minutes: number
}
/**
 * class that creates a a form with checkboxes
 * some other process
 */
export default class SlycatTimeInput extends React.Component<SlycatTimeInputProps, SlycatTimeInputState> {
  /**
   * not used
   */
  public constructor(props:SlycatTimeInputProps) {
    super(props)
    this.state = {
      hours: props.hours,
      minutes: props.minutes
    }
  }

  onHourChange = (value) => {
    // localStorage.setItem("slycat-remote-controls-username", value);
    // this.setState({value: value});
    if (value === '') {
      value = 0;
    }
    this.setState({hours:value});
    this.props.hourCallBack(value);
  };

  onMinuteChange = (value) => {
    if (value === '') {
      value = 0;
    }
    this.setState({minutes:value});
    this.props.minCallBack(value);
  }

  public render () {
    return (
    <div className='form-group row mb-3'>
        <label className='col-sm-2 col-form-label'>{this.props.label}</label>
        <div className='col-sm-2'>
          <input
            className='form-control' type='number' min={0}
            value={this.state.hours}
            onChange={(e)=>this.onHourChange(e.target.value)}
            />
            Hours
        </div>
        <div className='col-sm-2'>
          <input className='form-control' type='number' min={0}
            value={this.state.minutes}
            onChange={(e)=>this.onMinuteChange(e.target.value)}
            />
            Minutes
        </div>
    </div>
    );
  }
}

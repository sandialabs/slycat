'use strict';
import * as React from 'react';

/**
 * @param {onSelectCallBack} callback when selected
 * @param {options} option list
 * @param {label} label for the dropdown
 */
export interface SlycatSelectorProps { 
  onSelectCallBack: Function
  options: Option[]
  label: string
  disabled?: boolean
}

/**
 * object with selector value and text string for display
 *
 * @interface option
 */
export interface Option {
  text: string
  value: string
}

/**
 * not used
 */
export interface SlycatSelectorState {
}
/**
 * class that creates a dropdown with values given in options prop
 */
export default class SlycatSelector extends React.Component<SlycatSelectorProps, SlycatSelectorState> {
  /**
   * not used
   */
  public constructor(props: SlycatSelectorProps) {
    super(props)
    this.state = {};
  }

  /**
   * gets a jsx list of options
   *
   * @memberof SlycatSelector
   */
  getOptions = (): JSX.Element[]=> {
    const jsxOptions = this.props.options.map((option, i) => <option key={i} value={option.value}>{option.text}</option>);
    return jsxOptions;
  }

  public render () {
    return (
      <div className="form-group row">
        <label className="col-sm-2 col-form-label">
          {this.props.label}
        </label>
        <div className='col-sm-9'>
          {this.props.disabled === true ?          
          <select className="form-control" onChange={(e)=>this.props.onSelectCallBack(e.target.value)} disabled>
            {this.getOptions()}
          </select>
          :
          <select className="form-control" onChange={(e)=>this.props.onSelectCallBack(e.target.value)} >
          {this.getOptions()}
        </select> }          
        </div>
      </div>
    )
  }
}

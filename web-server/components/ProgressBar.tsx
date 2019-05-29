"use strict";
import React from "react";

/**
 * @param {progress} number between 0-100 representing the percentage of progress
 */
export interface ProgressBarProps { 
  progress:number
  hidden: boolean
}

/**
 * not used
 */
export interface ProgressBarState {
}

/**
 * class that creates a progress bar
 */
export default class ProgressBar extends React.Component<ProgressBarProps, ProgressBarState> {
  /**
   * not used
   */
  public constructor(props:ProgressBarProps) {
    super(props)
    this.state = {}
  }
  render() {
    const styling = {width: this.props.progress+'%'};
    if(!this.props.hidden){
      return (
        <div className="progress">
          <div className="progress-bar progress-bar-striped progress-bar-animated" 
            role="progressbar" 
            aria-valuemin={0} 
            aria-valuemax={100}
            aria-valuenow={this.props.progress}
            style={styling}
          >
            {this.props.progress}%
          </div>
        </div>
      );
    } else {
      return null;
    }
  }
};

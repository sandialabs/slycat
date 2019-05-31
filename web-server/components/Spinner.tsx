'use strict';
import * as React from 'react';

/**
 * nut used
 */
export interface SpinnerProps { 
}

/**
 * not used
 */
export interface SpinnerState {
}
/**
 * class that creates a Navbar for use in tracking progress through say a wizard or
 * some other process
 */
export default class Spinner extends React.Component<SpinnerProps, SpinnerState> {
  /**
   * not used
   */
  public constructor(props:SpinnerProps) {
    super(props)
    this.state = {}
  }
  render() {
    return (
    	<div className="d-flex justify-content-center mt-4">
        <div className="spinner-border" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }
}

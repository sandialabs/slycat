import React, { Component } from 'react';

export default class CCA extends Component  {
  render() {
    return (
      <div className="">
        {this.props.value}" from CCA"
      </div>
    );
  }
}

export class ParameterSpace extends Component  {
  render() {
    return (
      <div className="">
        {this.props.value}"from Param Space"
      </div>
    );
  }
}

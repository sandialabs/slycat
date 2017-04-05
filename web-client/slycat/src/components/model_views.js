import React, { Component } from 'react';

var  Views ={
    CAA : class CCA extends Component  {
      render() {
        return (
          <div className="">
            {this.props.value}" from CCA"
          </div>
        );
      }
    },

    ParameterSpace: class ParameterSpace extends Component  {
      render() {
        return (
          <div className="">
            {this.props.value}"from Param Space"
          </div>
        );
      }
    }
}

export default Views

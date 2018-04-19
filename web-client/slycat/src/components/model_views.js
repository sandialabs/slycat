// Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
// DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
// retains certain rights in this software.

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

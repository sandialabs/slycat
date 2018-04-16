// Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
// DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
// retains certain rights in this software.

import React, { Component } from 'react';
import Views from './model_views'

class Projects extends Component  {
  render() {
    return (
      <div>
          <button className="">
            {this.props.value}
          </button>
          <Views.ParameterSpace value={this.props.value} />
      </div>
    );
  }
}

export default Projects;
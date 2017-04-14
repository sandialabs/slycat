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
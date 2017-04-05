import React, { Component } from 'react';
import CAA from './model_views'
class Projects extends Component  {
  render() {
    return (
      <div>
          <button className="">
            {this.props.value}
          </button>
          <CAA value={this.props.value} />
      </div>
    );
  }
}

export default Projects;
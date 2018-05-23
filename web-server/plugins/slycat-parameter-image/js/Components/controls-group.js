import React from "react";

class ControlsGroup extends React.Component {
  render() {
    return (
      <div id={this.props.id} className={(this.props.class ? this.props.class : "btn-group btn-group-xs") + " ControlsGroup"}>
        {this.props.children}
      </div>
    );
  }
}

export default ControlsGroup
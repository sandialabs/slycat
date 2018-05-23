import React from "react";

class ControlsButtonToggle extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <button className={'btn btn-default btn-xs ' + (this.props.active ? 'active' : '')} data-toggle="button" title={this.props.title} aria-pressed={this.props.active} onClick={this.props.set_active_state}>
        <span className={'fa ' + this.props.icon} aria-hidden="true"></span>
      </button>
    );
  }
}

export default ControlsButtonToggle
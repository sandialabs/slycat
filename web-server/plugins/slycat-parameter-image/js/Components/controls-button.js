import React from "react";

class ControlsButton extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return this.props.hidden ? null : (
      <button className="btn btn-default" type="button" title={this.props.title} disabled={this.props.disabled} onClick={this.props.click}>
        {this.props.icon &&
          <span className={'fa ' + this.props.icon} aria-hidden="true"></span>
        }
        {this.props.label}
      </button>
    );
  }
}

export default ControlsButton
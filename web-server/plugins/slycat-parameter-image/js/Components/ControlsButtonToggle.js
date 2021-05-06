import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default class ControlsButtonToggle extends React.PureComponent {
  render() {
    return (
      <button 
        // Don't set data-toggle because it now causes Bootstrap to activate and deactivate the button 
        // automatically, which interferes with React's toggling of attributes based on props.active.
        // data-toggle='button' 
        className={`slycatControlsButtonToggle btn btn-sm ${this.props.button_style} ${this.props.active ? 'active' : 'notActive'}`}
        id={this.props.id}
        title={this.props.title} 
        aria-pressed={this.props.active} 
        onClick={this.props.set_active_state}>
        <FontAwesomeIcon icon={this.props.icon} />
      </button>
    );
  }
}

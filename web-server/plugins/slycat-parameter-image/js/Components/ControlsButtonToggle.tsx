import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

interface ControlsButtonToggleProps {
  button_style: string;
  active: boolean;
  id: string;
  title: string;
  icon: IconProp;
  toggle_active_state(event: React.MouseEvent<HTMLButtonElement>): void;
}

/**
 * React component used to create a button that toggles between on and off when clicked.
 *
 *
 * @export
 * @class ControlsButtonToggle
 * @extends {React.PureComponent<ControlsButtonToggleProps>}
 */
export default class ControlsButtonToggle extends React.PureComponent<ControlsButtonToggleProps> {
  render() {
    return (
      <button
        // Don't set data-toggle because it now causes Bootstrap to activate and deactivate the button
        // automatically, which interferes with React's toggling of attributes based on props.active.
        // data-toggle='button'
        className={`slycatControlsButtonToggle btn btn-sm ${this.props.button_style} ${
          this.props.active ? "active" : "notActive"
        }`}
        id={this.props.id}
        title={this.props.title}
        aria-pressed={this.props.active}
        onClick={this.props.toggle_active_state}
      >
        <FontAwesomeIcon icon={this.props.icon} />
      </button>
    );
  }
}

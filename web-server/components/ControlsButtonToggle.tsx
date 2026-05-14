import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";

export interface ControlsButtonToggleProps {
  button_style: string;
  active: boolean;
  id?: string;
  title: string;
  icon: IconProp;
  toggle_active_state(event: React.MouseEvent<HTMLButtonElement>): void;
}

/**
 * Button that toggles between on and off when clicked (Slycat controls styling).
 */
export default class ControlsButtonToggle extends React.PureComponent<ControlsButtonToggleProps> {
  render() {
    return (
      <button
        type="button"
        // Don't set data-bs-toggle='button' — Bootstrap would fight React's active state.
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

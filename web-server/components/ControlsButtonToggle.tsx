import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import Icon, { type IconName, type IconRotation } from "components/Icons/Icon";

interface ControlsButtonToggleBaseProps {
  button_style: string;
  active: boolean;
  id?: string;
  title: string;
  toggle_active_state(event: React.MouseEvent<HTMLButtonElement>): void;
}

/**
 * Provide exactly one of:
 *   - `icon`: a raw FontAwesome `IconProp` (legacy callers)
 *   - `iconType`: an `IconName` resolved by the central Slycat `<Icon>`
 *     component (supports FontAwesome and react-icons). The optional
 *     `rotation` prop applies to this path only.
 */
export type ControlsButtonToggleProps = ControlsButtonToggleBaseProps &
  (
    | { icon: IconProp; iconType?: never; rotation?: never }
    | {
        icon?: never;
        iconType: IconName;
        rotation?: IconRotation;
        iconClassName?: string;
      }
  );

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
        {this.props.iconType ? (
          <Icon
            type={this.props.iconType}
            rotation={this.props.rotation}
            className={this.props.iconClassName}
          />
        ) : (
          <FontAwesomeIcon icon={this.props.icon} />
        )}
      </button>
    );
  }
}

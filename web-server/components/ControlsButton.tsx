import React from "react";
import Icon, { type IconName } from "components/Icons/Icon";

declare const $: any;

export type ControlsButtonProps = {
  hidden?: boolean;
  button_type?: string;
  button_style?: string;
  id?: string;
  title?: string;
  disabled?: boolean;
  click?: React.MouseEventHandler<HTMLButtonElement>;
  data_toggle?: string;
  data_target?: string;
  icon?: IconName;
  label?: React.ReactNode;
  tooltip?: React.ReactNode | null;
};

const ControlsButton: React.FC<ControlsButtonProps> = (props) => {
  // wait until all the jquery stuff is loaded
  $(document).ready(function ($: any) {
    // enable the tooltip
    $('[data-bs-toggle="tooltip"]').tooltip();
  });
  const renderIcon = () => (props.icon ? <Icon type={props.icon} /> : null);

  return props.hidden ? null : (
    <button
      className={`btn ${props.button_type || "btn-sm"} ${props.button_style}`}
      id={props.id}
      type="button"
      title={props.title}
      disabled={props.disabled}
      onClick={props.click}
      data-bs-toggle={props.data_toggle}
      data-bs-target={props.data_target}
    >
      {renderIcon()}
      {props.label}
      {props.tooltip !== null && props.tooltip}
    </button>
  );
};

export default ControlsButton;

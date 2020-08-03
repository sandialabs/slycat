import React from "react";

const ControlsButton = (props) => {
  // wait until all the jquery stuff is loaded
  $( document ).ready(function( $ ) {
    // enable the tooltip
    $('[data-toggle="tooltip"]').tooltip()
  })
  return props.hidden ? null : (
    <button
      className={`btn ${props.button_type || 'btn-sm'} ${props.button_style}`}
      id={props.id}
      type="button"
      title={props.title}
      disabled={props.disabled}
      onClick={props.click}
      data-toggle={props.data_toggle}
      data-target={props.data_target}
    >
      {props.icon && <span className={"fa " + props.icon} aria-hidden="true" />}
      {props.label}
      {props.tooltip !== null && props.tooltip}
    </button>
  );
};

export default ControlsButton;

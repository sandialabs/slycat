import React from "react";

const ControlsButton = (props) => {
    return props.hidden ? null : (
      <button
          className={`btn btn-sm ${props.button_style} ${props.class}`}
          id={props.id}
          type="button" title={props.title}
          disabled={props.disabled}
          onClick={props.click}
          data-toggle={props.data_toggle}
          data-target={props.data_target}>
        {props.icon &&
          <span className={'fa ' + props.icon} aria-hidden="true"/>
        }
        {props.label}
      </button>
    );
};

export default ControlsButton
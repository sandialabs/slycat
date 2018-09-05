import React from "react";

const ControlsButton = (props) => {
    return props.hidden ? null : (
      <button
          className="btn btn-default"
          type="button" title={props.title}
          disabled={props.disabled}
          onClick={props.click}>
        {props.icon &&
          <span className={'fa ' + props.icon} aria-hidden="true"/>
        }
        {props.label}
      </button>
    );
};

export default ControlsButton
import React from "react";

const ControlsButtonToggle = (props) => {
    return (
      <button className={`slycatControlsButtonToggle btn btn-sm ${props.button_style} ${props.active ? 'active' : 'notActive'}`} data-toggle="button" title={props.title} aria-pressed={props.active} onClick={props.set_active_state}>
        <span className={'fa ' + props.icon} aria-hidden="true"/>
      </button>
    );
};

export default ControlsButtonToggle
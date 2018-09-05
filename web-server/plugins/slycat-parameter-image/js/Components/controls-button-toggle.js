import React from "react";

const ControlsButtonToggle = (props) => {
    return (
      <button className={'btn btn-default btn-xs ' + (props.active ? 'active' : '')} data-toggle="button" title={props.title} aria-pressed={props.active} onClick={props.set_active_state}>
        <span className={'fa ' + props.icon} aria-hidden="true"/>
      </button>
    );
};

export default ControlsButtonToggle
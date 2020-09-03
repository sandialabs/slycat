import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const ControlsButtonToggle = (props) => {
    return (
      <button data-toggle='button' 
        className={`slycatControlsButtonToggle btn btn-sm ${props.button_style} ${props.active ? 'active' : 'notActive'}`}
        id={props.id}
        title={props.title} 
        aria-pressed={props.active} 
        onClick={props.set_active_state}>
        <FontAwesomeIcon icon={props.icon} />
      </button>
    );
};

export default ControlsButtonToggle
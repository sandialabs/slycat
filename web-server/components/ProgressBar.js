"use strict";
import React from "react";

const ProgressBar = (props) => {
    let styling = `"width : ${props.progress}%"`;
    return props.hidden ? null : (
      <div className="progress">
        <div className="progress-bar progress-bar-striped progress-bar-animated" 
          role="progressbar" 
          aria-valuemin="0" 
          aria-valuemax="100"
          aria-valuenow={props.progress}
          style={{width: props.progress+'%'}}
        >
          {props.progress}%
        </div>
      </div>
    );
};

export default ProgressBar;
"use strict";
import React from "react";

export const FileSelector = (params) =>
{
    return (
        <div className="form-group">
            <input className="form-control-file" type="file" onChange={ (e) => params.handleChange(e.target.files) } />
        </div>
    )
}

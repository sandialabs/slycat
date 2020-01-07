"use strict";
import React from "react";

export const FileSelector = (params) =>
{
    return (
      <div className='form-group row'>
        <label className='col-sm-2 col-form-label'>
          File
        </label>
        <div className='col-sm-9'>
            <input className='' type='file' onChange={ (e) => params.handleChange(e.target.files) } />
        </div>
      </div>
    )
}

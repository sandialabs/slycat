/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";

export const SlycatLocalBrowser = () => {
  return (
    <div className="form-group row">
      <label className="col-sm-2 col-form-label" data-bind="css: {'disabled' : disabled}">
        File
      </label>
      <div className="col-sm-10">
        <input
          type="file"
          className=""
          id="slycat-local-browser-file"
          placeholder="file"
          data-bind="event:{change: selection_changed}, attr: {'disabled' : disabled, 'multiple' : multiple}"
        ></input>
        <div className="progress" data-bind="visible: progress() != undefined && progress() > 0">
          <div
            className="progress-bar progress-bar-striped progress-bar-animated"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            // data-bind="
            //   attr: {'aria-valuenow' : progress},
            style={{'width' : '0' + '%'}}
            //   text: progress_status,"
          >
            Uploading
          </div>
        </div>
      </div>
    </div>
  );
};

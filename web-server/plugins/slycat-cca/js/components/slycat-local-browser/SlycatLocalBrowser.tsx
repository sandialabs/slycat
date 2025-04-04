/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";

export const SlycatLocalBrowser = () => {

      // var file = component.browser.selection()[0];
      // let file_name = file.name;
      // var fileObject = {
      //   pid: component.project._id(),
      //   mid: component.model._id(),
      //   file: file,
      //   aids: [["data-table"], file_name],
      //   parser: component.parser(),
      //   progress: component.browser.progress,
      //   progress_status: component.browser.progress_status,
      //   progress_final: 90,
      //   success: function () {
      //     upload_success(component.browser);
      //   },
      //   error: function () {
      //     dialog.ajax_error(
      //       "Did you choose the correct file and filetype?  There was a problem parsing the file: ",
      //     )();
      //     $(".local-browser-continue").toggleClass("disabled", false);
      //     component.browser.progress(null);
      //     component.browser.progress_status("");
      //   },
      // };
      // fileUploader.uploadFile(fileObject);

  return (
    <div className="form-group row">
      <label className="col-sm-2 col-form-label">File</label>
      <div className="col-sm-10">
        <input type="file" className="" id="slycat-local-browser-file" placeholder="file"></input>
        <div className="progress" style={{ visibility: "hidden" }}>
          <div
            className="progress-bar progress-bar-striped progress-bar-animated"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            // data-bind="
            aria-valuenow={100}
            style={{ width: "0" + "%" }}
            //   text: progress_status,"
          >
            Uploading
          </div>
        </div>
      </div>
    </div>
  );
};

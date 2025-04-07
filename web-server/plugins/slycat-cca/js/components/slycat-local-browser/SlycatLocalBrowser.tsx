/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { useHandleSubmit } from "../CCAWizardUtils";
import { SlycatParserControls } from "../slycat-parser-controls/SlycatParserControls";

export const SlycatLocalBrowser = () => {
  const [file, setFile] = React.useState<File | undefined>(undefined);
  const [handleSubmit, progress, progressStatus] = useHandleSubmit();
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files !== null && e.target.files.length >= 1) {
      setFile(e.target.files[0]);
    }
  };
  return (
    <div className="form-group row">
      <label className="col-sm-2 col-form-label">File</label>
      <div className="col-sm-10">
        <input
          type="file"
          onChange={handleFileSelected}
          className=""
          id="slycat-local-browser-file"
          placeholder="file"
        ></input>
        <div className="progress" style={{ visibility: progress > 0 ? undefined : "hidden" }}>
          <div
            className="progress-bar progress-bar-striped progress-bar-animated"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={100}
            style={{ width: progress?.toString() + "%" }}
          >
            {progressStatus}
          </div>
        </div>
        <SlycatParserControls/>
        <button
          key="Upload File To Server"
          className="btn btn-primary"
          onClick={React.useCallback(() => {
            if (file) {
              handleSubmit(file);
            }
          }, [file, handleSubmit])}
        >
          Upload File
        </button>
      </div>
    </div>
  );
};

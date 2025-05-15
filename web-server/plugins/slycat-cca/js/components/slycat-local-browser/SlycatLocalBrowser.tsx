/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { useHandleLocalFileSubmit } from "../CCAWizardUtils";
import { SlycatParserControls } from "../slycat-parser-controls/SlycatParserControls";

export const SlycatLocalBrowser = (props: { setUploadStatus: (status: boolean) => void }) => {
  const { setUploadStatus } = props;
  const [fileSelected, setFileSelected] = React.useState<boolean>(false);
  const [file, setFile] = React.useState<File | undefined>(undefined);
  const [parser, setParser] = React.useState<string | undefined>(undefined);
  const [handleSubmit, progress, progressStatus] = useHandleLocalFileSubmit();
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files !== null && e.target.files.length >= 1) {
      setFileSelected(true);
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
        <SlycatParserControls setParser={setParser} />
        <button
          key="Upload File To Server"
          disabled={!fileSelected}
          style={{ visibility: progress <= 0 ? "visible" : "hidden" }}
          className="btn btn-primary"
          data-toggle="tooltip"
          data-placement="top"
          title="You must selected a file before continuing."
          onClick={React.useCallback(() => {
            if (file) {
              handleSubmit(file, parser, setUploadStatus);
            }
          }, [file, handleSubmit])}
        >
          {fileSelected ? `Upload File: ${file?.name}` : "Select A File"}
        </button>
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
      </div>
    </div>
  );
};

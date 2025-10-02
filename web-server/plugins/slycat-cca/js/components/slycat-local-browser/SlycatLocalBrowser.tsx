/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { SlycatParserControls } from "../slycat-parser-controls/SlycatParserControls";
import { useAppDispatch, useAppSelector } from "../wizard-store/hooks";
import { selectProgress, selectProgressStatus, setParser } from "../wizard-store/reducers/CCAWizardSlice";

export const SlycatLocalBrowser = (props: { callBack: (status: boolean) => void }) => {
  const dispatch = useAppDispatch();
  const progress = useAppSelector(selectProgress);
  const progressStatus = useAppSelector(selectProgressStatus);
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files !== null && e.target.files.length >= 1) {
      if (e.target.files[0]) {
        props.callBack(true);
      }
    }
  };
  return (
    <div className="form-group row">
      <label className="col-sm-2 col-form-label">File</label>
      <div className="col-sm-10">
        <input
          type="file"
          className=""
          onChange={handleFileSelected}
          id="slycat-local-browser-file"
          placeholder="file"
        ></input>
        <SlycatParserControls
          setParser={React.useCallback(
            (parser: string) => {
              dispatch(setParser(parser));
            },
            [dispatch],
          )}
        />
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

'use strict';
import * as React from 'react';
import ProgressBar from 'components/ProgressBar.tsx';

interface LocalFileUploadProps {
    progressBarProgress: number
}

function LocalFileUpload(props: LocalFileUploadProps) {
    return (
        <div className="form-group row">
        <label htmlFor="slycat-local-browser-file" className="col-sm-2 col-form-label"
            data-bind="css: {'disabled' : disabled}">
            File
        </label>
        <div className="col-sm-10">
            <input type="file" className=""></input>
            <div className="progress" data-bind="visible: progress() != undefined && progress() > 0">
            <ProgressBar
                progress={props.progressBarProgress}
                hidden={false}
            />
            </div>
        </div>
        </div>
    );
  }

export default LocalFileUpload
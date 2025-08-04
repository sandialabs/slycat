import * as React from "react";
import styles from "./RemoteFileBrowser.module.scss";

interface FileBrowserPathInputProps {
  hostname?: string;
  pathInput: string;
  onBrowse: (path: string) => void;
  onPathChange: (path: string) => void;
  onNavigateUp: () => void;
  disabled?: boolean;
}

/**
 * Shared path input component for file browsers
 */
export default function FileBrowserPathInput(props: FileBrowserPathInputProps) {
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      props.onBrowse(props.pathInput);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.onPathChange(e.target.value);
  };

  const handleGoClick = () => {
    props.onBrowse(props.pathInput);
  };

  return (
    <div>
      {props.hostname && (
        <label className="fw-bold justify-content-start mb-2" htmlFor="slycat-remote-browser-path">
          {props.hostname}:
        </label>
      )}
      <div className="form-group row path mb-3">
        <div className="col-sm-12">
          <div className={`input-group ${styles.pathContainer}`}>
            <input
              type="text"
              className="form-control"
              id="slycat-remote-browser-path"
              value={props.pathInput}
              onKeyPress={handleKeyPress}
              onChange={handleChange}
              disabled={props.disabled}
            />
            <button className="btn btn-secondary" onClick={handleGoClick} disabled={props.disabled}>
              Go
            </button>
          </div>
          <div className={`btn-group ${styles.navButtons}`} role="group">
            <button
              className="btn btn-secondary"
              type="button"
              title="Navigate to parent directory"
              onClick={props.onNavigateUp}
              disabled={props.disabled}
            >
              <i className="fa fa-level-up" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

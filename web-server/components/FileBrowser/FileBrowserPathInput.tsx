import * as React from "react";
import styles from "./FileBrowser.module.scss";
import Icon from "components/Icons/Icon";

interface FileBrowserPathInputProps {
  hostname?: string;
  pathInput: string;
  onBrowse: (path: string) => void;
  onPathChange: (path: string) => void;
  onNavigateUp: () => void;
  disabled?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  isAtRoot?: boolean;
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
        <div className="col-sm-12 d-flex flex-row align-items-center">
          <div className={`input-group flex-grow-1 ${styles.pathContainer}`}>
            <input
              type="text"
              className={`form-control ${props.hasError ? "is-invalid" : ""}`}
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
              disabled={props.disabled || props.isAtRoot}
              alex-test="test"
            >
              <Icon type="turn-up" />
            </button>
          </div>
          {props.hasError && props.errorMessage && (
            <div className="invalid-feedback d-block">{props.errorMessage}</div>
          )}
        </div>
      </div>
    </div>
  );
}

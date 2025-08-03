import * as React from "react";
import { useState, useEffect } from "react";
import client from "js/slycat-web-client";
import SlycatSelector, { Option } from "components/SlycatSelector";
import styles from "./RemoteFileBrowser.module.scss";

/**
 * @member hostname name of the host we are connecting
 * (assumes we have a connection already to the host)
 * @member persistenceId uuid for local storage
 * @member onSelectFileCallBack called every time a file is selected
 * returns the files info (path, file.type, file:FileMetaData)
 * @member onSelectParserCallBack called every time a parser is selected
 * returns the parser type (dakota or csv)
 * @member onReauthCallBack called every time we lose connection to the host
 * @member selectedOption optional string for parser selection (required when showSelector is true)
 * @member showSelector optional boolean to control whether selector is shown (defaults to true)
 * @member useSMB optional boolean to use SMB browsing instead of regular SSH browsing (defaults to false)
 * @export
 * @interface RemoteFileBrowserProps
 */
export interface RemoteFileBrowserProps {
  hostname: string;
  persistenceId?: string;
  onSelectFileCallBack: Function;
  onSelectParserCallBack: Function;
  onReauthCallBack: Function;
  selectedOption?: string;
  showSelector?: boolean;
  useSMB?: boolean;
}

/**
 * @member type file type
 * @member name filename
 * @member size size of file
 * @member mtime last accessed time
 * @member mimeType type of file
 * @interface FileMetaData
 */
interface FileMetaData {
  type: string;
  name: string;
  size: string;
  mtime: string;
  mimeType: string;
}

/**
 * used to create a file browsing window like using 'ls' and 'cd' in a linux terminal
 *
 * @export
 * @param props RemoteFileBrowserProps
 */
export default function RemoteFileBrowser(props: RemoteFileBrowserProps) {
  const [path, setPath] = useState("/"); // path shown in box
  const [pathInput, setPathInput] = useState("/"); // path to current file when selected
  const [rawFiles, setRawFiles] = useState<FileMetaData[]>([]); // list of the current files meta data we are looking at
  const [pathError, setPathError] = useState(false); // do we have a path error
  const [browseError, setBrowseError] = useState(false); // do we have a browsing error
  const [browserUpdating, setBrowserUpdating] = useState(false); // are we in the middle of getting data
  const [selected, setSelected] = useState(-1); // id of selected file

  const persistenceId = props?.persistenceId ?? "";

  /**
   * given a path return all the items in said path (like ls)
   *
   * @param pathInput path to return all ls properties from
   */
  const browse = (pathInput: string) => {
    // First check if we have a remote connection...
    client.get_remotes_fetch(props.hostname).then((json) => {
      // If we have a session, go on.
      if (json.status) {
        pathInput = pathInput === "" ? "/" : pathInput;
        setRawFiles([]);
        setBrowserUpdating(true);
        setSelected(-1);
        setPath(pathInput);
        setPathInput(pathInput);

        // Use SMB or regular browse method based on props
        const browseMethod = props.useSMB
          ? client.post_remote_browse_smb
          : client.post_remote_browse;

        browseMethod({
          hostname: props.hostname,
          path: pathInput,
          success: (results: any) => {
            localStorage.setItem(
              "slycat-remote-browser-path-" + persistenceId + props.hostname,
              pathInput,
            );
            setBrowseError(false);
            setPathError(false);

            let files: FileMetaData[] = [];
            if (pathInput != "/")
              files.push({
                type: "",
                name: "..",
                size: "",
                mtime: "",
                mimeType: "application/x-directory",
              });
            for (let i = 0; i != results.names.length; ++i)
              files.push({
                name: results.names[i],
                size: results.sizes[i],
                type: results.types[i],
                mtime: results.mtimes[i],
                mimeType: results["mime-types"][i],
              });
            setRawFiles(files);
            setBrowserUpdating(false);
          },
          error: (results: any) => {
            if (path != pathInput) {
              setPathError(true);
              setBrowserUpdating(false);
            }
            if (results.status == 400) {
              alert("bad file path");
            }
            setBrowseError(true);
            setBrowserUpdating(false);
          },
        });
      }
      // Otherwise...we don't have a session anymore, so
      // run the reauth callback if one was passed.
      else {
        if (props.onReauthCallBack) {
          props.onReauthCallBack();
        }
      }
    });
  };

  /**
   * takes a path and returns the directory above it
   *
   * @param path string path
   * @returns new string path one level up
   */
  const pathDirname = (path: string): string => {
    let new_path = path.replace(/\/\.?(\w|\-|\.)*\/?$/, "");
    if (new_path == "") new_path = "/";
    return new_path;
  };

  /**
   * takes left path and right path and joins them
   * @param right string path
   * @param left string path
   * @requires joined paths
   */
  const pathJoin = (left: string, right: string): string => {
    let new_path = left;
    if (new_path.slice(-1) != "/") new_path += "/";
    new_path += right;
    return new_path;
  };

  /**
   * given a file(which includes its full path), browse to the path above it
   *
   * @param file meta data for the file selected to browse up
   * one level from said path
   */
  const browseUpByFile = (file: FileMetaData) => {
    setSelected(-1);
    // If the file is our parent directory, move up the hierarchy.
    if (file.name === "..") {
      browse(pathDirname(path));
    }
    // If the file is a directory, move down the hierarchy.
    else if (file.type === "d") {
      browse(pathJoin(path, file.name));
    }
  };

  const keyPress = (event: any, pathInput: string) => {
    if (event.key == "Enter") {
      // How would I trigger the button that is in the render? I have this so far.
      browse(pathInput);
    }
  };

  /**
   * Given a row id and file info set the selected file and
   * callBack to tell caller Path, file.type, file:FileMetaData
   *
   * @param file an object of FileMetaData
   * @param i index of selected row in the table
   */
  const selectRow = (file: FileMetaData, i: number) => {
    let newPath: string = path;
    const path_split: string[] = path.split("/");

    /**
     * If the user types out the full path, including file name,
     * we don't want to join the file name with the path
     * (resulting in duplicate file names).
     */

    if (path_split[path_split.length - 1] !== file.name) {
      newPath = pathJoin(path, file.name);
    }

    setSelected(i);
    // tell our create what we selected
    props.onSelectFileCallBack(newPath, file.type, file);
  };

  /**
   * takes a list of file info from the state and converts it
   * to an html
   *
   * @returns JSX.Element[] with the styled file list
   */
  const getFilesAsJsx = (): JSX.Element[] => {
    const rawFilesJSX = rawFiles
      .map((rawFile, i) => {
        // For SMB, skip files with no mtime
        if (props.useSMB && !rawFile.mtime) {
          return null;
        }

        return (
          <tr
            className={selected == i ? "table-active" : ""}
            key={i}
            onClick={() => selectRow(rawFile, i)}
            onDoubleClick={() => browseUpByFile(rawFile)}
          >
            <td data-bind-fail="html:icon">
              {rawFile.mimeType === "application/x-directory" ? (
                <span className="fa fa-folder"></span>
              ) : (
                <span className="fa fa-file-o"></span>
              )}
            </td>
            <td data-bind-fail="text:name">{rawFile.name}</td>
            <td data-bind-fail="text:size">{rawFile.size}</td>
            <td data-bind-fail="text:mtime">{rawFile.mtime}</td>
          </tr>
        );
      })
      .filter((item): item is JSX.Element => item !== null); // Filter out null items for TypeScript
    return rawFilesJSX;
  };

  useEffect(() => {
    const storedPath = localStorage.getItem(
      "slycat-remote-browser-path-" + persistenceId + props.hostname,
    );
    if (storedPath != null) {
      setPath(storedPath);
      setPathInput(storedPath);
      browse(pathDirname(storedPath));
    }
  }, []); // Empty dependency array means this runs once on mount

  let options: Option[] = [];
  if (props.selectedOption == "xyce") {
    options = [
      {
        text: "Dakota tabular",
        value: "slycat-dakota-parser",
      },
    ];
  } else {
    options = [
      {
        text: "Comma separated values (CSV)",
        value: "slycat-csv-parser",
      },
      {
        text: "Dakota tabular",
        value: "slycat-dakota-parser",
      },
    ];
  }
  
  return (
    <div className="slycat-remote-browser">
      <label className="fw-bold justify-content-start mb-2" htmlFor="slycat-remote-browser-path">
        {props.hostname}:
      </label>
      <div className="form-group row path mb-3">
        <div className="col-sm-12">
          <div className={`input-group ${styles.pathContainer}`}>
            <input
              type="text"
              className="form-control"
              id="slycat-remote-browser-path"
              value={pathInput}
              onKeyPress={() => keyPress(event, pathInput)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPathInput(e.target.value);
              }}
            />
            <button className="btn btn-secondary" onClick={() => browse(pathInput)}>
              Go
            </button>
          </div>
          <div className={`btn-group ${styles.navButtons}`} role="group">
            <button
              className="btn btn-secondary"
              type="button"
              title="Navigate to parent directory"
              onClick={() => {
                browse(pathDirname(path));
              }}
            >
              <i className="fa fa-level-up" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        {/* <div className="path alert alert-danger" role="alert">
                Oops, that path is not accessible. Please try again.
              </div> */}
      </div>

      {!browserUpdating ? (
        <div className={`${styles.fileTable} mb-3`}>
          <table className={`table table-hover table-sm ${styles.table}`}>
            <thead className="thead-light">
              <tr>
                <th></th>
                <th>Name</th>
                <th>Size</th>
                <th>Date Modified</th>
              </tr>
            </thead>
            <tbody>{getFilesAsJsx()}</tbody>
          </table>
        </div>
      ) : (
        <button className="btn btn-primary" type="button" disabled>
          <span
            className="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
          ></span>
          Loading...
        </button>
      )}
      {props.showSelector !== false && props.selectedOption && (
        <SlycatSelector
          onSelectCallBack={props.onSelectParserCallBack}
          label={"Filetype"}
          options={options}
        />
      )}
    </div>
  );
}

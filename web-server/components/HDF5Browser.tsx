import * as React from "react";
import { useState, useEffect } from "react";
import client from "js/slycat-web-client";
import { Option } from "components/SlycatSelector";

/**
 * @member hostname name of the host we are connecting
 * (assumes we have a connection already to the host)
 * @member persistenceId uuid for local storage
 * @member onSelectFileCallBack called every time a file is selected
 * returns the files info (path, file.type, file:FileMetaData)
 * @member onSelectParserCallBack called every time a parser is selected
 * returns the parser type (dakota or csv)
 * @member onReauthCallBack called every time we lose connection to the host
 * @export
 * @interface HDF5BrowserProps
 */
export interface HDF5BrowserProps {
  hostname: string;
  persistenceId?: string;
  onSelectFileCallBack: Function;
  onSelectParserCallBack: Function;
  onReauthCallBack: Function;
  pid: string;
  mid: string;
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
 * @param props HDF5BrowserProps
 */
export default function HDF5Browser(props: HDF5BrowserProps) {
  const [path, setPath] = useState("//"); // path shown in box
  const [pathInput, setPathInput] = useState("//"); // path to current file when selected
  const [rawFiles, setRawFiles] = useState<FileMetaData[]>([]); // list of the current files meta data we are looking at
  const [pathError, setPathError] = useState(false); // do we have a path error
  const [browseError, setBrowseError] = useState(false); // do we have a browsing error
  const [browserUpdating, setBrowserUpdating] = useState(false); // are we in the middle of getting data
  const [selected, setSelected] = useState(-1); // id of selected file

  const persistenceId = props?.persistenceId ?? ""; // uuid add to get local storage say if there were

  /**
   * given a path return all the items in said path (like ls)
   *
   * @param pathInput path to return all ls properties from
   */
  const browse = (pathInput: string) => {
    let first_char = Array.from(pathInput)[0];
    if (first_char != "/") {
      pathInput = "/" + pathInput;
    }
    setPathInput(pathInput);
    pathInput = pathInput.replace(/(?!^)\//g, "-");
    client.post_browse_hdf5({
      hostname: props.hostname,
      path: pathInput,
      pid: props.pid,
      mid: props.mid,
      success: (results: any) => {
        localStorage.setItem(
          "slycat-remote-browser-path-" + persistenceId + props.hostname,
          pathInput,
        );
        setBrowseError(false);
        setPathError(false);
        let json_results = JSON.parse(results);
        let files: FileMetaData[] = [];
        if (pathInput != "/")
          files.push({
            type: "",
            name: "..",
            size: "",
            mtime: "",
            mimeType: "application/x-directory",
          });
        for (let i = 0; i != json_results["name"].length; ++i)
          files.push({
            name: json_results["name"][i],
            size: json_results["sizes"][i],
            type: json_results["types"][i],
            mtime: json_results["mtimes"][i],
            mimeType: json_results["mime-types"][i],
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
  };

  /**
   * takes a path and returns the directory above it
   *
   * @param path string path
   * @returns new string path one level up
   */
  const pathDirname = (path: string): string => {
    let new_path = path.replace(/\/\.?(\w|\-|\.)*\/?$/, "");
    if (new_path == "") new_path = "//";
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

  const browseUpDirectory = (currentPath: string) => {
    let split_path = currentPath.split("/");
    let parent_directory = "";
    for (let i = 1; i < split_path.length - 1; i++) {
      parent_directory = parent_directory + "/" + split_path[i];
    }
    if (parent_directory == "/" || parent_directory == "") {
      parent_directory = "//";
    }
    browse(parent_directory);
  };

  /**
   * given a file(which includes its full path), browse to the path above it
   *
   * @param file meta data for the file selected to browse up
   * one level from said path
   */
  const browseUpByFile = (file: FileMetaData) => {
    setSelected(-1);
    // If it's a table, need to parse
    if (file.type === "f") {
      // callback
    }

    // If the file is our parent directory, move up the hierarchy.
    if (file.name === "..") {
      browse(pathDirname(pathInput));
    }
    // If the file is a directory, move down the hierarchy.
    else if (file.type === "d") {
      let current_path = pathInput;
      let new_path = "";
      if (current_path == "//") {
        current_path = current_path.substring(1);
        new_path = current_path + file.name;
      } else {
        new_path = current_path + "/" + file.name;
      }
      let substr = new_path.substring(0, 2);
      if (substr == "//") {
        new_path = new_path.substring(1);
      }
      browse(new_path);
    }
  };

  const keyPress = (event: any, pathInput: string) => {
    if (event.key == "Enter") {
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
    props.onSelectFileCallBack(pathInput + "/" + file.name, file.type, file);
  };

  /**
   * takes a list of file info from the state and converts it
   * to an html
   *
   * @returns JSX.Element[] with the styled file list
   */
  const getFilesAsJsx = (): JSX.Element[] => {
    const rawFilesJSX = rawFiles.map((rawFile, i) => {
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
    });
    return rawFilesJSX;
    // if(file.mime_type() in component.icon_map)
    // {
    //   icon = component.icon_map[file.mime_type()];
    // }
    // else if(_.startsWith(file.mime_type(), "text/"))
    // {
    //   icon = "<span class='fa fa-file-text-o'></span>";
    // }
    // else if(_.startsWith(file.mime_type(), "image/"))
    // {
    //   icon = "<span class='fa fa-file-image-o'></span>";
    // }
    // else if(_.startsWith(file.mime_type(), "video/"))
    // {
    //   icon = "<span class='fa fa-file-video-o'></span>";
    // }
  };

  useEffect(() => {
    // const path = localStorage.getItem("slycat-remote-browser-path-"
    //   + persistenceId
    //   + props.hostname);
    if (pathInput != null) {
      // setPath(path);setPathInput(path);
      browse(pathInput);
    }
  }, []); // Empty dependency array means this runs once on mount

  const options: Option[] = [
    {
      text: "Comma separated values (CSV)",
      value: "slycat-csv-parser",
    },
    {
      text: "Dakota tabular",
      value: "slycat-dakota-parser",
    },
  ];
  const pathStyle: any = {
    width: "calc(100% - 44px)",
    float: "left",
    marginRight: "5px",
  };
  const styleTable: any = {
    position: "relative",
    height: window.innerHeight * 0.4 + "px",
    overflow: "auto",
    display: "block",
    border: "1px solid rgb(222, 226, 230)",
  };
  return (
    <div className="slycat-remote-browser">
      <div className="form-group row path mb-3">
        <div className="col-sm-12">
          <div className="input-group" style={pathStyle}>
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
          <div className="btn-group" role="group" style={{ float: "right" }}>
            <button
              className="btn btn-secondary"
              type="button"
              title="Navigate to parent directory"
              onClick={() => {
                browseUpDirectory(pathInput);
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
        <div style={styleTable} className="mb-3">
          <table
            className="table table-hover table-sm"
            style={{ borderBottom: "1px solid rgb(222, 226, 230)" }}
          >
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
    </div>
  );
}

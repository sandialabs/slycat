import * as React from "react";
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
 * @member path path shown in box
 * @member pathInput path to current file when selected
 * @member persistenceId uuid add to get local storage say if there were
 * two of these classes being used
 * @member rawFiles list of the current files meta data we are looking at
 * @member pathError do we have a path error
 * @member browseError do we have a browsing error
 * @member browserUpdating are we in the middle of getting data
 * @member selected id of selected file
 * @export
 * @interface HDF5BrowserState
 */
export interface HDF5BrowserState {
  path: string;
  pathInput: string;
  persistenceId: string;
  rawFiles: FileMetaData[];
  pathError: boolean;
  browseError: boolean;
  browserUpdating: boolean;
  selected: number;
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
 * @class RemoteFileBrowser
 * @extends {React.Component<HDF5BrowserProps, HDF5BrowserState>}
 */
export default class HDF5Browser extends React.Component<HDF5BrowserProps, HDF5BrowserState> {
  public constructor(props: HDF5BrowserProps) {
    super(props);
    this.state = {
      path: "//",
      pathInput: "//",
      rawFiles: [],
      pathError: false,
      browseError: false,
      persistenceId: props.persistenceId === undefined ? "" : props.persistenceId,
      browserUpdating: false,
      selected: -1,
      pid: props.pid,
      mid: props.mid,
    };
  }

  /**
   * given a path return all the items in said path (like ls)
   *
   * @param pathInput path to return all ls properties from
   * @private
   * @memberof HDF5Browser
   */
  private browse = (pathInput: string) => {
    let first_char = Array.from(pathInput)[0];
    if (first_char != "/") {
      pathInput = "/" + pathInput;
    }
    this.setState({ pathInput: pathInput });
    pathInput = pathInput.replace(/(?!^)\//g, "-");
    client.post_browse_hdf5({
      hostname: this.props.hostname,
      path: pathInput,
      pid: this.props.pid,
      mid: this.props.mid,
      success: (results: any) => {
        localStorage.setItem(
          "slycat-remote-browser-path-" + this.state.persistenceId + this.props.hostname,
          pathInput,
        );
        this.setState({
          browseError: false,
          pathError: false,
        });
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
        this.setState({
          rawFiles: files,
          browserUpdating: false,
        });
      },
      error: (results: any) => {
        if (this.state.path != this.state.pathInput) {
          this.setState({ pathError: true, browserUpdating: false });
        }
        if (results.status == 400) {
          alert("bad file path");
        }
        this.setState({ browseError: true, browserUpdating: false });
      },
    });
  };

  /**
   * takes a path and returns the directory above it
   *
   * @param path string path
   * @private
   * @returns new string path one level up
   * @memberof RemoteFileBrowser
   */
  private pathDirname = (path: string): string => {
    var new_path = path.replace(/\/\.?(\w|\-|\.)*\/?$/, "");
    if (new_path == "") new_path = "//";
    return new_path;
  };

  /**
   * takes left path and right path and joins them
   * @param right string path
   * @param left string path
   * @private
   * @requires joined paths
   * @memberof RemoteFileBrowser
   */
  private pathJoin = (left: string, right: string): string => {
    var new_path = left;
    if (new_path.slice(-1) != "/") new_path += "/";
    new_path += right;
    return new_path;
  };

  private browseUpDirectory = (currentPath: string) => {
    let split_path = currentPath.split("/");
    let parent_directory = "";
    for (let i = 1; i < split_path.length - 1; i++) {
      parent_directory = parent_directory + "/" + split_path[i];
    }
    if (parent_directory == "/" || parent_directory == "") {
      parent_directory = "//";
    }
    this.browse(parent_directory);
  };

  /**
   * given a file(which includes its full path), browse to the path above it
   *
   * @param file meta data for the file selected to browse up
   * one level from said path
   * @private
   * @memberof RemoteFileBrowser
   */
  private browseUpByFile = (file: FileMetaData) => {
    this.setState({ selected: -1 });
    // If it's a table, need to parse
    if (file.type === "f") {
      // callback
    }

    // If the file is our parent directory, move up the hierarchy.
    if (file.name === "..") {
      this.browse(this.pathDirname(this.state.pathInput));
    }
    // If the file is a directory, move down the hierarchy.
    else if (file.type === "d") {
      let current_path = this.state.pathInput;
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
      this.browse(new_path);
    }
  };

  keyPress = (event: any, pathInput: string) => {
    if (event.key == "Enter") {
      this.browse(pathInput);
    }
  };

  /**
   * Given a row id and file info set the selected file and
   * callBack to tell caller Path, file.type, file:FileMetaData
   *
   * @param file an object of FileMetaData
   * @param i index of selected row in the table
   * @private
   * @memberof RemoteFileBrowser
   */
  private selectRow = (file: FileMetaData, i: number) => {
    let newPath: string = this.state.path;
    const path_split: string[] = this.state.path.split("/");

    /**
     * If the user types out the full path, including file name,
     * we don't want to join the file name with the path
     * (resulting in duplicate file names).
     */

    if (path_split[path_split.length - 1] !== file.name) {
      newPath = this.pathJoin(this.state.path, file.name);
    }

    this.setState({ selected: i }, () => {
      // tell our create what we selected
      this.props.onSelectFileCallBack(this.state.pathInput + "/" + file.name, file.type, file);
    });
  };

  /**
   * takes a list of file info from the state and converts it
   * to an html
   *
   * @private
   * @memberof RemoteFileBrowser
   * @returns JSX.Element[] with the styled file list
   */
  private getFilesAsJsx = (): JSX.Element[] => {
    const rawFilesJSX = this.state.rawFiles.map((rawFile, i) => {
      return (
        <tr
          className={this.state.selected == i ? "table-active" : ""}
          key={i}
          onClick={() => this.selectRow(rawFile, i)}
          onDoubleClick={() => this.browseUpByFile(rawFile)}
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

  public async componentDidMount() {
    // const path = localStorage.getItem("slycat-remote-browser-path-"
    //   + this.state.persistenceId
    //   + this.props.hostname);
    if (this.state.pathInput != null) {
      // this.setState({path,pathInput:path});
      this.browse(this.state.pathInput);
    }
  }

  public render() {
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
                value={this.state.pathInput}
                onKeyPress={() => this.keyPress(event, this.state.pathInput)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  this.setState({ pathInput: e.target.value });
                }}
              />
              <div className="input-group-append">
                <button
                  className="btn btn-secondary"
                  onClick={() => this.browse(this.state.pathInput)}
                >
                  Go
                </button>
              </div>
            </div>
            <div className="btn-group" role="group" style={{ float: "right" }}>
              <button
                className="btn btn-secondary"
                type="button"
                title="Navigate to parent directory"
                onClick={() => {
                  this.browseUpDirectory(this.state.pathInput);
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

        {!this.state.browserUpdating ? (
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
              <tbody>{this.getFilesAsJsx()}</tbody>
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
}

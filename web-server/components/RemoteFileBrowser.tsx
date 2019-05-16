import * as React from 'react';
import client from "../js/slycat-web-client";
export interface RemoteFileBrowserProps { 
  hostname: string
  persistenceId?: string
  onSelectFileCallBack: Function
}

export interface RemoteFileBrowserState {
  path:string
  pathInput:string
  persistenceId:string
  rawFiles: FileMetaData[]
  pathError: boolean
  browseError: boolean
  browserUpdating: boolean
  selected:number
}

interface FileMetaData {
  type: string
  name: string
  size: string
  mtime: string
  mimeType: string
}

// TODO: comment all the functions and interfaces
export default class RemoteFileBrowser extends React.Component<RemoteFileBrowserProps, RemoteFileBrowserState> {
    public constructor(props:RemoteFileBrowserProps) {
      super(props)
      this.state = {
        path:"/",
        pathInput: "/",
        rawFiles: [],
        pathError: false,
        browseError: false,
        persistenceId: props.persistenceId === undefined ? '' : props.persistenceId,
        browserUpdating: false,
        selected:-1
      }
    }

    private browse = (pathInput:string) =>
    {
      pathInput = (pathInput === ""?"/":pathInput);
      console.log(`pathInput::${pathInput}`)
      this.setState({
        rawFiles:[], 
        browserUpdating:true, 
        selected:-1,
        path:pathInput,
        pathInput
      })
      client.post_remote_browse(
      {
        hostname : this.props.hostname,
        path : pathInput,
        success : (results:any) =>
        {
          console.log(pathInput)
          localStorage.setItem("slycat-remote-browser-path-" + this.state.persistenceId + this.props.hostname, pathInput);
          this.setState({
            browseError:false,
            pathError:false,
          });

          let files: FileMetaData[] = []
          if(pathInput != "/")
            files.push({type: "", name: "..", size: "", mtime: "", mimeType:"application/x-directory"});
          for(let i = 0; i != results.names.length; ++i)
            files.push({name:results.names[i], size:results.sizes[i], type:results.types[i], mtime:results.mtimes[i], mimeType:results["mime-types"][i]});
          this.setState({
            rawFiles:files,
            browserUpdating:false
          });
        },
        error : (results:any) =>
        {
          if(this.state.path != this.state.pathInput)
          {
            this.setState({pathError:true, browserUpdating:false});
          }
          if(results.status == 400){
            alert("bad file path")
          }
          this.setState({browseError:true, browserUpdating:false});
        }
      });
    }

    private pathDirname = (path:string):string =>
    {
      var new_path = path.replace(/\/\.?(\w|\-|\.)*\/?$/, "");
      if(new_path == "")
        new_path = "/";
      return new_path;
    }

    private pathJoin = (left:string, right:string):string =>
    {
      var new_path = left;
      if(new_path.slice(-1) != "/")
        new_path += "/";
      new_path += right;
      return new_path;
    }

    private browseUpByFile = (file:FileMetaData) => {
      // If the file is our parent directory, move up the hierarchy.
      if(file.name === "..")
      {
        this.browse(this.pathDirname(this.state.path));
      }
      // If the file is a directory, move down the hierarchy.
      else if(file.type === "d")
      {
        this.browse(this.pathJoin(this.state.path, file.name));
      }
    }

    private selectRow = (file:FileMetaData, i:number) => {
      const newPath:string = this.pathJoin(this.state.path, file.name);
      this.setState({selected:i})
      // tell our create what we selected
      this.props.onSelectFileCallBack(newPath, file.type, file);
    }

    private getFilesAsJsx = ():JSX.Element[] => {
      const rawFilesJSX = this.state.rawFiles.map((rawFile, i) => {
        return (
          <tr 
          className={this.state.selected==i?'selected':''} 
          key={i} 
          onClick={()=>this.selectRow(rawFile,i)}
          onDoubleClick={()=> this.browseUpByFile(rawFile)}>
            <td data-bind-fail="html:icon">
              {rawFile.mimeType === "application/x-directory"?
              <span className='fa fa-folder'></span>:
              <span className='fa fa-file-o'></span>}
            </td>
            <td data-bind-fail="text:name">{rawFile.name}</td>
            <td data-bind-fail="text:size">{rawFile.size}</td>
            <td data-bind-fail="text:mtime">{rawFile.mtime}</td>
          </tr>
        )
      })
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
    }

    public async componentDidMount() {
      const path = localStorage.getItem("slycat-remote-browser-path-" 
        + this.state.persistenceId 
        + this.props.hostname);
      if(path != null){
        this.setState({path,pathInput:path});
        await this.browse(this.pathDirname(path));
      }
    }
    public render() {
      return (
        <div className="slycat-remote-browser">
            <div className="form-group path" data-bind-fail="css: {'is-invalid': path_error}">

              <label className="col-sm-3">
              {this.props.hostname}
              </label>

              <div className="col-sm-10">
                <div className="input-group" 
                  style={{
                    width: 'calc(100% - 44px)',
                    float: 'left',
                    marginRight: '5px'
                  }}>
                  <input type="text" className="form-control" id="slycat-remote-browser-path" 
                    value={this.state.pathInput}
                    onChange={(e:React.ChangeEvent<HTMLInputElement>) => {
                        this.setState({pathInput:e.target.value})
                      }
                    }
                  />
                  <div className="input-group-append">
                    <button className="btn btn-secondary"  onClick={() => this.browse(this.state.pathInput)}>Go</button>
                  </div>
                </div>
                <div className="btn-group" role="group" style={{float: 'right'}}>
                  <button className="btn btn-secondary" type="button" title="Navigate to parent directory"
                    onClick={() => {
                      this.browse(this.pathDirname(this.state.path))}
                    }
                    // disabled={this.state.path === '/'}
                    data-bind-fail="
                    click:up,
                    disable:path()=='/'
                  ">
                    <i className="fa fa-level-up" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
                {/* <div className="path alert alert-danger" role="alert">
                  Oops, that path is not accessible. Please try again.
                </div> */}
            </div>
          
          {!this.state.browserUpdating?
          <div
          style={{
            position: "relative",
            height: (window.innerHeight*0.5)+"px",
            overflow: "auto",
            display: "block"
          }}
          >
            <table className="table table-hover table-bordered">
              <thead className="thead-light">
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Date Modified</th>
                </tr>
              </thead>
              <tbody>
                  {this.getFilesAsJsx()}
              </tbody>
            </table>
          </div>:
          <button className="btn btn-primary" type="button" disabled>
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Loading...
          </button>}
        </div>
    );
    }
}
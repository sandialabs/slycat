import * as React from 'react';
import client from "../js/slycat-web-client";
export interface RemoteFileBrowserProps { 
  hostname: string
  persistenceId?: string
}

export interface RemoteFileBrowserState {
  path:string
  pathInput:string
  persistenceId:string
  rawFiles: FileMetaData[]
  pathError: boolean
  browseError: boolean
  browserUpdating: boolean
}

interface FileMetaData {
  type: string
  name: string
  size: string
  mtime: string
  mime_type: string
}

// 'HelloProps' describes the shape of props.
// State is never set so we use the '{}' type.
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
        browserUpdating: false
      }
    }

    browse = (pathInput:string) =>
    {
      console.log(`pathInput::${pathInput}`)
      client.post_remote_browse(
      {
        hostname : this.props.hostname,
        path : this.state.path,
        success : (results:any) =>
        {
          localStorage.setItem("slycat-remote-browser-path-" + this.state.persistenceId + this.props.hostname, this.state.path);
          this.setState({
            browseError:false,
            pathError:false,
            browserUpdating:true,
            path:pathInput
          });

          let files: FileMetaData[] = []
          if(pathInput != "/")
            files.push({type: "", name: "..", size: "", mtime: "", mime_type:"application/x-directory"});
          for(let i = 0; i != results.names.length; ++i)
            files.push({name:results.names[i], size:results.sizes[i], type:results.types[i], mtime:results.mtimes[i], mime_type:results["mime-types"][i]});
          this.setState({rawFiles:files});
          this.setState({browserUpdating:false});
        },
        error : (results:any) =>
        {
          if(this.state.path != this.state.pathInput)
          {
            this.setState({pathError:true});
          }
          this.setState({browseError:true});
        }
      });
    }

    public render() {
      return (
        <div className="slycat-remote-browser">
            <div className="form-group row path" data-bind-fail="css: {'is-invalid': path_error}">
              <label className="col-sm-2 col-form-label"
              >{this.props.hostname}</label>
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
                      console.log(`${e.target.value}`)
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
                    data-bind-fail="
                    click:up,
                    disable:path()=='/'
                  ">
                    <i className="fa fa-level-up" aria-hidden="true"></i>
                  </button>
                </div>
                {/* <div className="alert alert-danger" role="alert" data-bind-fail="fadeError: browse_error">
                  Oops, that path is not accessible. Please try again.
                </div> */}
              </div>
            </div>
          {/*
          <div className="slycat-remote-browser-files" data-bind-fail="updateFeedback: browser_updating">
            <table className="table table-hover table-sm">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Date Modified</th>
                </tr>
              </thead>
              <tbody data-bind-fail="foreach: files">
                <tr data-bind-fail="
                  event:{click : $parent.select, dblclick : $parent.open},
                  css:{directory:type()=='d', file:type()=='f', selected:selected()}
                ">
                  <td data-bind-fail="html:icon"></td>
                  <td data-bind-fail="text:name"></td>
                  <td data-bind-fail="text:size"></td>
                  <td data-bind-fail="text:mtime"></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="progress" data-bind-fail="visible: progress() != undefined && progress() > 0">
            <div className="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" 
              aria-valuemin="0" 
              aria-valuemax="100" 
              data-bind-fail="
                attr: {'aria-valuenow' : progress},
                style: {'width' : progress() + '%'},
                text: progress_status,
            ">
              Uploading
            </div>
          </div> */}
        </div>
    );
    }
}
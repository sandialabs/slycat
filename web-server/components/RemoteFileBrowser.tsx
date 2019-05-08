import * as React from 'react';

export interface RemoteFileBrowserProps { 
  userName: string; 
}

// 'HelloProps' describes the shape of props.
// State is never set so we use the '{}' type.
export default class RemoteFileBrowser extends React.Component<RemoteFileBrowserProps, {}> {
    public constructor(props:RemoteFileBrowserProps) {
      super(props)
      this.state = {
        path:"/"
      }
    }
    public render() {
      return (

        <div className="slycat-remote-browser" data-bind-fail="css: persistence_id">
          runnning
          <form data-bind-fail="submit: browse_path">
            <div className="form-group row path" data-bind-fail="css: {'is-invalid': path_error}">
              <label className="col-sm-2 col-form-label"
                data-bind-fail="text: hostname()"
              ></label>
              <div className="col-sm-10">
                <div className="input-group" 
                  style={{
                    width: 'calc(100% - 44px)',
                    float: 'left',
                    marginRight: '5px'
                  }}>
                  <input type="text" className="form-control" id="slycat-remote-browser-path" 
                    data-bind-fail="value: path_input"
                  />
                  <div className="input-group-append">
                    <button className="btn btn-secondary" type="submit">Go</button>
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
          </form>
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
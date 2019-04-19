import React, {Component} from 'react';
import client from "js/slycat-web-client";

export default class SlycatRemoteControls extends Component {
    constructor(props) {
      super(props);
      this.state = {
        remote_hosts: [],
        enable: true,
        hostname: '',
        username: '',
        use_remote: () =>{},
        session_exists: false,
      };
    }
    componentDidMount(){
      // this.getRemoteHosts();
    }
    getRemoteHosts = () => {

      client.get_configuration_remote_hosts(
      {
        success: function(remote_hosts)
        {
          // var current_host = component.hostname();
          remote_hosts.sort(function(left, right)
          {
            return left.hostname == right.hostname ? 0 : left.hostname < right.hostname ? -1 : 1;
          });
          this.setState({remote_hosts});
          // component.hostname(current_host || component.hostname());
        }
      });
    }
    populateDisplay = () => {
      const display = {};
      if(localStorage.getItem("slycat-remote-controls-hostname")){
        display.hostName = localStorage.getItem("slycat-remote-controls-hostname") ?
        localStorage.getItem("slycat-remote-controls-hostname"):"";
      };
      if(localStorage.getItem("slycat-remote-controls-username")){
        display.userName = localStorage.getItem("slycat-remote-controls-username") ?
        localStorage.getItem("slycat-remote-controls-username"):null;
      };
      return display;
    }
    render() {
      const display = this.populateDisplay();
      console.log(`in Render hostname ${display.hostName} username ${display.userName}`)
      return (
        <div>
          <div className="form-group row">
            <label className="col-sm-2 col-form-label" data-bind-old="css: {'disabled' : !enable()}">Hostname</label>
            <div className="col-sm-10">
              <div className="input-group">
                <div className="input-group-prepend">
                  <button type="button" className="btn btn-secondary dropdown-toggle" data-toggle="dropdown" aria-expanded="false"></button>
                  <ul className="dropdown-menu" role="menu" data-bind-old="foreach:remote_hosts">
                    <li><a data-bind-old="click:$parent.use_remote($data),text:hostname"></a></li>
                  </ul>
                </div>
                <input className="form-control" type="text" data-bind-old="enable:enable, textInput:hostname"></input>
              </div>
            </div>
          </div>
          {/* <!-- ko if: ispasswordrequired.ssh_passwordrequired --> */}
          <div className="form-group row" data-bind-old="visible: !session_exists()">
            <label className="col-sm-2 col-form-label" data-bind-old="css: {'disabled' : !enable()}">Username</label>
            <div className="col-sm-10">
              <input className="form-control" type="text" data-bind-old="enable:enable, textInput:username"></input>
            </div>
          </div>
          <div className="form-group row" data-bind-old="visible: !session_exists()">
            <label className="col-sm-2 col-form-label" data-bind-old="css: {'disabled' : !enable()}">Password</label>
            <div className="col-sm-10">
              <input className="form-control" type="password" data-bind-old="enable:enable, textInput:password"></input>
            </div>
          </div>
          <div className="row">
            <div className="col-sm-offset-2 col-sm-10">
              <div className="alert fade" role="alert" data-bind-old="css:status_classNamees,text:status"></div>
            </div>
          </div>

        </div>
      );
    };
}
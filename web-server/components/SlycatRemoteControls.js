import React, {Component} from 'react';
import client from "js/slycat-web-client";

export default class SlycatRemoteControls extends Component {
    constructor(props) {
      super(props);
      const display = this.populateDisplay();
      this.state = {
        remote_hosts: [],
        enable: true,
        hostName: display.hostName?display.hostName:null,
        userName: display.userName?display.userName:null,
        session_exists: false,
        password: "",
        hostNames : []
      };
      console.log(this.state);
    }
    componentDidMount(){
      console.log(this.getRemoteHosts());
    }
    getRemoteHosts = () => {
      // fetch(`http://jsonplaceholder.typicode.com/posts`)
      // .then(result=>result.json())
      // .then(items=>this.setState({items}))
      client.get_configuration_remote_hosts(
      {
        success: function(remote_hosts)
        {
          // var current_host = component.hostname();
          remote_hosts.sort(function(left, right)
          {
            return left.hostname == right.hostname ? 0 : left.hostname < right.hostname ? -1 : 1;
          });
          // this.setState({password:"word"});
          console.log(remote_hosts);
          // component.hostname(current_host || component.hostname());
        }
      });
    }
    populateDisplay = () => {
      const display = {};
      if(localStorage.getItem("slycat-remote-controls-hostname")){
        display.hostName = localStorage.getItem("slycat-remote-controls-hostname") ?
        localStorage.getItem("slycat-remote-controls-hostname"):null;
      };
      if(localStorage.getItem("slycat-remote-controls-username")){
        display.userName = localStorage.getItem("slycat-remote-controls-username") ?
        localStorage.getItem("slycat-remote-controls-username"):null;
      };
      return display;
    }
    onValueChange = (value, type) => {
      console.log(value);
      console.log(type);
      switch(type) {
        case "userName":
          localStorage.setItem("slycat-remote-controls-username", value);
          this.setState({userName: value})
          break;
        case "hostName":
          localStorage.setItem("slycat-remote-controls-hostname", value);
          this.setState({hostName: value})
          break;
        case "password":
          this.setState({password: value})
          break;
        default:
          throw new Error("bad Case");
      }

    }
    componentWillUnmount = () => {
      const display = this.populateDisplay();
      const state = {
        remote_hosts: [],
        enable: true,
        hostName: display.hostName?display.hostName:null,
        userName: display.userName?display.userName:null,
        use_remote: () =>{},
        session_exists: false,
        password: null
      };
      this.setState(state);
    }
    render() {
      console.log(`state ${JSON.stringify(this.state)}`)
      return (
        <div>
          <div className="form-group row">
            <label className="col-sm-2 col-form-label">Hostname</label>
            <div className="col-sm-10">
              <div className="input-group">
                <div className="dropdown">
                  <button className="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                  {this.state.hostName}
                  </button>
                  <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
                    <a className="dropdown-item" onClick={(e)=>this.onValueChange(e.target.text, "hostName")}>Action</a>
                  </div>
                </div>
                <input className="form-control" value={this.state.hostName?this.state.hostName:""} type="text" 
                onChange={(e)=>this.onValueChange(e.target.value, "hostName")}></input>
              </div>
            </div>
          </div>
          {/* <!-- ko if: ispasswordrequired.ssh_passwordrequired --> */}
          <div className="form-group row" data-bind-old="visible: !session_exists()">
            <label className="col-sm-2 col-form-label">Username</label>
            <div className="col-sm-10">
              <input className="form-control" type="text" 
              value={this.state.userName?this.state.userName:""} 
              onChange={(e)=>this.onValueChange(e.target.value, "userName")}></input>
            </div>
          </div>
          <div className="form-group row" data-bind-old="visible: !session_exists()">
            <label className="col-sm-2 col-form-label">Password</label>
            <div className="col-sm-10">
              <input className="form-control" type="password" 
              onChange={(e)=>this.onValueChange(e.target.value, "password")}></input>
            </div>
          </div>
          <div className="row">
            <div className="col-sm-offset-2 col-sm-10">
              <div className="alert fade" role="alert"></div>
            </div>
          </div>

        </div>
      );
    };
}
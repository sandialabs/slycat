import React, {Component} from 'react';
import client from "js/slycat-web-client";

export default class SlycatRemoteControls extends Component {
    constructor(props) {
      super(props);
      const display = this.populateDisplay();
      this.state = {
        remote_hosts: [],
        hostName: display.hostName?display.hostName:null,
        userName: display.userName?display.userName:null,
        session_exists: false,
        password: "",
        hostNames : []
      };
    }
    buildHostNames = (json) => {
      this.setState({hostNames:json});
    }
    checkRemoteStatus(hostName){
      console.log(hostName);
    }
    updateRemoteStatus(json){
      console.log(json);
    }
    getRemoteHosts = () => {
      client.get_configuration_remote_hosts_fetch(this.buildHostNames)
    }
    componentDidMount(){
      this.getRemoteHosts();
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
      switch(type) {
        case "userName":
          localStorage.setItem("slycat-remote-controls-username", value);
          this.setState({userName: value})
          break;
        case "hostName":
          localStorage.setItem("slycat-remote-controls-hostname", value);
          this.checkRemoteStatus(value)
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
      const hostNamesJSX = this.state.hostNames.map((hostnameObject, i) => {
        return (
        <a className="dropdown-item" key={i} onClick={(e)=>this.onValueChange(e.target.text, "hostName")}>{hostnameObject.hostname}</a>
        )
      })
      return (
        <div>
          <div className="form-group row">
            <label className="col-sm-2 col-form-label">Hostname</label>
            <div className="col-sm-10">
              <div className="input-group">
                <div className="dropdown">
                  <button className="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                  </button>
                  <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
                  {hostNamesJSX}
                  </div>
                </div>
                <input className="form-control" value={this.state.hostName?this.state.hostName:""} type="text" 
                onChange={(e)=>this.onValueChange(e.target.value, "hostName")}></input>
              </div>
            </div>
          </div>
          {/* <!-- ko if: ispasswordrequired.ssh_passwordrequired --> */}
          {true?<div>
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
          </div>:null}
          <div className="row">
            <div className="col-sm-offset-2 col-sm-10">
              <div className="alert fade" role="alert"></div>
            </div>
          </div>

        </div>
      );
    };
}
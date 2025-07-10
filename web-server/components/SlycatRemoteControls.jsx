import React, { Component } from "react";
import client from "js/slycat-web-client";
import ConnectButton from "components/ConnectButton.tsx";
import { REMOTE_AUTH_LABELS } from "../utils/ui-labels";

/**
 * this class sets up and tests a remote session to an agent
 */
export default class SlycatRemoteControls extends Component {
  /**
   *Creates an instance of SlycatRemoteControls.
   * @param {callBack, ConnectButton} props,
   * callback: function
   * where hostname, username, password, and session exist are return to the callee
   * every time the hostname is changed. session exist should always be checked before
   * moving on in in your logic structure.
   * connectButton: bool tells UI to include connect
   * @memberof SlycatRemoteControls
   */
  constructor(props) {
    super(props);
    const display = this.populateDisplay();
    this.state = {
      remote_hosts: [],
      showConnectButton: this.props.showConnectButton ? this.props.showConnectButton : false,
      hostname: display.hostname ? display.hostname : null,
      username: display.username ? display.username : null,
      session_exists: null,
      password: "",
      hostnames: [],
      loadingData: this.props.loadingData,
      initialLoad: false,
    };
  }

  /**
   * function used to test if we have an ssh connection to the hostname
   * @param {hostname}
   * @memberof SlycatRemoteControls
   */
  checkRemoteStatus = async (hostname) => {
    return client.get_remotes_fetch(hostname).then((json) => {
      this.setState(
        {
          session_exists: json.status,
          initialLoad: true,
          loadingData: false,
        },
        () => {
          this.props.callBack(
            this.state.hostname,
            this.state.username,
            this.state.password,
            this.state.session_exists,
          );
        },
      );
    });
  };

  connectButtonCallBack = (sessionExists, loadingData) => {
    this.setState(
      {
        session_exists: sessionExists,
        loadingData: loadingData,
      },
      () => {
        this.props.callBack(
          this.state.hostname,
          this.state.username,
          this.state.password,
          this.state.session_exists,
        );
      },
    );
  };

  /**
   * gets a list of all the known remote hosts that we can connect to
   * via ssh
   *
   * @memberof SlycatRemoteControls
   */
  getRemoteHosts = async () => {
    return client.get_configuration_remote_hosts_fetch().then((json) => {
      this.setState({ hostnames: json });
    });
  };

  async componentDidMount() {
    await this.checkRemoteStatus(this.state.hostname);
    await this.getRemoteHosts();
  }

  /**
   * checks local browser storage for the last used hostname and username
   *
   * @memberof SlycatRemoteControls
   */
  populateDisplay = () => {
    const display = {};
    if (localStorage.getItem("slycat-remote-controls-hostname")) {
      display.hostname = localStorage.getItem("slycat-remote-controls-hostname")
        ? localStorage.getItem("slycat-remote-controls-hostname")
        : null;
    }
    if (localStorage.getItem("slycat-remote-controls-username")) {
      display.username = localStorage.getItem("slycat-remote-controls-username")
        ? localStorage.getItem("slycat-remote-controls-username")
        : null;
    }
    return display;
  };

  /**
   * updates local storage and react state depending on which input
   * is being typed in
   *
   * @memberof SlycatRemoteControls
   */
  onValueChange = (value, type) => {
    switch (type) {
      case "username":
        localStorage.setItem("slycat-remote-controls-username", value);
        this.setState({ username: value });
        break;
      case "hostname":
        localStorage.setItem("slycat-remote-controls-hostname", value);
        this.checkRemoteStatus(value);
        this.setState({ hostname: value });
        break;
      case "password":
        this.setState({ password: value }, () => {
          this.props.callBack(
            this.state.hostname,
            this.state.username,
            this.state.password,
            this.state.session_exists,
          );
        });
        break;
      default:
        throw new Error("bad Case");
    }
  };

  /**
   * cleanup for when the component is unmounted
   *
   * @memberof SlycatRemoteControls
   */
  componentWillUnmount() {
    const display = this.populateDisplay();
    const state = {
      remote_hosts: [],
      enable: true,
      hostname: display.hostname ? display.hostname : null,
      username: display.username ? display.username : null,
      session_exists: false,
      password: null,
      initialLoad: false,
    };
    this.setState(state);
  }

  /**
   * if the 'enter key' is pressed try and connect to
   * the input hostname
   *
   * @memberof SlycatRemoteControls
   */
  handleKeyDown = (e) => {
    if (this.state.showConnectButton && e.key === "Enter") {
      this.connect();
    }
  };

  /**
   * creates JSX form input if a session does not already exist for the given hostname
   *
   * @memberof SlycatRemoteControls
   */
  getFormInputsJSX = () => {
    if (!this.state.session_exists) {
      return (
        <div>
          <div className="form-floating mb-3">
            <input
              id="username"
              placeholder={REMOTE_AUTH_LABELS.username}
              disabled={
                this.state.showConnectButton ? this.state.loadingData : this.props.loadingData
              }
              className="form-control"
              type="text"
              value={this.state.username ? this.state.username : ""}
              onChange={(e) => this.onValueChange(e.target.value, "username")}
            />
            <label htmlFor="username">{REMOTE_AUTH_LABELS.username}</label>
          </div>
          <div className="form-floating mb-3" data-bind-old="visible: !session_exists()">
            <input
              id="password"
              placeholder={REMOTE_AUTH_LABELS.password}
              disabled={
                this.state.showConnectButton ? this.state.loadingData : this.props.loadingData
              }
              className="form-control"
              type="password"
              onKeyDown={this.handleKeyDown}
              onChange={(e) => this.onValueChange(e.target.value, "password")}
            />
            <label htmlFor="password">{REMOTE_AUTH_LABELS.password}</label>
            {this.state.showConnectButton ? (
              <ConnectButton
                loadingData={this.state.loadingData}
                hostname={this.state.hostname}
                username={this.state.username}
                password={this.state.password}
                callBack={this.connectButtonCallBack}
              />
            ) : null}
          </div>
        </div>
      );
    }
    return null;
  };

  /**
   * maps the hostnames as dropdowns items JSX
   *
   * @memberof SlycatRemoteControls
   */
  getHostnamesJSX = () => {
    const hostnamesJSX = this.state.hostnames.map((hostnameObject, i) => {
      return (
        <li key={i}>
          <a
            className="dropdown-item"
            onClick={(e) => this.onValueChange(e.target.text, "hostname")}
          >
            {hostnameObject.hostname}
          </a>
        </li>
      );
    });
    return hostnamesJSX;
  };

  /**
   * JSX for SlycatRemoteControls
   *
   * @returns JSX for rendering the component
   * @memberof SlycatRemoteControls
   */
  render() {
    //make sure our data is loaded before we render
    if (!this.state.initialLoad) {
      return <div />;
    }
    return (
      <form>
        <div className="mb-3">
          <div className="input-group">
            <button
              className="btn btn-secondary dropdown-toggle"
              type="button"
              id="dropdownMenuButton"
              data-bs-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="false"
            />
            <ul className="dropdown-menu" aria-labelledby="dropdownMenuButton">
              {this.getHostnamesJSX()}
            </ul>
            <div className="form-floating">
              <input
                id="hostname"
                placeholder="Hostname"
                className="form-control"
                value={this.state.hostname ? this.state.hostname : ""}
                type="text"
                onChange={(e) => this.onValueChange(e.target.value, "hostname")}
              />
              <label className="form-label" htmlFor="hostname">
                Hostname
              </label>
            </div>
          </div>
        </div>
        {this.getFormInputsJSX()}
      </form>
    );
  }
}

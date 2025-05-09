import React from "react";
import client from "js/slycat-web-client";
import { REMOTE_AUTH_LABELS } from "../utils/ui-labels";

/**
 * this class sets up and tests a remote session to an agent
 */
export default class SmbAuthentication extends React.Component<any, any> {
  /**
   *Creates an instance of SlycatRemoteControls.
   * @param {callBack, ConnectButton} props,
   * callback: function
   * where hostname, username, password, and session exist are return to the callee
   * every time the hostname is changed. session exist should always be checked before
   * moving on in in your logic structure.
   * connectButton: bool tells UI to include connect
   * @memberof SmbAuthentication
   */
  constructor(props) {
    super(props);
    const display = this.populateDisplay();
    this.state = {
      remote_hosts: [],
      hostname: display.hostname ? display.hostname : null,
      username: display.username ? display.username : null,
      session_exists: null,
      password: "",
      share: display.share ? display.share : null,
      domain: display.domain ? display.domain : null,
      domains: [],
      hostnames: [],
      loadingData: this.props.loadingData,
      initialLoad: false,
      smb_info: this.props.smb_info,
    };
  }
  private poll;
  /**
   * function used to test if we have an ssh connection to the hostname
   * @param {hostname}
   * @memberof SmbAuthentication
   */
  checkRemoteStatus = async (hostname) => {
    return client
      .get_remotes_fetch(hostname)
      .then((json) => {
        this.setState(
          {
            session_exists: json.status && json.share === this.state.share,
            initialLoad: true,
            loadingData: false,
          },
          () => {
            this.props.callBack(
              this.state.hostname,
              this.b64EncodeUnicode(this.state.username + "@" + this.state.domain),
              this.b64EncodeUnicode(this.state.password),
              this.state.share,
              this.state.domain,
              this.state.session_exists,
            );
          },
        );
      })
      .catch((response) => {
        this.setState(
          {
            session_exists: false,
            initialLoad: true,
            loadingData: false,
          },
          () => {
            this.props.callBack(
              this.state.hostname,
              this.b64EncodeUnicode(this.state.username),
              this.b64EncodeUnicode(this.state.password),
              this.state.share,
              this.state.domain,
              this.state.session_exists,
            );
          },
        );
      });
  };
  /**
   * takes a string value and encodes it to b64
   * @param str string to be encode
   * @returns encoded result
   */
  b64EncodeUnicode = (str) => {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
        return String.fromCharCode("0x" + p1);
      }),
    );
  };
  /**
   * gets a list of all the known remote hosts that we can connect to
   * via ssh
   *
   * @memberof SmbAuthentication
   */
  getRemoteHosts = async () => {
    return client.get_configuration_smb_remote_hosts_fetch().then((json) => {
      this.setState({ hostnames: json.hostnames });
    });
  };

  /**
   * gets a list of all the known domain names that we can connect to
   * via ssh
   *
   * @memberof SmbAuthentication
   */
  getDomains = async () => {
    return client.get_configuration_smb_domains_fetch().then((json) => {
      this.setState({ domains: json.domains });
    });
  };

  async componentDidMount() {
    await this.checkRemoteStatus(this.state.hostname);
    await this.getRemoteHosts();
    await this.getDomains();
    if (this.poll) {
      clearInterval(this.poll);
    }
    this.poll = setInterval(async () => await this.checkRemoteStatus(this.state.hostname), 5000);
  }

  /**
   * checks local browser storage for the last used hostname and username
   *
   * @memberof SmbAuthentication
   */
  populateDisplay = (): any => {
    const display: any = {};
    if (!this.props.hover) {
      if (localStorage.getItem("slycat-smb-remote-controls-hostname")) {
        display.hostname = localStorage.getItem("slycat-smb-remote-controls-hostname")
          ? localStorage.getItem("slycat-smb-remote-controls-hostname")
          : null;
      }
      if (localStorage.getItem("slycat-smb-remote-controls-username")) {
        display.username = localStorage.getItem("slycat-smb-remote-controls-username")
          ? localStorage.getItem("slycat-smb-remote-controls-username")
          : null;
      }
      if (localStorage.getItem("slycat-smb-remote-controls-share")) {
        display.share = localStorage.getItem("slycat-smb-remote-controls-share")
          ? localStorage.getItem("slycat-smb-remote-controls-share")
          : null;
      }
    } else {
      display.hostname = this.props.smb_info["hostname"];
      display.share = this.props.smb_info["collab"];
    }
    return display;
  };

  /**
   * updates local storage and react state depending on which input
   * is being typed in
   *
   * @memberof SmbAuthentication
   */
  onValueChange = (value, type) => {
    switch (type) {
      case "share":
        localStorage.setItem("slycat-smb-remote-controls-share", value);
        this.setState({ share: value }, () => {
          this.checkRemoteStatus(this.state.hostname);
          this.props.callBack(
            this.state.hostname,
            this.b64EncodeUnicode(this.state.username + "@" + this.state.domain),
            this.b64EncodeUnicode(this.state.password),
            this.state.share,
            this.state.domain,
            this.state.session_exists,
          );
        });
        break;
      case "domain":
        localStorage.setItem("slycat-smb-remote-controls-domain", value);
        this.setState({ domain: value }, () => {
          this.props.callBack(
            this.state.hostname,
            this.b64EncodeUnicode(this.state.username + "@" + this.state.domain),
            this.b64EncodeUnicode(this.state.password),
            this.state.share,
            this.state.domain,
            this.state.session_exists,
          );
        });
        break;
      case "username":
        localStorage.setItem("slycat-smb-remote-controls-username", value);
        this.setState({ username: value }, () => {
          this.props.callBack(
            this.state.hostname,
            this.b64EncodeUnicode(this.state.username + "@" + this.state.domain),
            this.b64EncodeUnicode(this.state.password),
            this.state.share,
            this.state.domain,
            this.state.session_exists,
          );
        });
        break;
      case "hostname":
        localStorage.setItem("slycat-smb-remote-controls-hostname", value);
        this.checkRemoteStatus(value);
        this.setState({ hostname: value }, () => {
          this.props.callBack(
            this.state.hostname,
            this.b64EncodeUnicode(this.state.username + "@" + this.state.domain),
            this.b64EncodeUnicode(this.state.password),
            this.state.share,
            this.state.domain,
            this.state.session_exists,
          );
        });
        break;
      case "password":
        this.setState({ password: value }, () => {
          this.props.callBack(
            this.state.hostname,
            this.b64EncodeUnicode(this.state.username + "@" + this.state.domain),
            this.b64EncodeUnicode(this.state.password),
            this.state.share,
            this.state.domain,
            this.state.session_exists,
          );
        });
        break;
      default:
        throw new Error("bad Case");
    }
  };

  /**
   * cleanup state on unmounting
   */
  cleanup() {
    clearInterval(this.poll);
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
   * cleanup for when the component is unmounted
   *
   * @memberof SmbAuthentication
   */
  componentWillUnmount() {
    this.cleanup();
    window.removeEventListener("beforeunload", this.cleanup);
  }

  /**
   * if the 'enter key' is pressed try and connect to
   * the input hostname
   *
   * @memberof SmbAuthentication
   */
  handleKeyDown = (e) => {
    if (e.key === "Enter") {
      let last_key = e.key;
      this.props.callBack(
        this.state.hostname,
        this.b64EncodeUnicode(this.state.username),
        this.b64EncodeUnicode(this.state.password),
        this.state.share,
        this.state.domain,
        this.state.session_exists,
        last_key,
      );
    }
  };

  /**
   * creates JSX form input if a session does not already exist for the given hostname
   *
   * @memberof SmbAuthentication
   */
  getFormInputsJSX = () => {
    return (
      <div>
        <div className="form-group row mb-3">
          <label className="col-sm-2 col-form-label">Share Name</label>
          <div className="col-sm-9">
            <input
              disabled={this.props.loadingData}
              className="form-control"
              type="text"
              value={this.state.share ? this.state.share : ""}
              onChange={(e) => this.onValueChange(e.target.value, "share")}
            />
          </div>
        </div>
        <div className="form-group row mb-3">
          <label className="col-sm-2 col-form-label">{REMOTE_AUTH_LABELS.username}</label>
          <div className="col-sm-4">
            <input
              disabled={this.props.loadingData}
              className="form-control"
              type="text"
              value={this.state.username ? this.state.username : ""}
              onChange={(e) => this.onValueChange(e.target.value, "username")}
            />
          </div>
          <label className="col-sm-1 col-form-label">@</label>
          <div className="col-sm-4">
            <div className="input-group">
              <div className="input-group-prepend">
                <button
                  className="btn btn-secondary dropdown-toggle"
                  type="button"
                  id="dropdownMenuButton"
                  data-bs-toggle="dropdown"
                  aria-haspopup="true"
                  aria-expanded="false"
                />
                <ul className="dropdown-menu" aria-labelledby="dropdownMenuButton">
                  {this.getDomainsJSX()}
                </ul>
              </div>
              <input
                className="form-control"
                value={this.state.domain ? this.state.domain : ""}
                type="text"
                onChange={(e) => this.onValueChange(e.target.value, "domain")}
              />
            </div>
          </div>
        </div>
        {!this.state.session_exists && (
          <div className="form-group row mb-3">
            <label className="col-sm-2 col-form-label">{REMOTE_AUTH_LABELS.password}</label>
            <div className="col-sm-9">
              <input
                disabled={this.props.loadingData}
                className="form-control"
                type="password"
                onKeyDown={this.handleKeyDown}
                onChange={(e) => this.onValueChange(e.target.value, "password")}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * maps the hostnames as dropdown items JSX
   *
   * @memberof SmbAuthentication
   */
  getHostnamesJSX = () => {
    const hostnamesJSX = this.state.hostnames.map((hostname, i) => {
      return (
        <li key={i}>
          <a
            className="dropdown-item"
            onClick={(e: any) => this.onValueChange(e.target.text, "hostname")}
          >
            {hostname}
          </a>
        </li>
      );
    });
    return hostnamesJSX;
  };

  /**
   * maps the domains as dropdown items JSX
   *
   * @memberof SmbAuthentication
   */
  getDomainsJSX = () => {
    const domainsJSX = this.state.domains.map((domain, i) => {
      return (
        <li key={i}>
          <a
            className="dropdown-item"
            onClick={(e: any) => this.onValueChange(e.target.text, "domain")}
          >
            {domain}
          </a>
        </li>
      );
    });
    return domainsJSX;
  };

  /**
   * JSX for SlycatRemoteControls
   *
   * @returns JSX for rendering the component
   * @memberof SmbAuthentication
   */
  render() {
    //make sure our data is loaded before we render
    if (!this.state.initialLoad) {
      return <div />;
    }
    return (
      <form>
        <div className="form-group row mb-3">
          <label className="col-sm-2 col-form-label">Hostname</label>
          <div className="col-sm-9">
            <div className="input-group">
              <div className="input-group-prepend">
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
              </div>
              <input
                className="form-control"
                value={this.state.hostname ? this.state.hostname : ""}
                type="text"
                onChange={(e) => this.onValueChange(e.target.value, "hostname")}
              />
            </div>
          </div>
        </div>
        {this.getFormInputsJSX()}
      </form>
    );
  }
}

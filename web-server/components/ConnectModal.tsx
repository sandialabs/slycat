import * as React from "react";
import ModalMedium from "components/ModalMedium";
import ConnectButton from "components/ConnectButton";
import client from "js/slycat-web-client";
import { REMOTE_AUTH_LABELS } from "utils/ui-labels";

/**
 * @member modalId string dom id for the modal
 * @member closingCallBack callback function for cleanup when closing the modal
 * @member title test for the top of the modal
 */
export interface ConnectModalProps {
  modalId: string;
  hostname: string;
  callBack: Function;
}

/**
 * not used
 */
export interface ConnectModalState {
  loadingData: boolean;
  username: string;
  password: string;
  sessionExists: boolean;
}

/**
 * takes a list of messages to be displayed as a warning
 */
export default class ConnectModal extends React.Component<ConnectModalProps, ConnectModalState> {
  public constructor(props: ConnectModalProps) {
    super(props);
    this.state = {
      loadingData: false,
      username: localStorage.getItem("slycat-remote-controls-username") as string,
      password: "",
      sessionExists: false,
    };
  }

  /**
   * used to cleanup state after the connect button is called
   *
   * @private
   * @memberof ConnectModal
   */
  private cleanup = () => {
    this.props.callBack(this.state.sessionExists, this.state.loadingData);
  };

  /**
   * updates local storage and react state depending on which input
   * is being typed in
   *
   * @memberof SlycatRemoteControls
   */
  private onValueChange = (value: string, type: string) => {
    switch (type) {
      case "username":
        localStorage.setItem("slycat-remote-controls-username", value);
        this.setState({ username: value });
        break;
      case "password":
        this.setState({ password: value });
        break;
      default:
        throw new Error("bad Case");
    }
  };

  private connectButtonCallBack = (sessionExists: boolean, loadingData: boolean) => {
    this.setState(
      {
        sessionExists,
        loadingData,
      },
      () => {
        this.props.callBack(this.state.sessionExists, this.state.loadingData);
        if (sessionExists) {
          ($("#" + this.props.modalId) as any).modal("hide");
        }
      },
    );
  };

  /**
   * function used to test if we have an ssh connection to the hostname
   * @param hostname name of the host we want to connect to
   * @async
   * @memberof SlycatRemoteControls
   */
  private checkRemoteStatus = async (hostname: string) => {
    return client.get_remotes_fetch(hostname).then((json: any) => {
      this.setState(
        {
          sessionExists: json.status,
          loadingData: false,
        },
        () => {
          this.props.callBack(this.state.sessionExists, this.state.loadingData);
          if (this.state.sessionExists) {
            ($("#" + this.props.modalId) as any).modal("hide");
          }
        },
      );
    });
  };
  /**
   * establishes a new ssh connection given the
   * hostname, username, password
   *
   * @async
   * @memberof SlycatRemoteControls
   */
  private connect = async () => {
    this.setState({ loadingData: true }, () => {
      // this.props.callBack(this.state.sessionExists, true);
      client
        .post_remotes_fetch({
          parameters: {
            hostname: this.props.hostname,
            username: this.state.username,
            password: this.state.password,
          },
        })
        .then(() => {
          this.checkRemoteStatus(this.props.hostname);
        })
        .catch((errorResponse: any) => {
          if (errorResponse.status == 403) {
            alert(`${errorResponse.statusText} \n\n-${REMOTE_AUTH_LABELS.authErrorForbiddenDescription}
        \n-${REMOTE_AUTH_LABELS.authErrorForbiddenNote}`);
          } else if (errorResponse.status == 401) {
            alert(
              `${errorResponse.statusText} \n\n-${REMOTE_AUTH_LABELS.authErrorUnauthorizedDescription}`,
            );
          } else {
            alert(`${errorResponse.statusText}`);
          }
          this.setState({ loadingData: false }, () => {
            // this.props.callBack(this.state.sessionExists, this.state.loadingData);
          });
        });
    });
  };

  /**
   * if the 'enter key' is pressed try and connect to
   * the input hostname
   *
   * @memberof SlycatRemoteControls
   */
  handleKeyDown = (e: any) => {
    if (e.key === "Enter") {
      this.connect();
    }
  };

  getBodyJsx(): JSX.Element {
    return (
      <div>
        <form>
          <div className="form-floating mb-3">
            <input
              id="username"
              disabled={this.state.loadingData}
              className="form-control"
              type="text"
              value={this.state.username ? this.state.username : ""}
              onChange={(e) => this.onValueChange(e.target.value, "username")}
            />
            <label htmlFor="username">{REMOTE_AUTH_LABELS.username}</label>
          </div>
          <div className="form-floating mb-3">
            <input
              id="password"
              disabled={this.state.loadingData}
              className="form-control"
              type="password"
              onKeyDown={this.handleKeyDown}
              onChange={(e) => this.onValueChange(e.target.value, "password")}
            />
            <label htmlFor="password">{REMOTE_AUTH_LABELS.password}</label>
          </div>
        </form>
      </div>
    );
  }

  getFooterJSX(): JSX.Element {
    return (
      <div>
        <div className="col">
          <ConnectButton
            loadingData={this.state.loadingData}
            hostname={this.props.hostname}
            username={this.state.username}
            password={this.state.password}
            callBack={this.connectButtonCallBack}
            sessionExists={this.state.sessionExists}
          />
        </div>
      </div>
    );
  }

  render() {
    return (
      <div>
        <ModalMedium
          modalId={this.props.modalId}
          closingCallBack={this.cleanup}
          title={"Connect to: " + this.props.hostname}
          body={this.getBodyJsx()}
          footer={this.getFooterJSX()}
        />
      </div>
    );
  }
}

'use strict';
import * as React from 'react';
import client from "../js/slycat-web-client";

/**
 * @member loadingData state of weather something is loading
 * @member hostname name of the host to connect to
 * @member username name of the user
 * @member password user password used for the connection
 * @member callBack callback function to update with (this.state.sessionExists, this.state.loadingData) 
 * before and after a connection is made
 * @member sessionExists is there an open session
 * @member text optional name to put on the button
 * @export
 * @interface ConnectButtonProps
 */
export interface ConnectButtonProps {
  loadingData: boolean
  hostname: string
  username: string
  password: string
  callBack: Function
  sessionExists: boolean
  text?:string
}

/**
 * @member loadingDate are we currently loading data?
 * @member sessionExists is the session open yet?
 * @member text to put on the button
 *
 * @export
 * @interface ConnectButtonState
 */
export interface ConnectButtonState {
  loadingData: boolean
  sessionExists: boolean
  text: string
}

/**
 * react component used to create a button that has the ability to make ssh connections once
 * it is clicked by a user
 *
 * @export
 * @class ConnectButton
 * @extends {React.Component<ConnectButtonProps, ConnectButtonState>}
 */
export default class ConnectButton extends React.Component<ConnectButtonProps, ConnectButtonState> {
  public constructor(props:ConnectButtonProps) {
    super(props)
    this.state = {
      text: props.text?props.text:"Connect",
      loadingData: props.loadingData,
      sessionExists: props.sessionExists
    }
  }

  /**
   * function used to test if we have an ssh connection to the hostname
   * @param hostname name of the host we want to connect to
   * @async
   * @memberof SlycatRemoteControls
   */
  private checkRemoteStatus = async (hostname:string) => {
    return client.get_remotes_fetch(hostname)
      .then((json:any) => {
        this.setState({
          sessionExists:json.status,
          loadingData:false
        }, () => {
          this.props.callBack(this.state.sessionExists, this.state.loadingData)
        });
    });
  };

  /**
   * establishes a new ssh connection given the
   * hostname, username, password
   *
   * @async
   * @memberof SlycatRemoteControls
   */
  public connect = async () => {
    this.setState({loadingData:true})
    this.props.callBack(this.state.sessionExists, true);
    client.post_remotes_fetch({
      parameters: {
        hostname: this.props.hostname,
        username: this.props.username,
        password: this.props.password,
      }
    }).then(() => {
      this.checkRemoteStatus(this.props.hostname);
      console.log("Remote session created.");
    }).catch((errorResponse:any) => {
      if (errorResponse.status == 403){
        alert(`${errorResponse.statusText} \n\n-Make sure your username and password are entered correctly.
        \n-Note you also may have tried to many times with bad credentials and been suspended for the next few minutes`)
      } else if (errorResponse.status == 401){
        alert(`${errorResponse.statusText} \n\n-Make sure the Hostname is entered correctly.`)
      } else {
        alert(`${errorResponse.statusText}`)
      }
      this.setState({loadingData:false}, () => {
        this.props.callBack(this.state.sessionExists, this.state.loadingData);
      })
    });
  };

  public render() {
    return (
      <button disabled={this.state.loadingData} type='button' className='btn btn-primary float-right' onClick={this.connect}>
        {this.state.loadingData?<span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>:null}
        {this.state.loadingData?"Loading...":this.state.text}
      </button>
    );
  }
}

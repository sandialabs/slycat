'use strict';
import * as React from 'react';
import client from '../../../js/slycat-web-client';
import ProgressBar from 'components/ProgressBar.tsx';

/**
 * @export
 * @interface LoadingPageProps
 */
export interface LoadingPageProps {
  jid: string
  hostname: string
}

/**
 *
 * @export
 * @interface LoadingPageState
 */
export interface LoadingPageState {
  sessionExists: boolean
  progressBarHidden: boolean
  progressBarProgress: number
}

/**
 * react component used to create a loading page
 *
 * @export
 * @class LoadingPage
 * @extends {React.Component<LoadingPageProps, LoadingPageState>}
 */
export default class LoadingPage extends React.Component<LoadingPageProps, LoadingPageState> {
  public constructor(props:LoadingPageProps) {
    super(props)
    this.state = {
      sessionExists: false,
      progressBarHidden: false,
      progressBarProgress: 0
    }
  }
  /**
   * method runs after the component output has been rendered to the DOM
   */
  componentDidMount() {
    this.checkRemoteStatus(this.props.hostname);
  }

  // tear down
  componentWillUnmount() {

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
          progressBarProgress: 10
        }, () => {
          console.log('called after set state');
        });
    });
  };

  public render() {
    console.log(this.state.sessionExists);
    return (
      <div className="slycat-job-checker bootstrap-styles">
        <ProgressBar
          hidden={this.state.progressBarHidden}
          progress={this.state.progressBarProgress}
        />
        <div className="slycat-job-checker-output text-white bg-secondary" >
          <p>
          Job id <b>{this.props.jid} </b> <br/>
          Default host name <b>{this.props.hostname}</b><br/>
          session status is <b>{this.state.sessionExists?'true':'false'}</b>
          </p>
        </div>
      </div>
    );
  }
}

'use strict';
import * as React from 'react';
import client from '../../../js/slycat-web-client';
import ProgressBar from 'components/ProgressBar.tsx';
import {LoadingPageProps, LoadingPageState} from './types';
import ConnectModal from 'components/ConnectModal.tsx';
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
  private connectModalCallBack = (sessionExists: boolean, loadingData: boolean) => {
    console.log(`Callback Called sessionExists:${sessionExists}: loadingData:${loadingData}`);
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
          ($('#ConnectModal') as any).modal('show');
        });
    });
  };

  private loginModal = () => {
    return (
      <div>
        <ConnectModal
          // hostname = {this.props.hostname}
          hostname = {this.props.hostname}
          modalId = {'ConnectModal'}
          callBack = {this.connectModalCallBack}
        />
      </div>
    )
  }

  public render() {
    console.log(this.state.sessionExists);
    let d = new Date();
    let datestring = d.getDate()  + "-" + (d.getMonth()+1) + "-" + d.getFullYear() + " " +
      d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();

    return (
      <div className="slycat-job-checker bootstrap-styles">
        {!this.state.sessionExists?this.loginModal():null}
        <div>
        <ProgressBar
          hidden={this.state.progressBarHidden}
          progress={this.state.progressBarProgress}
        />
        </div>
        <div className='slycat-job-checker-controls'>
          <div className="row">
            <div className="col-sm">Updated {datestring}</div>
            <div className="col-sm">Job id <b>{this.props.jid}</b></div>
            <div className="col-sm">Remote host name <b>{this.props.hostname}</b></div>
            <div className="col-sm">Session status <b>{this.state.sessionExists?'true':'false'}</b></div>
          </div>
        </div>
        <div className="slycat-job-checker-output text-white bg-secondary" >
          <dl>
            <dt>> Pending</dt>
            <dd>> Consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna
          aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
          commodo consequat.</dd>
            <dt>> Running</dt>
            <dd>> Consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna
          aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
          commodo consequat.</dd>
          </dl>
        </div>
      </div>
    );
  }
}

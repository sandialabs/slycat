'use strict';
import * as React from 'react';
import client from '../../../js/slycat-web-client';
import ProgressBar from 'components/ProgressBar.tsx';
import {LoadingPageProps, LoadingPageState} from './types';
import ConnectModal from 'components/ConnectModal.tsx';
import ControlsButton from 'components/ControlsButton';
import Spinner from 'components/Spinner.tsx';
/**
 * react component used to create a loading page
 *
 * @export
 * @class LoadingPage
 * @extends {React.Component<LoadingPageProps, LoadingPageState>}
 */
export default class LoadingPage extends React.Component<LoadingPageProps, LoadingPageState> {
  timer: any; //NodeJS.Timeout
  public constructor(props:LoadingPageProps) {
    super(props)
    this.state = {
      sessionExists: false,
      progressBarHidden: false,
      modalId: 'ConnectModal',
      progressBarProgress: 0,
      modelShow: false,
      log: {
        pending: [] as any,// [string]
        failed: [] as any,
        running: [] as any,
        complete: [] as any,
      },
      modelId: props.modelId
    }
  }
  /**
   * method runs after the component output has been rendered to the DOM
   */
  componentDidMount() {
    this.checkRemoteStatus().then(() => {
      if(this.state.sessionExists) {
        this.checkRemoteJob();
      }
    });
    this.timer = setInterval(()=> this.checkRemoteStatus(), 30000);
  }

  // tear down
  componentWillUnmount() {
    clearInterval(this.timer);
    this.timer = null;
  }

  private connectModalCallBack = (sessionExists: boolean, loadingData: boolean) => {
    this.setState({sessionExists})
    clearInterval(this.timer);
    this.timer = null;
    console.log(`Callback Called sessionExists:${sessionExists}: loadingData:${loadingData}`);
  }

  /**
   * function used to test if we have an ssh connection to the hostname
   * @param hostname name of the host we want to connect to
   * @async
   * @memberof SlycatRemoteControls
   */
  private checkRemoteJob = async () => {
    return client.get_checkjob_fetch(this.props.hostname, this.props.jid)
      .then((json:any) => {
        console.log(json);
        this.appendLog(json);
    });
  };

  private appendLog = (resJson: string) => {
    switch (resJson.status.state) {
      case 'COMPLETED':
          console.log("COMPLETED");
          this.state.log.complete.push(resJson)
          this.setState({
            log : this.state.log
          });
          break;
      case 1:
          console.log("It is a Monday.");
          break;
      case 2:
          console.log("It is a Tuesday.");
          break;
      default:
          console.log("No such day exists!");
          break;
  }
  }

  /**
   * function used to test if we have an ssh connection to the hostname
   * @param hostname name of the host we want to connect to
   * @async
   * @memberof SlycatRemoteControls
   */
  private checkRemoteStatus = async () => {
    return client.get_remotes_fetch(this.props.hostname)
    .then((json: any) => {
      this.setState({
        sessionExists: json.status,
        progressBarProgress: 10
      }, () => {
        if (!this.state.sessionExists) {
          this.setState({ modelShow: true });
          ($(`#${this.state.modalId}`) as any).modal('show');
        }
      });
    });
  }

  private loginModal = () => {
    return (
      <div>
        <ConnectModal
          hostname = {this.props.hostname}
          modalId = {this.state.modalId}
          callBack = {this.connectModalCallBack}
        />
        {this.state.modelShow&&!this.state.sessionExists?<ControlsButton 
          label='Connect' 
          title={'Connect button'} 
          data_toggle='modal' 
          data_target={'#' + this.state.modalId}
          button_style={'btn-primary float-right'} id='controls-button-death'
        />:null}
      </div>

    );
  }
  private getLog = ()  =>  {

    return this.state.sessionExists?(
      <dl>
        {JSON.stringify(this.state.log.complete)}
        <dt>
          > Pending
        </dt>
        <dd>
          > Consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna
          aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
          commodo consequat.
        </dd>
        <dt>
          > Running
        </dt>
        <dd>
          > Consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna
          aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
          commodo consequat.
        </dd>
      </dl>
    ):(<Spinner />);
  }
  public render() {
    let d = new Date();
    let datestring = d.getDate()  + "-" + (d.getMonth()+1) + "-" + d.getFullYear() + " " +
      d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();

    return (
      <div className="slycat-job-checker bootstrap-styles">
        <div>
        <ProgressBar
          hidden={this.state.progressBarHidden}
          progress={this.state.progressBarProgress}
        />
        </div>
        <div className='slycat-job-checker-controls'>
          <div className="row">
            <div className="col-3">Updated {datestring}</div>
            <div className="col-2">Job id <b>{this.props.jid}</b></div>
            <div className="col-3">Remote host name <b>{this.props.hostname}</b></div>
            <div className="col-2">Session <b>{this.state.sessionExists?'true':'false'}</b></div>
            <div className="col-2">{this.loginModal()}</div>
          </div>
        </div>
        <div className="slycat-job-checker-output text-white bg-secondary" >
          {this.getLog()}
        </div>
      </div>
    );
  }
}

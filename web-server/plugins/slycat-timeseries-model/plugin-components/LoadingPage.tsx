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
  TIMER_MS: number = 10000;
  public constructor(props:LoadingPageProps) {
    super(props)
    this.state = {
      sessionExists: false,
      progressBarHidden: false,
      modalId: 'ConnectModal',
      progressBarProgress: 0,
      modelShow: false,
      jobStatus: 'Job Status Unknown',
      log: {
        logLineArray: [] as any,// [string]
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
    this.timer = setInterval(()=> this.checkRemoteStatus(), this.TIMER_MS);
  }

  // tear down
  componentWillUnmount() {
    clearInterval(this.timer);
    this.timer = null;
  }

  private connectModalCallBack = (sessionExists: boolean, loadingData: boolean) => {
    this.setState({sessionExists},() => {
      if(this.state.sessionExists) {
        this.checkRemoteJob();
      }
    })
    clearInterval(this.timer);
    this.timer = null;
    console.log(`Callback Called sessionExists:${sessionExists}: loadingData:${loadingData}`);
  }
  private pullHPCData = () => {
    const params = {mid:this.props.modelId, type:"timeseries", command: "pull_data"}
    client.get_model_command_fetch(params).then((json) => {
      console.log(json)
    }).catch((res)=> {
      if((res as string).includes('409 :: error connecting to check on the job')){
        this.checkRemoteStatus()
      } else{
        window.alert(res);
      }

    });
  };
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
  
  private appendLog = (resJson: any) => {
    this.state.log.logLineArray = resJson.logFile.split("\n")
    this.setState({
      jobStatus: `Job Status: ${resJson.status.state}`,
      log : this.state.log,
    });
    switch (resJson.status.state) {
      case 'COMPLETED':
          this.setState({
            progressBarProgress: 100
          },()=>{
            clearInterval(this.timer);
            this.timer = null;
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
        } else {
          this.checkRemoteJob();
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
          <button
          className={`btn btn-md btn-primary`}
          id={'pullbtn'}
          type='button' 
          title={'load data'}
          disabled={false}
          onClick={() => this.pullHPCData()} >
          {'load'}
          </button>
      </div>

    );
  }

  private logBuilder = (itemList:[string]) => {
    return itemList.map((item, index) =>
      <dd key={index.toString()}>
        {JSON.stringify(item)}
      </dd>
    );
  }

  private getLog = ()  =>  {
    let items: [] = this.logBuilder(this.state.log.logLineArray) as any;
    return this.state.sessionExists?(
      <dl>
        <dt>
          > {this.state.jobStatus}
        </dt>
        <dt>
          > Slurm run Log:
        </dt>
          {items.length>=1?items:<Spinner />}
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
            <div className="col-2">Job id: <b>{this.props.jid}</b></div>
            <div className="col-3">Remote host: <b>{this.props.hostname}</b></div>
            <div className="col-2">Session: <b>{this.state.sessionExists?'true':'false'}</b></div>
            <div className="col-2">{this.loginModal()}</div>
          </div>
          <div className="row">
            <button className="btn btn-primary" type="button" data-toggle="collapse" data-target="#collapseExample" aria-expanded="false" aria-controls="collapseExample">
              Show job status meanings
            </button>
            <div className="collapse" id="collapseExample">
              <div className="card card-body">
                <dt>JOB STATE CODES</dt>
                <dt>BF BOOT_FAIL</dt>
                <dd>Job terminated due to launch failure, typically due to a hardware failure (e.g. unable to boot the node or block and the job can not be requeued).</dd>
                <dt>CA CANCELLED</dt>
                <dd>Job was explicitly cancelled by the user or system administrator. The job may or may not have been initiated.</dd>
                <dt>CD COMPLETED</dt>
                <dd>Job has terminated all processes on all nodes with an exit code of zero.</dd>
                <dt>DL DEADLINE</dt>
                <dd>Job terminated on deadline.</dd>
                <dt>F FAILED</dt>
                <dd>Job terminated with non-zero exit code or other failure condition.</dd>
                <dt>NF NODE_FAIL</dt>
                <dd>Job terminated due to failure of one or more allocated nodes.</dd>
                <dt>OOM OUT_OF_MEMORY</dt>
                <dd>Job experienced out of memory error.</dd>
                <dt>PD PENDING</dt>
                <dd>Job is awaiting resource allocation.</dd>
                <dt>PR PREEMPTED</dt>
                <dd>Job terminated due to preemption.</dd>
                <dt>R RUNNING</dt>
                <dd>Job currently has an allocation.</dd>
                <dt>RQ REQUEUED</dt>
                <dd>Job was requeued.</dd>
                <dt>RS RESIZING</dt>
                <dd>Job is about to change size.</dd>
                <dt>RV REVOKED</dt>
                <dd>Sibling was removed from cluster due to other cluster starting the job.</dd>
                <dt>S SUSPENDED</dt>
                <dd>Job has an allocation, but execution has been suspended and CPUs have been released for other jobs.</dd>
                <dt>TO TIMEOUT</dt>
                <dd>Job terminated upon reaching its time limit.   </dd>           
              </div>
            </div>
          </div>
        </div>
        <div className="slycat-job-checker-output text-white bg-secondary" >
          {this.getLog()}
        </div>
      </div>
    );
  }
}

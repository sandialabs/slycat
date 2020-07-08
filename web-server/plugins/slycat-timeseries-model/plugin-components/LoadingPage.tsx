"use strict";
import * as React from "react";
import client from "../../../js/slycat-web-client";
import ProgressBar from "components/ProgressBar.tsx";
import { LoadingPageProps, LoadingPageState } from "./types";
import ConnectModal from "components/ConnectModal.tsx";
import ControlsButton from "components/ControlsButton";
import Spinner from "components/Spinner.tsx";
import { JobCodes } from "./JobCodes.tsx";
/**
 * react component used to create a loading page
 *
 * @export
 * @class LoadingPage
 * @extends {React.Component<LoadingPageProps, LoadingPageState>}
 */
export default class LoadingPage extends React.Component<LoadingPageProps, LoadingPageState> {
  timer: any; //NodeJS.Timeout
  progressTimer: any;
  TIMER_MS: number = 10000;
  public constructor(props: LoadingPageProps) {
    super(props);
    this.state = {
      modelState: this.props.modelState,
      sessionExists: false,
      progressBarHidden: false,
      modalId: "ConnectModal",
      progressBarProgress: 0,
      modelMessage: "",
      modelShow: false,
      pullCalled: 0,
      jobStatus: "Job Status Unknown",
      log: {
        logLineArray: [] as any, // [string]
      },
      modelId: props.modelId,
    };
  }
  /**
   * method runs after the component output has been rendered to the DOM
   */
  componentDidMount() {
    this.checkRemoteStatus().then(() => {
      if (this.state.sessionExists) {
        this.checkRemoteJob();
      }
    });
    this.timer = setInterval(() => this.checkRemoteStatus(), this.TIMER_MS);
    this.progressTimer = setInterval(() => this.updateProgress(), 3000);
  }

  // tear down
  componentWillUnmount() {
    clearInterval(this.timer);
    clearInterval(this.progressTimer);
    this.timer = null;
    this.progressTimer = null;
  }
  /**
   * updates the progress bar
   *
   * @private
   * @memberof LoadingPage
   */
  private updateProgress = (): void => {
    client
      .get_model_fetch(this.props.modelId)
      .then((model: any) => {
        if (model.hasOwnProperty("progress") && model.hasOwnProperty("state")) {
          this.setState({ progressBarProgress: model.progress, modelState: model.state }, () => {
            if (this.state.progressBarProgress === 100) {
              window.location.reload(true);
            }
          });
        }
      })
      .catch((err: any) => {
        alert(`error retrieving the model ${err}`);
      });
  };
  /**
   * callback for the model that establishes connection to the remote server
   *
   * @private
   * @memberof LoadingPage
   */
  private connectModalCallBack = (sessionExists: boolean, loadingData: boolean): void => {
    this.setState({ sessionExists }, () => {
      if (this.state.sessionExists) {
        this.checkRemoteJob();
      }
    });
    clearInterval(this.timer);
    this.timer = null;
  };

  /**
   *  Tells the server to go and grab the data needed to load the timeseries data
   *
   * @private
   * @memberof LoadingPage
   */
  private pullHPCData = (): void => {
    const params = { mid: this.props.modelId, type: "timeseries", command: "pull_data" };
    client
      .get_model_command_fetch(params)
      .then((json: any) => {
        console.log(`pulling data down from hpc ${json}`);
      })
      .catch((res: any) => {
        if ((res as string).includes("409 :: error connecting to check on the job")) {
          this.checkRemoteStatus();
        } else {
          window.alert(res);
        }
      });
  };

  private cancelJob = async (): Promise<any> => {
    return client.delete_job_fetch(this.props.hostname, this.props.jid).then((response: any) => {
      console.log("response", response);
    });
  };
  /**
   * function used to test if we have an ssh connection to the hostname
   * @param hostname name of the host we want to connect to
   * @async
   * @memberof SlycatRemoteControls
   */
  private checkRemoteJob = async () => {
    return client.get_checkjob_fetch(this.props.hostname, this.props.jid).then((json: any) => {
      this.appendLog(json);
    });
  };

  /**
   * function used to determine job state and what to do when its done
   *
   * @private
   * @memberof LoadingPage
   */
  private appendLog = (resJson: any) => {
    this.state.log.logLineArray = resJson.logFile.split("\n");
    this.setState({
      jobStatus: `Job Status: ${resJson.status.state}`,
      log: this.state.log,
    });
    switch (resJson.status.state) {
      case "COMPLETED":
        if (this.state.pullCalled < 3) {
          this.setState({ pullCalled: 3 }, () => this.pullHPCData());
        }
        break;
      case "RUNNING":
        if (this.state.pullCalled < 2) {
          this.setState({ pullCalled: 2 }, () => this.pullHPCData());
        }
        break;
      case "PENDING":
        if (this.state.pullCalled < 1) {
          this.setState({ pullCalled: 1 }, () => this.pullHPCData());
        }
        break;
      default:
        console.log("Unknown state");
        break;
    }
  };

  /**
   * function used to test if we have an ssh connection to the hostname
   * @param hostname name of the host we want to connect to
   * @async
   * @memberof SlycatRemoteControls
   */
  private checkRemoteStatus = async (): Promise<any> => {
    return client.get_remotes_fetch(this.props.hostname).then((json: any) => {
      this.setState(
        {
          sessionExists: json.status,
        },
        () => {
          if (!this.state.sessionExists) {
            this.setState({ modelShow: true });
            ($(`#${this.state.modalId}`) as any).modal("show");
          } else if (this.state.progressBarProgress < 50) {
            this.checkRemoteJob();
          }
        }
      );
    });
  };

  /**
   * Creates the connectModal and buttons for pulling data and
   * connecting back to the remote servers
   *
   * @private
   * @memberof LoadingPage
   */
  private loginModal = (): JSX.Element => {
    return (
      <React.Fragment>
        <ConnectModal
          hostname={this.props.hostname}
          modalId={this.state.modalId}
          callBack={this.connectModalCallBack}
        />
        {this.state.modelShow && !this.state.sessionExists && (
          <ControlsButton
            label="Connect"
            title={"Connect button"}
            data_toggle="modal"
            data_target={"#" + this.state.modalId}
            button_style={"btn btn-outline-primary"}
            id="controls-button-death"
          />
        )}
        <button
          className={`btn btn btn-outline-primary`}
          id={"pullbtn"}
          type="button"
          title={"load data"}
          disabled={!this.state.jobStatus.includes("COMPLETED")}
          onClick={() => this.pullHPCData()}
        >
          {"load"}
        </button>
        <button
          className={`btn btn btn-outline-primary`}
          id={"pullbtn"}
          type="button"
          title={"load data"}
          disabled={
            !this.state.jobStatus.includes("PENDING") || !this.state.jobStatus.includes("RUNNING")
          }
          onClick={() => this.cancelJob()}
        >
          {"cancel job"}
        </button>
      </React.Fragment>
    );
  };

  /**
   * Take items from the log and builds out dd elements
   *
   * @private
   * @memberof LoadingPage
   */
  private logBuilder = (itemList: [string]): JSX.Element[] => {
    return itemList.map((item, index) => <dd key={index.toString()}>{JSON.stringify(item)}</dd>);
  };

  /**
   * Creates the JSX for the log list
   *
   * @private
   * @memberof LoadingPage
   */
  private getLog = (): JSX.Element => {
    let items: JSX.Element[] = this.logBuilder(this.state.log.logLineArray);
    return this.state.sessionExists ? (
      <dl>
        <dt>`&gt;` {this.state.jobStatus}</dt>
        <dt>`&gt;` Slurm run Log:</dt>
        {items.length >= 1 ? items : <Spinner />}
      </dl>
    ) : (
      <Spinner />
    );
  };
  private getFormattedDateTime = (): string => {
    const d = new Date();
    return (
      d.getDate() +
      "-" +
      (d.getMonth() + 1) +
      "-" +
      d.getFullYear() +
      " " +
      d.getHours() +
      ":" +
      d.getMinutes() +
      ":" +
      d.getSeconds()
    );
  };
  public render() {
    return (
      <div className="slycat-job-checker bootstrap-styles">
        <div>
          <ProgressBar
            hidden={this.state.progressBarHidden}
            progress={this.state.progressBarProgress}
          />
        </div>
        <div className="slycat-job-checker-controls">
          <div className="row">
            <div className="col-3">Updated {this.getFormattedDateTime()}</div>
            <div className="col-2">
              Job id: <b>{this.props.jid}</b>
            </div>
            <div className="col-3">
              Remote host: <b>{this.props.hostname}</b>
            </div>
            <div className="col-2">
              Session: <b>{this.state.sessionExists ? "true" : "false"}</b>
            </div>
          </div>
          <div className="row">
            <div className="btn-group col-8" role="group">
              <button
                className="btn btn-outline-primary"
                type="button"
                data-toggle="collapse"
                data-target="#collapseJobCodes"
                aria-expanded="false"
                aria-controls="collapseJobCodes"
              >
                Show job status meanings
              </button>
              {this.loginModal()}
            </div>
          </div>
          <div className="row">
            <div className="collapse col-12" id="collapseJobCodes">
              <div className="card card-body">
                <JobCodes />
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-12">
          <div className="slycat-job-checker-output text-white bg-secondary">{this.getLog()}</div>
        </div>
      </div>
    );
  }
}

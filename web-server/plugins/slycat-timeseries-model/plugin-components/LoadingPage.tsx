import * as React from "react";
import client from "../../../js/slycat-web-client";
import ProgressBar from "components/ProgressBar";
import { LoadingPageProps, LoadingPageState } from "./types";
import { JobCodes } from "components/loading-page/JobCodes";
import LogList from "components/loading-page/LogList";
import LoadingPageButtons from "./LoadingPageButtons";
import InfoBar from "components/loading-page/InfoBar";
import ConnectModal from "components/ConnectModal";
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
  private connectModalCallBack = (sessionExists: boolean): void => {
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
      jobStatus: `${resJson.status.state}`,
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

  public render() {
    return (
      <div className="slycat-job-checker bootstrap-styles">
        <div className="slycat-job-checker-controls">
          <InfoBar
            jid={this.props.jid}
            hostname={this.props.hostname}
            sessionExists={this.state.sessionExists}
          />
          <div style={{ paddingTop: "15px", paddingBottom: "15px" }}>
            <ProgressBar
              hidden={this.state.progressBarHidden}
              progress={this.state.progressBarProgress}
            />
          </div>
          <div className="row justify-content-center">
            <ConnectModal
              hostname={this.props.hostname}
              modalId={this.state.modalId}
              callBack={this.connectModalCallBack}
            />
            <div className="btn-group col-8" role="group">
              <LoadingPageButtons
                modalId={this.state.modalId}
                jobStatus={this.state.jobStatus}
                cancelJob={this.cancelJob}
                pullHPCData={this.pullHPCData}
                modelShow={this.state.modelShow}
                sessionExists={this.state.sessionExists}
              />
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
          <div className="slycat-job-checker-output text-white bg-secondary">
            <LogList {...this.state} />
          </div>
        </div>
      </div>
    );
  }
}

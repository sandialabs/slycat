import * as React from "react";
import client from "../../../js/slycat-web-client";
import ProgressBar from "components/ProgressBar";
// import { LoadingPageProps, LoadingPageState } from "./types";
import { JobCodes } from "components/loading-page/JobCodes";
import LogList from "components/loading-page/LogList";
// import LoadingPageButtons from "./LoadingPageButtons";
import VSLoadingPageButtons from "./VSLoadingPageButtons";
import InfoBar from "components/loading-page/InfoBar";
// import { faJedi } from "@fortawesome/free-solid-svg-icons";
import ConnectModal from "components/ConnectModal";
import * as utils from "./utils";
import { LoadingPageProps, LoadingPageState } from "./types";

export default class VSLoadingPage extends React.Component<LoadingPageProps, LoadingPageState> {
  timer: any; //NodeJS.Timeout
  TIMER_MS: number = 10000;
  public constructor(props: LoadingPageProps) {
    super(props);
    this.state = {
      jid: "",
      finished: false,
      sessionExists: false,
      progressBarHidden: false,
      modalId: "ConnectModal",
      progressBarProgress: 1,
      modelMessage: "",
      modelShow: false,
      hostname: '',
      workdir: '',
      jobStatus: "Job Status Unknown",
      showVerboseLog: false,
      vsLog: { logLineArray: [] },
      log: {
        logLineArray: [],
      },
    };
  }
  /**
   * method runs after the component output has been rendered to the DOM
   */
  componentDidMount() {
    client.get_model_parameter_fetch({ mid: this.props.modelId, aid: "jid" })
      .then((jid) =>
        this.setState({ jid }, () =>
          client.get_model_parameter_fetch({ mid: this.props.modelId, aid: "hostname" })
            .then((hostname) =>
              this.setState({ hostname }, () =>
                client.get_model_parameter_fetch({ mid: this.props.modelId, aid: "workdir" })
                  .then(workdir =>
                    this.setState({ workdir }, () => this.checkRemoteStatus())
                  )
              )
            )
        )
      );
    this.timer = setInterval(() => this.checkRemoteStatus(), this.TIMER_MS);
  }
  componentDidUpdate(prevProps: LoadingPageProps, prevState: LoadingPageState) {
    if (prevState.finished !== this.state.finished && this.state.finished === true) {
      this.setState({ progressBarProgress: 75 }, () => {
        utils.computeVSModel(this.props.modelId, this.state.workdir, this.state.hostname, this.updateProgressBarCallback)
        this.updateProgressBarCallback(78, "message", true);
      });
    }
  }
  /**
   * This function is passed to other components to update the loading page
   * progress bar and info
   * @param progress progress to be applied to the progress bar
   * @param info info to display to the user
   * @param error display if an error occurred
   */
  private updateProgressBarCallback = (progress: number, info: string, error: boolean = false) => {
    if (error) {
      console.log(info);
    }
    this.setState({ progressBarProgress: progress });
  }
  // tear down
  componentWillUnmount() {
    clearInterval(this.timer);
    this.timer = null;
  }
  /**
   * function used to test if we have an ssh connection to the hostname
   * @param hostname name of the host we want to connect to
   * @async
   * @memberof SlycatRemoteControls
   */
  private checkRemoteJob = async () => {
    return client.get_checkjob_fetch(this.state.hostname, this.state.jid).then((json: any) => {
      this.appendLog(json);
    });
  };
  private appendLog = (resJson: any) => {
    this.setState({
      jobStatus: `${resJson.status.state}`,
      log: { logLineArray: resJson.logFile.split("\n") },
    }, () => {
      const userLog: string[] = []
      let progressBarProgress = this.state.progressBarProgress;
      let finished = false;
      if (this.state.log.logLineArray.length > 0) {
        userLog.push("log loaded from HPC (click verbose log for extra info)")
      }
      this.state.log.logLineArray.forEach((line: string) => {
        if (line.includes('[VS-PROGRESS]') && !this.state.finished) {
          progressBarProgress = 10 + Math.round(parseFloat(line.split(/(?<=^\S+)\s/)[1]) * 0.7)
        }
        else if (line.includes('[VS-LOG]')) {
          userLog.push(line.split(/(?<=^\S+)\s/)[1])
        }
        else if (line.includes('[VS-FINISHED]')) {
          finished = true;
        }
      });
      this.setState({
        ...this.state,
        progressBarProgress,
        vsLog: {
          logLineArray: userLog
        }
      }, () => this.setState({ finished }))
    });
  }

  /**
   * cancel the current running job on the hpc
   */
  private cancelJob = async (): Promise<any> => {
    return client.delete_job_fetch(this.state.hostname, this.state.jid).then((response: any) => {
      console.log("cancelJob response", response);
    });
  };
  /**
   * function used to test if we have an ssh connection to the hostname
   * @param hostname name of the host we want to connect to
   * @async
   * @memberof SlycatRemoteControls
   */
  private checkRemoteStatus = async (): Promise<any> => {
    return client.get_remotes_fetch(this.state.hostname).then((json: any) => {
      this.setState(
        {
          sessionExists: json.status,
        },
        () => {
          if (!this.state.sessionExists) {
            this.setState({ modelShow: true });
            ($(`#${this.state.modalId}`) as any).modal("show");
          }
          this.checkRemoteJob();
        }
      );
    });
  };

  public render() {
    return (
      <div className="slycat-job-checker bootstrap-styles">
        <div className="slycat-job-checker-controls">
          <InfoBar
            jid={this.state.jid}
            hostname={this.state.hostname}
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
              hostname={this.state.hostname}
              modalId={this.state.modalId}
              callBack={(arg1: any, arg2: any) =>
                console.log("connect modal callback called", arg1, arg2)
              }
            />
            <div className="btn-group col-8" role="group">
              <VSLoadingPageButtons
                modalId={"modalID"}
                jobStatus={"status"}
                cancelJob={this.cancelJob}
                verboseCallback={() => this.setState({ showVerboseLog: !this.state.showVerboseLog })}
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
          <div
            className="slycat-job-checker-output text-white bg-secondary"
          >
            <LogList
              sessionExists={this.state.sessionExists}
              jobStatus={this.state.jobStatus}
              log={this.state.showVerboseLog ? this.state.log : this.state.vsLog}
            />
          </div>
        </div>
      </div>
    );
  }
}

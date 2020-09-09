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
interface LoadingPageProps {
  modelId: any;
}
export default class VSLoadingPage extends React.Component<LoadingPageProps, any> {
  timer: any; //NodeJS.Timeout
  progressTimer: any;
  TIMER_MS: number = 10000;
  public constructor(props: any) {
    super(props);
    this.state = {
      jid: "",
      sessionExists: false,
      progressBarHidden: false,
      modalId: "ConnectModal",
      progressBarProgress: 1,
      modelMessage: "",
      modelShow: false,
      hostname: '',
      jobStatus: "Job Status Unknown",
      vsLog: {logLineArray: [] as string[]},
      log: {
        logLineArray: [] as string[], // [string]
      },
    };
  }
  /**
   * method runs after the component output has been rendered to the DOM
   */
  componentDidMount() {
    console.log(this.props.modelId);
    client.get_model_parameter_fetch({ mid: this.props.modelId, aid: "jid" }).then((jid) =>
      this.setState({ jid }, () =>
        client
          .get_model_parameter_fetch({ mid: this.props.modelId, aid: "hostname" })
          .then((hostname) =>
            this.setState({ hostname }, () =>
              this.checkRemoteStatus()
            )
          )
      )
    );
    this.timer = setInterval(() => this.checkRemoteStatus(), this.TIMER_MS);
    // this.progressTimer = setInterval(() => this.updateProgress(), 3000);
  }
  // tear down
  componentWillUnmount() {
    clearInterval(this.timer);
    // clearInterval(this.progressTimer);
    this.timer = null;
    // this.progressTimer = null;
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
      const vsLog: string[] = []
      let progressBarProgress = this.state.progressBarProgress;
      this.state.log.logLineArray.forEach((line: string) => {
        if (line.includes('[VS-PROGRESS]')) {
          progressBarProgress = parseFloat(line.split(" ")[1])
        }
        else if (line.includes('[VS-LOG]')) {
          vsLog.push(line.split(" ")[1])
        }
      });
      this.setState({...this.state, progressBarProgress, vsLog})
    });
  }
  /**
   * cancel the current running job on the hpc
   */
  private cancelJob = async (): Promise<any> => {
    return client.delete_job_fetch(this.state.hostname, this.state.jid).then((response: any) => {
      console.log("response", response);
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
            console.log("session", json.status);
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
            <LogList
              sessionExists={this.state.sessionExists}
              jobStatus={this.state.jobStatus}
              log={this.state.log}
            />
          </div>
        </div>
        {JSON.stringify(this.state)}
      </div>
    );
  }
}

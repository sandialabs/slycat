import * as React from "react";
import ModalContent from "components/ModalContent.tsx";
import client from "js/slycat-web-client";
import RemoteLoginTab from 'plugins/slycat-timeseries-model/plugin-components/RemoteLoginTab.tsx';
import HPCParametersTab from 'plugins/slycat-timeseries-model/plugin-components/HPCParametersTab.tsx';
import ModelNamingTab from 'plugins/slycat-timeseries-model/plugin-components/ModelNamingTab.tsx';
import TimeseriesParametersTab from 'plugins/slycat-timeseries-model/plugin-components/TimeseriesParametersTab.tsx';
import SlycatFormRadioCheckbox from 'components/SlycatFormRadioCheckbox.tsx';
import SlycatNumberInput from 'components/SlycatNumberInput.tsx';
import SlycatTextInput from 'components/SlycatTextInput.tsx';
import SlycatFormDropDown from 'components/SlycatFormDropDown.tsx';
import SlycatTimeInput from 'components/SlycatTimeInput.tsx';
import SlycatRemoteControls from 'components/SlycatRemoteControls.jsx';
import ConnectButton from 'components/ConnectButton.tsx';
import RemoteFileBrowser from 'components/RemoteFileBrowser.tsx'
import SlycatSelector from 'components/SlycatSelector.tsx';
import server_root from "js/slycat-server-root";
import cloneDeep from "lodash";
import markings from "js/slycat-markings";

/**
 * not used
 */
export interface TimeseriesWizardProps {
  project: any;
  markings: any;
}

/**
 * not used
 */
export interface TimeseriesWizardState {
  project: any;
  model: { _id: string };
  modalId: string;
  jid: string;
  visibleTab: string;
  selectedOption: string;
  loadingData: boolean;
  hostname: string;
  sessionExists: boolean;
  username: string;
  password: string;
  hdf5Directory: string;
  selectedTablePath: string;
  selectedXycePath: string;
  inputDirectory: string;
  parserType: string;
  columnNames: { text: string, value: string }[];
  timeseriesColumn: string;
  binCount: number;
  resamplingAlg: string;
  clusterLinkageMeasure: string;
  clusterMetric: string;
  accountId: string;
  partition: string;
  numNodes: number;
  cores: number;
  jobHours: number;
  jobMin: number;
  workDir: string;
  userConfig: { 'slurm': {}, 'timeseries-wizard': {} },
  idCol: string;
  delimiter: string;
  timeseriesName: string;
  modelDescription: string;
  TimeSeriesLocalStorage: any;
  validForms: boolean;
  marking: { text: string, value: string}[];
  selectedMarking: {text: string, value: string}[];
}

/**
 * modal wizard for the timeseries model creation
 */

let initialState = {};
export default class TimeseriesWizard extends React.Component<
  TimeseriesWizardProps,
  TimeseriesWizardState
  > {
  public constructor(props: TimeseriesWizardProps) {
    super(props);
    this.state = {
      project: props.project,
      model: { _id: '' },
      modalId: "slycat-wizard",
      jid: '',
      visibleTab: '0',
      selectedOption: 'xyce',
      loadingData: false,
      hostname: '',
      sessionExists: false,
      username: '',
      password: '',
      hdf5Directory: '',
      selectedTablePath: '',
      selectedXycePath: '',
      inputDirectory: '',
      parserType: '',
      columnNames: [],
      timeseriesColumn: '',
      binCount: 500,
      resamplingAlg: 'uniform-paa',
      clusterLinkageMeasure: 'average',
      clusterMetric: 'euclidean',
      accountId: '',
      partition: '',
      numNodes: 1,
      cores: 2,
      jobHours: 0,
      jobMin: 30,
      workDir: '',
      userConfig: { 'slurm': {}, 'timeseries-wizard': {} },
      idCol: '%eval_id',
      delimiter: ',',
      timeseriesName: '',
      modelDescription: '',
      TimeSeriesLocalStorage: localStorage.getItem("slycat-timeseries-wizard") as any,
      validForms: true,
      marking: [],
      selectedMarking: [],
    };
    initialState = cloneDeep(this.state);
    this.getMarkings();
    this.create_model();
  }

  getBodyJsx(): JSX.Element {
    return (
      <div>
        <ul className="nav nav-pills">
          <li className={this.state.visibleTab == '0' ? 'nav-item active' : 'nav-item'}><a className="nav-link">Find Data</a></li>
          {this.state.selectedOption != 'hdf5' ?
            <li className={this.state.visibleTab == '1' ? 'nav-item active' : 'nav-item'}><a className="nav-link">Select Table File</a></li>
            : null}
          <li className={this.state.visibleTab == '2' ? 'nav-item active' : 'nav-item'}><a className="nav-link">Timeseries Parameters</a></li>
          {this.state.selectedOption == 'xyce' ?
            <li className={this.state.visibleTab == '3' ? 'nav-item active' : 'nav-item'}><a className="nav-link">Select Timeseries File</a></li>
            : null}
          {this.state.selectedOption == 'hdf5' ?
            <li className={this.state.visibleTab == '4' ? 'nav-item active' : 'nav-item'}><a className="nav-link">Select HDF5 Directory</a></li>
            : null}
          <li className={this.state.visibleTab == '5' ? 'nav-item active' : 'nav-item'}><a className="nav-link">HPC Parameters</a></li>
          <li className={this.state.visibleTab == '6' ? 'nav-item active' : 'nav-item'}><a className="nav-link">Name Model</a></li>
        </ul>
        {this.state.visibleTab === "0" ?
          <div>
            <RemoteLoginTab 
              onChange={(value: string) => {
                this.setState({ selectedOption: value });
              }}
              checked={this.state.selectedOption}
              loadingData={this.state.loadingData}
              callBack={(newHostname: string, newUsername: string, newPassword: string, sessionExists: boolean) => {
                this.setState({
                  hostname: newHostname,
                  sessionExists: sessionExists,
                  username: newUsername,
                  password: newPassword
                });
              }}
            />
          </div>
          : null}
        {this.state.visibleTab === "1" ?
          <div>
            <RemoteFileBrowser
              onSelectFileCallBack={this.onSelectTableFile}
              onReauthCallBack={this.onReauth}
              hostname={this.state.hostname}
            />
          </div>
          : null}
        {this.state.visibleTab === "2"?
          <div>
            <TimeseriesParametersTab 
              fileType={this.state.selectedOption}
              delimiter={this.state.delimiter}
              columnNames={this.state.columnNames}
              delimiterCallback={(delim: string) => {
                this.setState({ delimiter: delim });
              }}
              columnCallback={(type: string) => {
                this.setState({ timeseriesColumn: type });
              }}
              bincountCallback={(count: number) => {
                this.setState({ binCount: count });
              }}
              resamplingCallback={(alg: string) => {
                this.setState({ resamplingAlg: alg });
              }}
              linkageCallback={(clusterLinkage: string) => {
                this.setState({ clusterLinkageMeasure: clusterLinkage });
              }}
              metricCallback={(metric: string) => {
                this.setState({ clusterMetric: metric });
              }}
            />
          </div>
          : null}
        {this.state.visibleTab === "3" ?
          <div>
            <RemoteFileBrowser
              onSelectFileCallBack={this.onSelectTimeseriesFile}
              onReauthCallBack={this.onReauth}
              hostname={this.state.hostname}
            />
          </div>
          : null}
        {this.state.visibleTab === "4" ?
          <div>
            <RemoteFileBrowser
              onSelectFileCallBack={this.onSelectHDF5Directory}
              onReauthCallBack={this.onReauth}
              hostname={this.state.hostname}
            />
          </div>
          : null}
        {this.state.visibleTab === "5" ?
          <div>
            <HPCParametersTab 
              accountId={this.state.accountId}
              partition={this.state.partition}
              numNodes={this.state.numNodes}
              cores={this.state.cores}
              jobHours={this.state.jobHours}
              jobMin={this.state.jobMin}
              workDir={this.state.workDir}
              accountIdCallback={(id: string) => {
                this.setState({ accountId: id });
                }}
              partitionCallback={(part: string) => {
                this.setState({ partition: part });
                }}
              nodesCallback={(num: number) => {
                this.setState({ numNodes: num });
                }}
              coresCallback={(numCores: number) => {
                this.setState({ cores: numCores });
                }}
              hoursCallback={(hours: number) => {
                this.setState({ jobHours: hours });
                }}
              minutesCallback={(mins: number) => {
                this.setState({ jobMin: mins });
                }}
              workDirCallback={(dir: string) => {
                this.setState({ workDir: dir });
                }}
            />
          </div>
          : null}
        {this.state.visibleTab === "6" ?
          <div>
            <ModelNamingTab 
              marking={this.state.marking}
              nameCallback={(name: string) => {
                this.setState({ timeseriesName: name });
                }}
              descriptionCallback={(description: string) => {
                this.setState({ modelDescription: description });
                }}
              markingCallback={(marking: any) => {
                this.setState({ selectedMarking: marking });
                }}
            />
          </div>
          : null}
      </div>
    );
  }

  getFooterJSX(): JSX.Element[] {
    let footerJSX = [];
    if (this.state.visibleTab != "0") {
      footerJSX.push(
        <button key={1} type='button' className='btn btn-light mr-auto' onClick={this.back}>
          Back
      </button>
      );
    }
    const isDisabled = this.state.visibleTab === '1' && this.state.selectedTablePath === ''
    const continueClassNames = isDisabled ?
      'btn btn-primary disabled' : 'btn btn-primary';

    if (this.state.visibleTab == '0' && this.state.sessionExists != true) {
      footerJSX.push(
        <ConnectButton
          key={3}
          text='Continue'
          loadingData={this.state.loadingData}
          hostname={this.state.hostname}
          username={this.state.username}
          password={this.state.password}
          callBack={this.connectButtonCallBack}
        />);
    }
    else {
      footerJSX.push(
        <button disabled={isDisabled} key={4} type='button' className={continueClassNames} onClick={this.continue}>
          Continue
        </button>
      )
    }
    return footerJSX;
  }

  validateFields = () => {
    if (this.state.visibleTab === '1' && this.state.selectedTablePath === '') {
      return false;
    }
    else if (this.state.visibleTab === '2' && this.state.delimiter === '') {
      $('#delimiter').addClass('is-invalid');
      return false;
    }
    else if (this.state.visibleTab === '3' && this.state.selectedXycePath === '') {
      return false;
    }
    else if (this.state.visibleTab === '4' && this.state.hdf5Directory === '') {
      return false;
    }
    else if (this.state.visibleTab === '5' && (this.state.accountId === '' || this.state.partition === '' || this.state.workDir === '')) {
      this.state.accountId === '' ? $('#account-id').addClass('is-invalid') : $('#account-id').removeClass('is-invalid')
      this.state.partition === '' ? $('#partition').addClass('is-invalid') : $('#partition').removeClass('is-invalid')
      this.state.workDir === '' ? $('#work-dir').addClass('is-invalid') : $('#work-dir').removeClass('is-invalid')
      return false;
    }
    else if (this.state.visibleTab === '6' && this.state.timeseriesName === '') {
      this.state.timeseriesName === '' ? $('#timeseries-name').addClass('is-invalid') : $('#timeseries-name').removeClass('is-invalid')
      return false;
    }
    else {
      return true;
    }
  }

  continue = () => {
    if (this.validateFields()) {

      if (this.state.visibleTab === '0' && this.state.selectedOption != 'hdf5') {
        this.setState({ visibleTab: '1' }, () => {
          client.get_user_config_fetch({ hostname: this.state.hostname })
            .then((results) => {
              this.setState({
                numNodes: results["config"]["slurm"]["nnodes"], cores: results["config"]["slurm"]["ntasks-per-node"],
                partition: results["config"]["slurm"]["partition"], jobHours: results["config"]["slurm"]["time-hours"],
                jobMin: results["config"]["slurm"]["time-minutes"], accountId: results["config"]["slurm"]["wcid"],
                workDir: results["config"]["slurm"]["workdir"], idCol: results["config"]["timeseries-wizard"]["id-column"],
                delimiter: results["config"]["timeseries-wizard"]["inputs-file-delimiter"],
                timeseriesColumn: results["config"]["timeseries-wizard"]["timeseries-name"]
              });
            });
        });
      }
      else if (this.state.visibleTab === '0' && this.state.selectedOption == 'hdf5') {
        this.setState({ visibleTab: '2' });
      }
      else if (this.state.visibleTab === '1') {
        this.setState({ visibleTab: '2' });
      }
      else if (this.state.visibleTab === '2' && this.state.selectedOption == 'xyce') {
        this.setState({ visibleTab: '3' });
      }
      else if (this.state.visibleTab === '2' && this.state.selectedOption == 'csv') {
        this.setState({ visibleTab: '5' });
      }
      else if (this.state.visibleTab === '2' && this.state.selectedOption == 'hdf5') {
        this.setState({ visibleTab: '4' });
      }
      else if (this.state.visibleTab === '3') {
        this.setState({ visibleTab: '5' });
      }
      else if (this.state.visibleTab === '4') {
        this.setState({ visibleTab: '5' });
      }
      else if (this.state.visibleTab === '5') {
        this.compute();
        this.setState({ visibleTab: '6' });
      }
      else if (this.state.visibleTab === '6') {
        this.name_model();
      }
    }
  };

  back = () => {
    if (this.state.visibleTab === '1') {
      this.setState({ visibleTab: '0' });
    }
    else if (this.state.visibleTab === '2' && this.state.selectedOption != 'hdf5') {
      this.setState({ visibleTab: '1' });
    }
    else if (this.state.visibleTab === '2' && this.state.selectedOption == 'hdf5') {
      this.setState({ visibleTab: '0' });
    }
    else if (this.state.visibleTab === '3') {
      this.setState({ visibleTab: '2' });
    }
    else if (this.state.visibleTab === '4') {
      this.setState({ visibleTab: '2' });
    }
    else if (this.state.visibleTab === '5' && this.state.selectedOption == 'xyce') {
      this.setState({ visibleTab: '3' });
    }
    else if (this.state.visibleTab === '5' && this.state.selectedOption == 'csv') {
      this.setState({ visibleTab: '2' });
    }
    else if (this.state.visibleTab === '5' && this.state.selectedOption == 'hdf5') {
      this.setState({ visibleTab: '4' });
    }
    else if (this.state.visibleTab === '6') {
      this.setState({ visibleTab: '5' });
    }
  }

  getMarkings = () => {
    client.get_configuration_markings_fetch().then((markings) => {
      markings.sort(function (left: any, right: any) {
        return left.type == right.type ? 0 : left.type < right.type ? -1 : 1;
      });
      if (markings.length) {
        const configured_markings = markings.map((marking:any) => {return {text: marking["label"], value: marking["type"]} });
        this.setState({ marking: configured_markings });
      }
    });
  }

  compute = () => {

    let userConfig: any = { "slurm": {}, "timeseries-wizard": {} };
    userConfig["slurm"]["wcid"] = this.state.accountId;
    userConfig["slurm"]["partition"] = this.state.partition;
    userConfig["slurm"]["workdir"] = this.state.workDir;
    userConfig["slurm"]["time-hours"] = this.state.jobHours;
    userConfig["slurm"]["time-minutes"] = this.state.jobMin;
    userConfig["slurm"]["nnodes"] = this.state.numNodes;
    userConfig["slurm"]["ntasks-per-node"] = this.state.cores;
    userConfig["timeseries-wizard"]["id-column"] = this.state.idCol;
    userConfig["timeseries-wizard"]["inputs-file-delimiter"] = this.state.delimiter;
    userConfig["timeseries-wizard"]["timeseries-name"] = this.state.timeseriesColumn;

    client.set_user_config({
      hostname: this.state.hostname,
      config: userConfig,
      success: function (response: any) { },
      error: function (request: Request, status: any, reason_phrase: any) {
        console.log(reason_phrase);
      }
    });

    this.on_slycat_fn();
  }

  connectButtonCallBack = (sessionExists: boolean, loadingData: boolean) => {
    this.setState({
      sessionExists,
      loadingData,
    }, () => {
      if (this.state.sessionExists) {
        this.continue();
      }
    });
  }

  onReauth = () => {
    // Session has been lost, so update state to reflect this.
    this.setState({
      sessionExists: false,
    });
    // Switch to login controls
    this.setState({ visibleTab: "2" });
  }

  onSelectTableFile = (selectedPath: string, selectedPathType: string) => {
    // type is either 'd' for directory or 'f' for file
    if (selectedPathType === 'f') {
      var inputDirectory = selectedPath.substring(0, selectedPath.lastIndexOf('/') + 1);
      this.setState({ selectedTablePath: selectedPath });
      this.setState({ inputDirectory: inputDirectory });
    }
    if (this.state.selectedOption === 'csv') {
      client.get_time_series_names_fetch({
        hostname: this.state.hostname,
        path: selectedPath,
      }).then((result) => {
        this.handleColumnNames(result);
      })
    }
  }


  onSelectTimeseriesFile = (selectedPath: string, selectedPathType: string) => {
    // type is either 'd' for directory or 'f' for file

    if (selectedPathType === 'f') {
      this.setState({ selectedXycePath: selectedPath });
    }
  }

  onSelectHDF5Directory = (selectedPath: string, selectedPathType: string) => {
    if (selectedPathType === 'd') {
      this.setState({ hdf5Directory: selectedPath });
    }
  }

  handleColumnNames = (names: []) => {
    const columnNames = [];
    for (let i = 0; i < names.length; i++) {
      columnNames.push({ text: names[i], value: names[i] });
    }
    this.setState({ columnNames: columnNames });
    this.setState({ timeseriesColumn: columnNames[0]['value'] });
  }

  cleanup = () => {
    this.setState(initialState);
    client.delete_model_fetch({ mid: this.state.model['id'] });
  };

  create_model = () => {
    client.post_project_models_fetch({
      pid: this.state.project._id(),
      type: 'timeseries',
      name: this.state.timeseriesName,
      description: '',
      marking: '',
    }).then((result) => {
      this.setState({ model: result });
    })
  };

  generateUniqueId = () => {
    var d = Date.now();
    var uid = 'xxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });

    return uid;
  };

  on_slycat_fn = () => {
    let agent_function = 'timeseries-model';
    let uid = this.generateUniqueId();

    let fn_params = {
      'timeseries_type': this.state.selectedOption,
      'inputs_file': this.state.selectedTablePath,
      'input_directory': this.state.inputDirectory,
      'id_column': this.state.idCol,
      'inputs_file_delimiter': this.state.delimiter,
      'xyce_timeseries_file': this.state.selectedXycePath,
      'timeseries_name': this.state.timeseriesColumn,
      'cluster_sample_count': this.state.binCount,
      'cluster_sample_type': this.state.resamplingAlg,
      'cluster_type': this.state.clusterLinkageMeasure,
      'cluster_metric': this.state.clusterMetric,
      'workdir': this.state.workDir,
      'hdf5_directory': this.state.hdf5Directory,
      'retain_hdf5': true
    }

    var fn_params_copy = $.extend(true, {}, fn_params);

    if (fn_params.timeseries_type !== 'csv') {
      // Blank out timeseries_name
      fn_params_copy.timeseries_name = "";
    }

    let json_payload: any =
    {
      "scripts": [
      ],
      "hpc": {
        "is_hpc_job": true,
        "parameters": {
          "wckey": this.state.accountId,
          "nnodes": this.state.numNodes,
          "partition": this.state.partition,
          "ntasks_per_node": this.state.cores,
          "time_hours": this.state.jobHours,
          "time_minutes": this.state.jobMin,
          "time_seconds": 0,
          "working_dir": fn_params.workdir + "/slycat/"
        }
      }
    };

    var hdf5_dir = fn_params.workdir + "/slycat/" + uid + "/" + "hdf5";
    var pickle_dir = fn_params.workdir + "/slycat/" + uid + "/" + "pickle";

    if (fn_params.timeseries_type === "csv") {
      json_payload.scripts.push({
        "name": "timeseries_to_hdf5",
        "parameters": [
          {
            "name": "--output-directory",
            "value": hdf5_dir
          },
          {
            "name": "--id-column",
            "value": fn_params.id_column
          },
          {
            "name": "--inputs-file",
            "value": fn_params.inputs_file
          },
          {
            "name": "--inputs-file-delimiter",
            "value": fn_params.inputs_file_delimiter
          },
          {
            "name": "--force",
            "value": ""
          }
        ]
      });
    }
    else if (fn_params.timeseries_type === "xyce") {
      json_payload.scripts.push({
        "name": "xyce_timeseries_to_hdf5",
        "parameters": [
          {
            "name": "--output-directory",
            "value": hdf5_dir
          },
          {
            "name": "--id-column",
            "value": fn_params.id_column
          },
          {
            "name": "--timeseries-file",
            "value": fn_params.xyce_timeseries_file
          },
          {
            "name": "--input-directory",
            "value": fn_params.input_directory
          },
          {
            "name": "--force",
            "value": ""
          }
        ]
      });
    }
    // # check if we have a pre-set hdf5 directory
    // if "hdf5_directory" in params and params["hdf5_directory"] != "":
    //     hdf5_dir = params["hdf5_directory"]

    if (fn_params.timeseries_type === "csv") {
      json_payload.scripts.push({
        "name": "compute_timeseries",
        "parameters": [
          {
            "name": "--directory",
            "value": hdf5_dir
          },
          {
            "name": "--timeseries-name",
            "value": fn_params.timeseries_name
          },
          {
            "name": "--cluster-sample-count",
            "value": fn_params.cluster_sample_count
          },
          {
            "name": "--cluster-sample-type",
            "value": fn_params.cluster_sample_type
          },
          {
            "name": "--cluster-type",
            "value": fn_params.cluster_type
          },
          {
            "name": "--cluster-metric",
            "value": fn_params.cluster_metric
          },
          {
            "name": "--workdir",
            "value": pickle_dir
          },
          {
            "name": "--hash",
            "value": uid
          }
        ]
      });
    }
    else {
      json_payload.scripts.push({
        "name": "compute_timeseries",
        "parameters": [
          {
            "name": "--directory",
            "value": hdf5_dir
          },
          {
            "name": "--cluster-sample-count",
            "value": fn_params.cluster_sample_count
          },
          {
            "name": "--cluster-sample-type",
            "value": fn_params.cluster_sample_type
          },
          {
            "name": "--cluster-type",
            "value": fn_params.cluster_type
          },
          {
            "name": "--cluster-metric",
            "value": fn_params.cluster_metric
          },
          {
            "name": "--workdir",
            "value": pickle_dir
          },
          {
            "name": "--hash",
            "value": uid
          }
        ]
      });
    }

    client.post_remote_command_fetch({
      hostname: this.state.hostname,
      command: json_payload,
    }).then((results) => {
      console.log("FINISHED");
      const splitResult = results.errors.replace(/(\r\n\t|\n|\r\t)/gm, "").split(" ");
      const newJid = splitResult[splitResult.length - 1];
      this.setState({ jid: newJid });
      console.log("UPDATING MODEL INFO");
      this.server_update_model_info(uid);
    })
  };

  server_update_model_info = (uid: string) => {
    if (!this.state.model["id"])
      return void 0;

    var working_directory = this.state.workDir + "/slycat/" + uid + "/";

    let agent_function_params = {
      "timeseries_type": this.state.selectedOption,
      "inputs_file": this.state.selectedTablePath,
      // "input_directory": this.state.selected_path,
      "input_directory": '',
      "id_column": this.state.idCol,
      "inputs_file_delimeter": this.state.delimiter,
      // "xyce_timeseries_file": this.state.timeseriesFile,
      "xyce_timeseries_file": '',
      "timeseries_name": this.state.timeseriesColumn,
      "cluster_sample_count": this.state.binCount,
      "cluster_sample_type": this.state.resamplingAlg,
      "cluster_metric": this.state.clusterMetric,
      "workdir": this.state.workDir,
      "hdf5_directory": this.state.hdf5Directory,
      "retain_hdf5": true
    };

    client.put_model_parameter({
      mid: this.state.model["id"],
      aid: 'jid',
      value: this.state.jid,
      input: true
    });

    client.post_sensitive_model_command_fetch(
      {
        mid: this.state.model["id"],
        type: "timeseries",
        command: "update-model-info",
        parameters: {
          working_directory: working_directory,
          jid: this.state.jid,
          fn: "timeseries-model",
          hostname: this.state.hostname,
          username: this.state.username,
          fn_params: agent_function_params,
          uid: uid
        },
      }).then((result) => {
        console.log(result);
      });
  };

  name_model = () => {
    // Validating
    // formElement.classList.add('was-validated');

    // If valid...
    // if (formElement.checkValidity() === true)
    // {
    // Clearing form validation
    // formElement.classList.remove('was-validated');
    // Creating new model

    client.put_model_fetch({
      mid: this.state.model["id"],
      name: this.state.timeseriesName,
      description: this.state.modelDescription,
      marking: this.state.selectedMarking,
    }).then((result) => {
      this.go_to_model();
    })
    // }
  }

  go_to_model = () => {
    location = (server_root + 'models/' + this.state.model["id"]) as any;
  };

  render() {
    return (
      <ModalContent
        modalId={this.state.modalId}
        closingCallBack={this.cleanup}
        title={"Timeseries Wizard"}
        body={this.getBodyJsx()}
        footer={this.getFooterJSX()}
      />
    );
  }
}

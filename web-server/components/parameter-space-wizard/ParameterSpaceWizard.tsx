import * as React from "react";
import ModalContent from "components/ModalContent.tsx";
import client from "js/slycat-web-client";
import LocateDataTab from 'plugins/slycat-parameter-image/js/Components/LocateDataTab';
import UploadTableTab from 'plugins/slycat-parameter-image/js/Components/UploadTableTab';
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
import RemoteFileBrowserNoSelector from 'components/RemoteFileBrowserNoSelector.tsx'
import SlycatSelector from 'components/SlycatSelector.tsx';
import server_root from "js/slycat-server-root";
import { cloneDeep } from "lodash";
import markings from "js/slycat-selectable-markings";

/**
 * not used
 */
export interface ParameterSpaceWizardProps {
  project: any;
  markings: any;
}

/**
 * not used
 */
export interface ParameterSpaceWizardState {
  project: any;
  model: { _id: string };
  modalId: string;
  jid: string;
  visibleTab: string;
  selectedOption: string;
  useProjectData: boolean;
  fileLocation: string;
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
export default class ParameterSpaceWizard extends React.Component<
  ParameterSpaceWizardProps,
  ParameterSpaceWizardState
  > {
  public constructor(props: ParameterSpaceWizardProps) {
    super(props);
    this.state = {
      project: props.project,
      model: { _id: '' },
      modalId: "slycat-wizard",
      jid: '',
      visibleTab: '0',
      selectedOption: 'xyce',
      fileLocation: '',
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
  }

  getBodyJsx(): JSX.Element {
    return (
      <div>
        <ul className="nav nav-pills">
          <li className={this.state.visibleTab == '0' ? 'nav-item active' : 'nav-item'}><a className="nav-link">Locate Data</a></li>
          {this.state.fileLocation == 'local' ?
            <li className={this.state.visibleTab == '1' ? 'nav-item active' : 'nav-item'}><a className="nav-link">Upload Table</a></li>
            : null}
          {this.state.fileLocation == 'remote' || this.state.fileLocation == 'smb' ?
          <li className={this.state.visibleTab == '2' ? 'nav-item active' : 'nav-item'}><a className="nav-link">Choose Host</a></li>
            : null}
          {this.state.fileLocation == 'remote' || this.state.fileLocation == 'smb' ?
            <li className={this.state.visibleTab == '3' ? 'nav-item active' : 'nav-item'}><a className="nav-link">Select Table</a></li>
            : null}
          <li className={this.state.visibleTab == '4' ? 'nav-item active' : 'nav-item'}><a className="nav-link">Select Columns</a></li>
          <li className={this.state.visibleTab == '5' ? 'nav-item active' : 'nav-item'}><a className="nav-link">Name Model</a></li>
        </ul>
        {this.state.visibleTab === "0" ?
          <div>
            <LocateDataTab 
              onChange={(value: string) => {
                this.setState({ fileLocation: value });
              }}
              checked={this.state.fileLocation}
              loadingData={this.state.loadingData}
            />
          </div>
          : null}
        {this.state.visibleTab === "1" ?
          <div>
            <UploadTableTab 
              progressBarProgress={0}
              onSelectParserCallBack={this.onSelectParser}
              useProjectDataCallBack={this.onUseProjectData}
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
            <RemoteFileBrowserNoSelector
              selectedOption={this.state.selectedOption}
              onSelectFileCallBack={this.onSelectTimeseriesFile}
              onReauthCallBack={this.onReauth}
              onSelectParserCallBack={this.onSelectParser}
              hostname={this.state.hostname}
            />
          </div>
          : null}
        {this.state.visibleTab === "4" ?
          <div>
            <RemoteFileBrowser
              selectedOption={this.state.selectedOption}
              onSelectFileCallBack={this.onSelectHDF5Directory}
              onReauthCallBack={this.onReauth}
              onSelectParserCallBack={this.onSelectParser}
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

    if (this.state.visibleTab == '2' && this.state.sessionExists != true) {
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
    // May need field validation, for now return true
    return true;
  }

  continue = () => {
    console.log('in continue.');
    if (this.validateFields()) {
      // Locate Data tab branches
      if (this.state.visibleTab === '0' && this.state.fileLocation == 'local') {
        this.setState({ visibleTab: '1' })
      }
      else if (this.state.visibleTab === '0' && (this.state.fileLocation == 'remote' || this.state.fileLocation == 'smb')) {
        this.setState({ visibleTab: '2' });
      }
      else if (this.state.visibleTab === '0' && this.state.fileLocation == 'server') {
        this.setState({visibleTab: '4' });
      }
      // Upload Table tab branches
      else if (this.state.visibleTab === '1') {
        this.setState({ visibleTab: '4' });
      }
      // Choose Host tab branches
      else if (this.state.visibleTab === '2') {
        this.setState({ visibleTab: '3' });
      }
      // Select Table tab branches
      else if (this.state.visibleTab === '3') {
        this.setState({ visibleTab: '4' });
      }
      // Select Columns tab branches
      else if (this.state.visibleTab === '4') {
        this.setState({ visibleTab: '5' });
      }
      // Name Model tab
      else if (this.state.visibleTab === '5') {
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
    client.get_selectable_configuration_markings_fetch().then((markings) => {
      markings.sort(function (left: any, right: any) {
        return left.type == right.type ? 0 : left.type < right.type ? -1 : 1;
      });
      if (markings.length) {
        const configured_markings = markings.map((marking:any) => {return {text: marking["label"], value: marking["type"]} });
        // setState is asynchronous, so have to pass create_model as callback to it instead of calling it immediately after it.
        // This is because create_model tries to get marking from the state and sometimes just gets the initial empty array instead.
        this.setState({ marking: configured_markings, selectedMarking: configured_markings[0]["type"] }, this.create_model);
        // this.create_model();
      }
    });
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

  onSelectParser = (selectedParser: string) => {
    this.setState({ parserType: selectedParser });
  }

  onUseProjectData = (useProjectData: boolean) => {
    this.setState({ useProjectData: useProjectData });
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
    // delete_model_fetch should be called before resetting state, otherwise the model's id might be erased 
    // before the call to delete the model
    client.delete_model_fetch({ mid: this.state.model['id'] });
    this.setState(initialState);    
  };

  create_model = () => {
    client.post_project_models_fetch({
      pid: this.state.project._id(),
      type: 'parameter-space',
      name: this.state.timeseriesName,
      description: '',
      marking: this.state.marking[0]['value'],
    }).then((result) => {
      this.setState({ model: result });
    })
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
        title={this.state.visibleTab != "0" ? "NEW Parameter Space Wizard - " + this.state.selectedOption : "NEW Parameter Space Wizard"}
        body={this.getBodyJsx()}
        footer={this.getFooterJSX()}
      />
    );
  }
}

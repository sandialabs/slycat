'use strict';
import * as React from 'react';
import SlycatTextInput from 'components/SlycatTextInput.tsx';
import SlycatTimeInput from 'components/SlycatTimeInput.tsx';
import SlycatNumberInput from 'components/SlycatNumberInput.tsx';

/**
 */
export interface HPCParametersTabProps {
    accountId: string
    partition: string
    numNodes: number
    cores: number
    jobHours: number
    jobMin: number
    workDir: string
    accountIdCallback: Function
    partitionCallback: Function
    nodesCallback: Function
    coresCallback: Function
    hoursCallback: Function
    minutesCallback: Function
    workDirCallback: Function
}

/**
 * not used
 */
export interface HPCParametersTabState {
}
/**
 * class that creates a a form with checkboxes
 * some other process
 */
export default class HPCParametersTab extends React.Component<HPCParametersTabProps, HPCParametersTabState> {
  /**
   * not used
   */
  public constructor(props:HPCParametersTabProps) {
    super(props)
    this.state = {}
  }

//   onValueChange = (value:string) => {

//   };

  public render () {
    return (
    <div>
        <SlycatTextInput
            id={"account-id"}
            label={"Account ID"}
            value={this.props.accountId ? this.props.accountId : ''}
            warning={"Please enter an account ID."}
            callBack={this.props.accountIdCallback}
        />
        <SlycatTextInput
            id={"partition"}
            label={"Partition/Queue"}
            value={this.props.partition ? this.props.partition : ''}
            warning={"Please enter a partition/batch."}
            callBack={this.props.partitionCallback}
        />
        <SlycatNumberInput
            label={'Number of nodes'}
            value={this.props.numNodes ? this.props.numNodes : 1}
            callBack={this.props.nodesCallback}
        />
        <SlycatNumberInput
            label={'Cores'}
            value={this.props.cores ? this.props.cores : 2}
            callBack={this.props.coresCallback}
        />
        <SlycatTimeInput
            label={'Requested Job Time'}
            hours={this.props.jobHours ? this.props.jobHours : 0}
            minutes={this.props.jobMin ? this.props.jobMin : 30}
            minCallBack={this.props.minutesCallback}
            hourCallBack={this.props.hoursCallback}
        />
        <SlycatTextInput
            id={"work-dir"}
            label={"Working Directory"}
            value={this.props.workDir ? this.props.workDir : ''}
            warning={"Please enter a working directory."}
            callBack={this.props.workDirCallback}
        />
    </div>
    );
  }
}

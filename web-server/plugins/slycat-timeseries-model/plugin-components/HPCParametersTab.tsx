'use strict';
import * as React from 'react';
import SlycatTextInput from 'components/SlycatTextInput.tsx';
import SlycatTimeInput from 'components/SlycatTimeInput.tsx';
import SlycatNumberInput from 'components/SlycatNumberInput.tsx';

interface HPCParametersTabProps {
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

function HPCParametersTab(props: HPCParametersTabProps) {

    return (
    <div>
        <SlycatTextInput
            id={"account-id"}
            label={"Account ID"}
            value={props.accountId ? props.accountId : ''}
            warning={"Please enter an account ID."}
            callBack={props.accountIdCallback}
        />
        <SlycatTextInput
            id={"partition"}
            label={"Partition/Queue"}
            value={props.partition ? props.partition : ''}
            warning={"Please enter a partition/batch."}
            callBack={props.partitionCallback}
        />
        <SlycatNumberInput
            label={'Number of nodes'}
            value={props.numNodes ? props.numNodes : 1}
            callBack={props.nodesCallback}
        />
        <SlycatNumberInput
            label={'Cores'}
            value={props.cores ? props.cores : 2}
            callBack={props.coresCallback}
        />
        <SlycatTimeInput
            label={'Requested Job Time'}
            hours={props.jobHours ? props.jobHours : 0}
            minutes={props.jobMin ? props.jobMin : 30}
            minCallBack={props.minutesCallback}
            hourCallBack={props.hoursCallback}
        />
        <SlycatTextInput
            id={"work-dir"}
            label={"Working Directory"}
            value={props.workDir ? props.workDir : ''}
            warning={"Please enter a working directory."}
            callBack={props.workDirCallback}
        />
    </div>
    );
}

export default HPCParametersTab
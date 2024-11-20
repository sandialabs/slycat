'use strict';
import * as React from 'react';
import SlycatFormRadioCheckbox from 'components/SlycatFormRadioCheckbox.tsx';
import SlycatRemoteControls from 'components/SlycatRemoteControls.jsx';

interface ParameterSpaceRemoteLoginTabProps {
    loadingData: any
    callBack: Function
}

function ParameterSpaceRemoteLoginTab(props: ParameterSpaceRemoteLoginTabProps) {
    return (
        <div>
            <SlycatRemoteControls
                loadingData={props.loadingData}
                callBack={props.callBack}
                showConnectButton={false}
            />
        </div>
    );
}

export default ParameterSpaceRemoteLoginTab
'use strict';
import * as React from 'react';
import SlycatFormRadioCheckbox from 'components/SlycatFormRadioCheckbox.tsx';
import SlycatRemoteControls from 'components/SlycatRemoteControls.jsx';

interface TimeseriesRemoteLoginTabProps {
    checked: string
    onChange: Function
    loadingData: any
    callBack: Function
}

function TimeseriesRemoteLoginTab(props: TimeseriesRemoteLoginTabProps) {
    return (
        <div>
            <form className='ml-3'>
                <SlycatFormRadioCheckbox
                    checked={props.checked === 'xyce'}
                    onChange={props.onChange}
                    value={'xyce'}
                    text={'Xyce'}
                />
                <SlycatFormRadioCheckbox
                    checked={props.checked === 'csv'}
                    onChange={props.onChange}
                    value={'csv'}
                    text={'CSV'}
                />
                <SlycatFormRadioCheckbox
                    checked={props.checked === 'hdf5'}
                    onChange={props.onChange}
                    value={'hdf5'}
                    text={'HDF5'}
                />
            </form>
            <SlycatRemoteControls
                loadingData={props.loadingData}
                callBack={props.callBack}
                showConnectButton={false}
            />
        </div>
    );
}

export default TimeseriesRemoteLoginTab
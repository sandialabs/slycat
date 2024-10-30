'use strict';
import * as React from 'react';
import SlycatFormRadioCheckbox from 'components/SlycatFormRadioCheckbox.tsx';
import SlycatRemoteControls from 'components/SlycatRemoteControls.jsx';

interface LocateDataTabProps {
    checked: string
    onChange: Function
    loadingData: any
}

function LocateDataTab(props: LocateDataTabProps) {
    return (
        <div>
            <form className='ml-3'>
                <SlycatFormRadioCheckbox
                    checked={props.checked === 'local'}
                    onChange={props.onChange}
                    value={'local'}
                    text={'Local'}
                />
                <SlycatFormRadioCheckbox
                    checked={props.checked === 'remote'}
                    onChange={props.onChange}
                    value={'remote'}
                    text={'Remote'}
                />
                <SlycatFormRadioCheckbox
                    checked={props.checked === 'smb'}
                    onChange={props.onChange}
                    value={'smb'}
                    text={'SMB Drive'}
                />
                <SlycatFormRadioCheckbox
                    checked={props.checked === 'server'}
                    onChange={props.onChange}
                    value={'server'}
                    text={'Slycat Server'}
                />
            </form>
        </div>
    );
}

export default LocateDataTab
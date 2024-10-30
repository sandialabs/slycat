'use strict';
import * as React from 'react';
import SlycatFormRadioCheckbox from 'components/SlycatFormRadioCheckbox.tsx';
import SlycatRemoteControls from 'components/SlycatRemoteControls.jsx';
import LocalFileUpload from 'components/LocalFileUpload.tsx';
import SlycatSelector, {Option} from 'components/SlycatSelector.tsx';

interface UploadTableTabProps {
    progressBarProgress: number
    onSelectParserCallBack: Function
    useProjectDataCallBack: Function
}

function UploadTableTab(props: UploadTableTabProps) {
    let options: Option[] = [];
    let checkedValue = false;
    options = [{
        text:'Comma separated values (CSV)',
        value:'slycat-csv-parser'
      },
      {
        text:'Dakota tabular',
        value:'slycat-dakota-parser'
    }];

    const updateCheckbox = (checkedValue: any) => {
        props.useProjectDataCallBack(checkedValue.target.checked);
      };

    return (
        <div>
            <form className='ml-3'>
                <LocalFileUpload
                    progressBarProgress={0}
                />
                <SlycatSelector
                    onSelectCallBack={props.onSelectParserCallBack}
                    label={'Filetype'}
                    options={options}
                />
                <input
                    type="checkbox"
                    onChange={e => updateCheckbox(e)}
                />
                Save original data to server?
            </form>
        </div>
    );
}

export default UploadTableTab
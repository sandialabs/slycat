'use strict';
import * as React from 'react';
import SlycatFormRadioCheckbox from 'components/SlycatFormRadioCheckbox.tsx';
import SlycatRemoteControls from 'components/SlycatRemoteControls.jsx';

/**
 */
export interface RemoteLoginTabProps {
  onChange: Function
  checked: string
  loadingData: boolean
  callBack: Function
}

/**
 * not used
 */
export interface RemoteLoginTabState {
}
/**
 * class that creates a a form with checkboxes
 * some other process
 */
export default class RemoteLoginTab extends React.Component<RemoteLoginTabProps, RemoteLoginTabState> {
  /**
   * not used
   */
  public constructor(props:RemoteLoginTabProps) {
    super(props)
    this.state = {}
  }

//   onValueChange = (value:string) => {

//   };

  public render () {
    return (
    <div>
        <form className='ml-3'>
            <SlycatFormRadioCheckbox
            checked={this.props.checked === 'xyce'}
            onChange={this.props.onChange}
            value={'xyce'}
            text={'Xyce'}
            />
            <SlycatFormRadioCheckbox
            checked={this.props.checked === 'csv'}
            onChange={this.props.onChange}
            value={'csv'}
            text={'CSV'}
            />
            <SlycatFormRadioCheckbox
            checked={this.props.checked === 'hdf5'}
            onChange={this.props.onChange}
            value={'hdf5'}
            text={'HDF5'}
            />
        </form>
        <SlycatRemoteControls
            loadingData={this.props.loadingData}
            callBack={this.props.callBack}
            showConnectButton={false}
        />
    </div>
    );
  }
}

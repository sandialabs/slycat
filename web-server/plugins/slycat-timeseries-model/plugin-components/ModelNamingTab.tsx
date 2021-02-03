'use strict';
import * as React from 'react';
import SlycatTextInput from 'components/SlycatTextInput.tsx';
import SlycatSelector from 'components/SlycatSelector.tsx';

/**
 */
export interface ModelNamingTabProps {
    marking: {text: string, value: string}[]
    nameCallback: Function
    descriptionCallback: Function
    markingCallback: Function
}

/**
 * not used
 */
export interface ModelNamingTabState {
}
/**
 * class that creates a a form with checkboxes
 * some other process
 */
export default class ModelNamingTab extends React.Component<ModelNamingTabProps, ModelNamingTabState> {
  /**
   * not used
   */
  public constructor(props:ModelNamingTabProps) {
    super(props)
    this.state = {}
  }

//   onValueChange = (value:string) => {

//   };

  public render () {
    return (
    <div>
        <SlycatTextInput
            id={"timeseries-name"}
            label={"Name"}
            value={''}
            warning={"Please enter a model name."}
            callBack={this.props.nameCallback}
        />
        <SlycatTextInput
            label={"Description"}
            value={''}
            callBack={this.props.descriptionCallback}
        />
        <SlycatSelector
            label={'Marking'}
            options={this.props.marking}
            onSelectCallBack={this.props.markingCallback}
        />
    </div>
    );
  }
}

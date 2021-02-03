'use strict';
import * as React from 'react';
import SlycatTextInput from 'components/SlycatTextInput.tsx';
import SlycatSelector from 'components/SlycatSelector.tsx';
import SlycatNumberInput from 'components/SlycatNumberInput.tsx';

/**
 */
export interface RemoteLoginTabProps {
  fileType: string
  delimiter: string
  columnNames: any
  delimiterCallback: Function
  columnCallback: Function
  bincountCallback: Function
  resamplingCallback: Function
  linkageCallback: Function
  metricCallback: Function
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
        {this.props.fileType === 'csv' ?
            <div>
                <SlycatTextInput
                    id={"delimiter"}
                    label={"Table File Delimeter"}
                    value={this.props.delimiter ? this.props.delimiter : ','}
                    warning={"Please enter a table file delimiter."}
                    callBack={this.props.delimiterCallback}
                />
                <SlycatSelector
                    label={'Timeseries Column Name'}
                    options={this.props.columnNames}
                    onSelectCallBack={this.props.columnCallback}
                />
            </div>
        : null }
        <div>
            <SlycatNumberInput
            label={'Timeseries Bin Count'}
            value={500}
            callBack={this.props.bincountCallback}
            />
            <SlycatSelector
            label={'Resampling Algorithm'}
            options={[{ 'text': 'uniform piecewise aggregate approximation', 'value': 'uniform-paa' },
            { 'text': 'uniform piecewise linear approximation', 'value': 'uniform-pla' }]}
            onSelectCallBack={this.props.resamplingCallback}
            />
            <SlycatSelector
            label={'Cluster Linkage Measure'}
            options={[{ 'text': 'average: Unweighted Pair Group Method with Arithmetic Mean (UPGMA) Algorithm', 'value': 'average' },
            { 'text': 'single: Nearest Point Algorithm', 'value': 'single' },
            { 'text': 'complete: Farthest Point Algorithm', 'value': 'complete' },
            { 'text': 'weighted: Weighted Pair Group Method with Arithmetic Mean (WPGMA) Algorithm', 'value': 'weighted' }]}
            onSelectCallBack={this.props.linkageCallback}
            />
            <SlycatSelector
            label={'Cluster Metric'}
            options={[{ 'text': 'euclidean', 'value': 'euclidean' }]}
            disabled={true}
            onSelectCallBack={this.props.metricCallback}
            />
        </div>
    </div>
    );
  }
}

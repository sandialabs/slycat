import * as React from "react";
import SlycatTextInput from "components/SlycatTextInput";
import SlycatSelector from "components/SlycatSelector";
import SlycatNumberInput from "components/SlycatNumberInput";

interface TimeseriesParametersTabProps {
    delimiter: string
    delimiterCallback: Function
    columnNames: any
    allColumnNames: any
    indexColumnCallback: Function
    columnCallback: Function
    bincountCallback: Function
    resamplingCallback: Function
    linkageCallback: Function
    metricCallback: Function
    fileType: string
}

function TimeseriesParametersTab(props: TimeseriesParametersTabProps) {
  return (
    <div>
      {props.fileType === "csv" ? (
        <div>
          <div className="alert alert-primary" role="alert">
            Select a particular timeseries and clustering parameters.
          </div>
          <strong>Slycat Table File Selections</strong>
          <hr className="mt-1 mb-3"></hr>
          <SlycatSelector
            label={"Column Name of Timeseries Path"}
            options={props.columnNames}
            onSelectCallBack={props.columnCallback}
          />
          <SlycatSelector
            label={'Index Column Name'}
            options={props.allColumnNames}
            onSelectCallBack={props.indexColumnCallback}
          />
          <SlycatTextInput
            id={"delimiter"}
            label={"Table File Delimeter"}
            value={props.delimiter ? props.delimiter : ","}
            warning="Please enter a table file delimiter."
            callBack={props.delimiterCallback}
          />
          <strong>Timeseries Clustering Parameters</strong>
          <hr className="mt-1 mb-3"></hr>
        </div>
      ) : null}
      <div>
        <SlycatNumberInput
          label={"Timeseries Bin Count"}
          value={500}
          callBack={props.bincountCallback}
        />
        <SlycatSelector
          label={"Resampling Algorithm"}
          options={[
            { text: "uniform piecewise aggregate approximation", value: "uniform-paa" },
            { text: "uniform piecewise linear approximation", value: "uniform-pla" },
          ]}
          onSelectCallBack={props.resamplingCallback}
        />
        <SlycatSelector
          label={"Cluster Linkage Measure"}
          options={[
            {
              text: "average: Unweighted Pair Group Method with Arithmetic Mean (UPGMA) Algorithm",
              value: "average",
            },
            { text: "single: Nearest Point Algorithm", value: "single" },
            { text: "complete: Farthest Point Algorithm", value: "complete" },
            {
              text: "weighted: Weighted Pair Group Method with Arithmetic Mean (WPGMA) Algorithm",
              value: "weighted",
            },
          ]}
          onSelectCallBack={props.linkageCallback}
        />
        {/* <SlycatSelector
          label={"Cluster Metric"}
          options={[{ text: "euclidean", value: "euclidean" }]}
          disabled={true}
          onSelectCallBack={props.metricCallback}
        /> */}
        Cluster Metric: Euclidean
      </div>
    </div>
  );
}

export default TimeseriesParametersTab;

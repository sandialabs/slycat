import SlycatSelector from 'components/SlycatSelector.tsx';
import SlycatTextInput from 'components/SlycatTextInput.tsx';
import * as React from 'react';

interface ModelNamingTabProps {
  nameCallback: Function;
  markingCallback: Function;
  descriptionCallback: Function;
  marking: { text: string; value: string }[];
}

function ModelNamingTab(props: ModelNamingTabProps) {
  return (
    <div>
      <SlycatTextInput
        id="timeseries-name"
        label="Name"
        value=""
        warning="Please enter a model name."
        callBack={props.nameCallback}
      />
      <SlycatTextInput label="Description" value="" callBack={props.descriptionCallback} />
      <SlycatSelector
        label="Marking"
        options={props.marking}
        onSelectCallBack={props.markingCallback}
      />
    </div>
  );
}

export default ModelNamingTab;

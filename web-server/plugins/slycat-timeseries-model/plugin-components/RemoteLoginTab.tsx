import * as React from "react";
import SlycatFormRadioCheckbox from "components/SlycatFormRadioCheckbox.tsx";
import SlycatRemoteControls from "components/SlycatRemoteControls.jsx";

interface RemoteLoginTabProps {
  checked: string;
  onChange: Function;
  loadingData: any;
  callBack: Function;
}

function RemoteLoginTab(props: RemoteLoginTabProps) {
  return (
    <div>
      <form className="mb-5">
        <SlycatFormRadioCheckbox
          checked={props.checked === "xyce"}
          onChange={props.onChange}
          value={"xyce"}
          text={"Xyce"}
        />
        <SlycatFormRadioCheckbox
          checked={props.checked === "csv"}
          onChange={props.onChange}
          value={"csv"}
          text={"CSV"}
        />
        <SlycatFormRadioCheckbox
          checked={props.checked === "hdf5"}
          onChange={props.onChange}
          value={"hdf5"}
          text={"HDF5"}
        />
      </form>
      <div className="alert alert-primary" role="alert">
        This Host or HPC system is also where your job will be submitted.
      </div>
      <SlycatRemoteControls
        loadingData={props.loadingData}
        callBack={props.callBack}
      />
    </div>
  );
}

export default RemoteLoginTab;

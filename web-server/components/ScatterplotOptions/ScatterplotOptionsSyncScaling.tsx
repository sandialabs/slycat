import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { toggleSyncScaling } from "plugins/slycat-parameter-image/js/actions";

const ScatterplotOptionsSyncScaling: React.FC = () => {
  const dispatch = useDispatch();
  const sync_scaling = useSelector((state: any) => state.sync_scaling);

  const handleChange = () => {
    dispatch(toggleSyncScaling());
  };

  return (
    <div className="slycat-sync-scaling form-check">
      <input
        className="form-check-input"
        type="checkbox"
        value=""
        id="syncScalingOption"
        checked={!!sync_scaling}
        onChange={handleChange}
      />
      <label className="form-check-label" htmlFor="syncScalingOption">
        Sync Scaling
      </label>
    </div>
  );
};

export default ScatterplotOptionsSyncScaling;

/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { useAppDispatch, useAppSelector } from "../wizard-store/hooks";
import { dataLocationType, selectDataLocation, setDataLocation } from "../wizard-store/reducers/cCAWizardSlice";

export const CCAWizardDataSelectionTab = (props: {hidden?: boolean}) => {
  const { hidden = false } = props;
  const dataLocation = useAppSelector(selectDataLocation)
  const dispatch = useAppDispatch();
  return (
    <div hidden={hidden}>
      <div className="form-check" style={{ marginLeft: "15px" }}>
        <label>
          <input
            type="radio"
            name="local-or-remote-radios"
            id="local-radio"
            value="local"
            onChange={React.useCallback(()=>{dispatch(setDataLocation(dataLocationType.LOCAL))},[dispatch])}
            checked={dataLocation && dataLocation === dataLocationType.LOCAL}
          />
          Local
        </label>
      </div>
      <div className="form-check" style={{ marginLeft: "15px" }}>
        <label>
          <input
            type="radio"
            name="local-or-remote-radios"
            id="remote-radio"
            value="remote"
            onChange={React.useCallback(()=>{dispatch(setDataLocation(dataLocationType.REMOTE))},[dispatch])}
            checked={dataLocation && dataLocation === dataLocationType.REMOTE}
          />
          Remote
        </label>
      </div>
    </div>
  );
};

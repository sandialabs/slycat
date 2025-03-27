/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { useAppDispatch } from "./wizard-store/hooks";
import { setTabName, TabNames } from "./wizard-store/reducers/tabTrackingSlice";

export const useCCAWizardFooter = () => {
  const dispatch = useAppDispatch();
  const backButton = (
    <button key="back button" className="btn btn-light mr-auto" onClick={() => console.log("back")}>
      Back
    </button>
  );
  const nextButton = (
    <button key="continue" className="btn btn-primary" onClick={() => {
      console.log("click")
      dispatch(setTabName(TabNames.CCSLocalBrowserTab))
    }}>
      Continue
    </button>
  );
  return React.useMemo(() => [backButton, nextButton], []);
};

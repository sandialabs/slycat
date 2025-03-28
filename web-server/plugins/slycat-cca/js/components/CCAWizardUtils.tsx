/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { useAppDispatch, useAppSelector } from "./wizard-store/hooks";
import {
  selectDataLocation,
  selectTab,
  setTabName,
  TabNames,
  uploadFile,
} from "./wizard-store/reducers/cCAWizardSlice";

export const useCCAWizardFooter = () => {
  const tabName = useAppSelector(selectTab);
  const dataLocation = useAppSelector(selectDataLocation);
  const dispatch = useAppDispatch();

  /**
   * handle continue operation
   */
  const handleContinue = React.useCallback(() => {
    if (tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB && dataLocation) {
      dispatch(setTabName(TabNames.CCA_LOCAL_BROWSER_TAB));
    }
    if (tabName === TabNames.CCA_LOCAL_BROWSER_TAB) {
      dispatch(uploadFile());
    }
  }, [dispatch, setTabName, tabName]);

  /**
   * handle back operation
   */
  const handleBack = React.useCallback(() => {
    dispatch(setTabName(TabNames.CCA_DATA_WIZARD_SELECTION_TAB));
  }, [dispatch, setTabName, tabName]);

  const backButton = (
    <button
      key="back button"
      disabled={tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB}
      className="btn btn-light mr-auto"
      onClick={handleBack}
    >
      Back
    </button>
  );

  const nextButton = (
    <button key="continue" className="btn btn-primary" onClick={handleContinue}>
      Continue
    </button>
  );
  return React.useMemo(() => [backButton, nextButton], [tabName, dataLocation, dispatch]);
};

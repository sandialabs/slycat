/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { useAppDispatch, useAppSelector } from "./wizard-store/hooks";
import {
  resetCCAWizard,
  selectDataLocation,
  selectTab,
  setMid,
  setPid,
  setTabName,
  TabNames,
  uploadFile,
} from "./wizard-store/reducers/cCAWizardSlice";
import client from "js/slycat-web-client";

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

/**
 * Function to handle setup for creating a cca model in the model wizard modal
 * @param pid project id
 * @param statePid redux project id
 * @param stateMid redux model id
 * @param marking initial marking for the model
 * @returns memoized () => void
 */
export const useHandleWizardSetup = (
  pid: string,
  statePid: string | undefined,
  stateMid: string | undefined,
  marking: string | undefined,
) => {
  const dispatch = useAppDispatch();
  return React.useCallback(() => {
    if (!statePid) {
      dispatch(setPid(pid));
    }
    if (!stateMid && statePid) {
      // create the model on open so we have something to reference later
      client
        .post_project_models_fetch({
          pid: statePid,
          type: "cca",
          name: "",
          description: "",
          marking: marking ?? "",
        })
        .then((result) => {
          dispatch(setMid(result.id));
        });
    }
  }, [pid, statePid, stateMid, marking]);
};

/**
 * Handle the cleanup for closing the cca wizard modal
 * @param setModalOpen function for setting local state for if the wizard is open
 * @param stateMid redux model id
 * @returns memoized () => void
 */
export const useHandleClosingCallback = (
  setModalOpen: (value: React.SetStateAction<boolean>) => void,
  stateMid: string | undefined,
) => {
  const dispatch = useAppDispatch();
  return React.useCallback(() => {
    setModalOpen(false);
    if (stateMid) {
      console.log("delete");
      client.delete_model_fetch({ mid: stateMid });
    }
    dispatch(resetCCAWizard());
  }, [stateMid, setModalOpen]);
};

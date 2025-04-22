/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { useAppDispatch, useAppSelector } from "./wizard-store/hooks";
import {
  resetCCAWizard,
  selectDataLocation,
  selectFileUploaded,
  selectMid,
  selectPid,
  selectTab,
  setFileUploaded,
  setMid,
  setPid,
  setTabName,
  TabNames,
} from "./wizard-store/reducers/cCAWizardSlice";
import client from "js/slycat-web-client";
import fileUploader from "js/slycat-file-uploader-factory";
import * as dialog from "js/slycat-dialog";

/**
 * A hook for controlling how the back and continue buttons work based on the current redux state
 * @returns the back button and continue button jsx
 */
export const useCCAWizardFooter = () => {
  const tabName = useAppSelector(selectTab);
  const dataLocation = useAppSelector(selectDataLocation);
  const fileUploaded = useAppSelector(selectFileUploaded);
  const dispatch = useAppDispatch();

  /**
   * handle continue operation
   */
  const handleContinue = React.useCallback(() => {
    if (tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB && dataLocation) {
      dispatch(setTabName(TabNames.CCA_LOCAL_BROWSER_TAB));
    }
    if (tabName === TabNames.CCA_LOCAL_BROWSER_TAB && fileUploaded) {
      dispatch(setTabName(TabNames.CCA_LOCAL_BROWSER_TAB));
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
    <button
      key="continue"
      className="btn btn-primary"
      onClick={handleContinue}
      disabled={tabName === TabNames.CCA_LOCAL_BROWSER_TAB && !fileUploaded}
    >
      Continue {fileUploaded.toString()}
    </button>
  );
  return React.useMemo(() => [backButton, nextButton], [fileUploaded, tabName, dataLocation, dispatch]);
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

/**
 * handle file submission
 */
export const useHandleLocalFileSubmit = (): [
  (file: File, parser: string | undefined, setUploadStatus: (status: boolean) => void) => void,
  number,
  string,
] => {
  const mid = useAppSelector(selectMid);
  const pid = useAppSelector(selectPid);
  const [progress, setProgress] = React.useState<number>(0);
  const [progressStatus, setProgressStatus] = React.useState("");
  const handleSubmit = React.useCallback(
    (file: File, parser: string | undefined, setUploadStatus: (status: boolean) => void) => {
      const progressCallback = (input?: number) => {
        if (!input) {
          return progress;
        }
        setProgress(input);
      };
      const progressStatusCallback = (input?: string) => {
        if (!input) {
          return progressStatus;
        }
        setProgressStatus(input);
      };
      const fileObject = {
        pid,
        mid,
        file: file,
        parser: parser,
        aids: [["data-table"], file?.name],
        // parser: component.parser(),
        progress: progressCallback,
        progress_status: progressStatusCallback,
        progress_final: 90,
        success: function () {
          console.log("uploaded");
          setProgress(100);
          setProgressStatus("File upload complete");
          setUploadStatus(true);
        },
        error: function () {
          setUploadStatus(false);
          dialog.ajax_error(
            "Did you choose the correct file and filetype?  There was a problem parsing the file: ",
          )();
          // TODO: toggle disabled for continue
          setProgress(0);
          setProgressStatus("");
        },
      };
      fileUploader.uploadFile(fileObject);
    },
    [mid, pid, progress, setProgress, setProgressStatus],
  );

  return [handleSubmit, progress, progressStatus];
};

/**
 * Returns a function that sets the callback "setParser" value to the selected parser
 */
export const handleParserChange = (
  setParser: React.Dispatch<React.SetStateAction<string | undefined>>,
) =>
  React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setParser(e?.target?.value ?? undefined);
    },
    [setParser],
  );

export const useSetUploadStatus = () => {
  const dispatch = useAppDispatch();
  return React.useCallback(
    (status: boolean) => {
      console.log("dispatching", status);
      dispatch(setFileUploaded(status));
    },
    [dispatch],
  );
};

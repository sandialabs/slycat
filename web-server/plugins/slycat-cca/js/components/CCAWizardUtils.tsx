/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { useAppDispatch, useAppSelector } from "./wizard-store/hooks";
import { produce } from "immer";
import server_root from "js/slycat-server-root";
import {
  Attribute,
  resetCCAWizard,
  selectAttributes,
  selectAuthInfo,
  selectDataLocation,
  selectDescription,
  selectFileUploaded,
  selectLoading,
  selectMarking,
  selectMid,
  selectName,
  selectParser,
  selectPid,
  selectProgress,
  selectProgressStatus,
  selectRemotePath,
  selectScaleInputs,
  selectTab,
  setAttributes,
  setAuthInfo,
  setFileUploaded,
  setLoading,
  setMid,
  setPid,
  setProgress,
  setProgressStatus,
  setTabName,
  TabNames,
} from "./wizard-store/reducers/cCAWizardSlice";
import client from "js/slycat-web-client";
import fileUploader from "js/slycat-file-uploader-factory";
import * as dialog from "js/slycat-dialog";
import { REMOTE_AUTH_LABELS } from "../../../../utils/ui-labels";

/**
 * A hook for controlling how the back and continue buttons work based on the current redux state
 * @returns the back button and continue button jsx
 */
export const useCCAWizardFooter = () => {
  const tabName = useAppSelector(selectTab);
  const dataLocation = useAppSelector(selectDataLocation);
  const fileUploaded = useAppSelector(selectFileUploaded);
  const loading = useAppSelector(selectLoading);
  const authInfo = useAppSelector(selectAuthInfo);
  const dispatch = useAppDispatch();
  const uploadSelection = useUploadSelection();
  const uploadHandleRemoteFileSubmit = useHandleRemoteFileSubmit();
  const handleAuthentication = useHandleAuthentication();
  const finishModel = useFinishModel();

  /**
   * handle continue operation
   */
  const handleContinue = React.useCallback(() => {
    if (tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB && dataLocation === "local") {
      dispatch(setTabName(TabNames.CCA_LOCAL_BROWSER_TAB));
    }
    if (tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB && dataLocation === "remote") {
      dispatch(setTabName(TabNames.CCA_AUTHENTICATION_TAB));
    }
    if (tabName === TabNames.CCA_AUTHENTICATION_TAB) {
      if (authInfo?.sessionExists) {
        dispatch(setTabName(TabNames.CCA_REMOTE_BROWSER_TAB));
      } else {
        handleAuthentication();
      }
    }
    if (tabName === TabNames.CCA_REMOTE_BROWSER_TAB) {
      uploadHandleRemoteFileSubmit();
    }
    if (tabName === TabNames.CCA_LOCAL_BROWSER_TAB && fileUploaded) {
      dispatch(setTabName(TabNames.CCA_TABLE_INGESTION));
    }
    if (tabName === TabNames.CCA_TABLE_INGESTION) {
      uploadSelection();
    }
    if (tabName === TabNames.CCA_FINISH_MODEL) {
      finishModel();
    }
  }, [
    dispatch,
    uploadSelection,
    handleAuthentication,
    uploadHandleRemoteFileSubmit,
    fileUploaded,
    setTabName,
    tabName,
    dataLocation,
  ]);

  /**
   * handle back operation
   */
  const handleBack = React.useCallback(() => {
    if (tabName === TabNames.CCA_LOCAL_BROWSER_TAB || tabName === TabNames.CCA_REMOTE_BROWSER_TAB) {
      dispatch(setTabName(TabNames.CCA_DATA_WIZARD_SELECTION_TAB));
    }
    if (tabName === TabNames.CCA_AUTHENTICATION_TAB) {
      dispatch(setTabName(TabNames.CCA_DATA_WIZARD_SELECTION_TAB));
    }
    if (tabName === TabNames.CCA_REMOTE_BROWSER_TAB) {
      dispatch(setTabName(TabNames.CCA_AUTHENTICATION_TAB));
    }
    if (tabName === TabNames.CCA_TABLE_INGESTION && dataLocation === "local") {
      dispatch(setTabName(TabNames.CCA_LOCAL_BROWSER_TAB));
    }
    if (tabName === TabNames.CCA_TABLE_INGESTION && dataLocation === "remote") {
      dispatch(setTabName(TabNames.CCA_REMOTE_BROWSER_TAB));
    }
    if (tabName === TabNames.CCA_FINISH_MODEL) {
      dispatch(setTabName(TabNames.CCA_TABLE_INGESTION));
    }
  }, [dispatch, setTabName, tabName]);

  const backButton = (
    <button
      key="back button"
      disabled={loading}
      style={{
        visibility: tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB ? "hidden" : "visible",
      }}
      className="btn btn-light me-auto"
      onClick={handleBack}
    >
      Back
    </button>
  );

  const nextButton = !loading ? (
    <button
      key="continue"
      className="btn btn-primary"
      onClick={handleContinue}
      disabled={(tabName === TabNames.CCA_LOCAL_BROWSER_TAB && !fileUploaded) || loading}
    >
      Continue
    </button>
  ) : (
    <button className="btn btn-primary" type="button" key="loading" disabled>
      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      Loading...
    </button>
  );
  return React.useMemo(
    () => [backButton, nextButton],
    [fileUploaded, loading, handleContinue, handleBack, tabName, dataLocation, dispatch],
  );
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
      client.delete_model_fetch({ mid: stateMid });
    }
    dispatch(resetCCAWizard());
  }, [stateMid, setModalOpen]);
};

/**
 * callback function for when a file is done uploading for gathering and setting all the file meta data
 * @returns a memoized function to call once uploading a file is done
 */
const useFileUploadSuccess = () => {
  const mid = useAppSelector(selectMid);
  const dispatch = useAppDispatch();
  return React.useCallback(
    (
      setProgress: (status: number) => void,
      setProgressStatus: (status: string) => void,
      setUploadStatus: (status: boolean) => void,
    ) => {
      setProgress(95);
      setProgressStatus("Finishing...");
      client.get_model_arrayset_metadata({
        mid: mid,
        aid: "data-table",
        arrays: "0",
        statistics: "0/...",
        success: function (metadata: any) {
          setProgress(100);
          setProgressStatus("Finished");
          const attributes: Attribute[] = (metadata?.arrays[0]?.attributes as [])?.map(
            (attribute: any, index) => {
              const constant = metadata.statistics[index].unique === 1;
              const string = attribute.type == "string";
              let tooltip = "";
              if (string) {
                tooltip =
                  "This variable's values contain strings, so it cannot be included in the analysis.";
              } else if (constant) {
                tooltip =
                  "This variable's values are all identical, so it cannot be included in the analysis.";
              }
              return {
                index: index,
                name: attribute.name,
                type: attribute.type,
                "Axis Type": constant || string ? "" : "Input",
                constant: constant,
                disabled: constant || string,
                hidden: false,
                selected: false,
                lastSelected: false,
                tooltip: tooltip,
              };
            },
          );
          dispatch(setAttributes(attributes ?? []));
          dispatch(setLoading(false));
          setUploadStatus(true);
          dispatch(setTabName(TabNames.CCA_TABLE_INGESTION));
        },
      });
    },
    [mid, dispatch],
  );
};

/**
 * Sets up a stable function for handling remote file uploads, including setting loading status, progress bar, and switching to the next tab.
 * @returns a stable function for handling remote file upload
 */
export const useHandleRemoteFileSubmit = () => {
  const mid = useAppSelector(selectMid);
  const pid = useAppSelector(selectPid);
  const fileDescriptor = useAppSelector(selectRemotePath);
  const parser = useAppSelector(selectParser);
  const { hostname } = useAppSelector(selectAuthInfo);
  const dispatch = useAppDispatch();
  const progress = useAppSelector(selectProgress);
  const progressStatus = useAppSelector(selectProgressStatus);
  const fileUploadSuccess = useFileUploadSuccess();
  return React.useCallback(() => {
    dispatch(setLoading(true));
    console.log(fileDescriptor);
    if (!fileDescriptor?.path) {
      dialog.ajax_error(`no file selected`)();
      dispatch(setLoading(false));
      return;
    }
    if (fileDescriptor.type !== "f") {
      dialog.ajax_error(
        `Did you choose the correct file and filetype?  selected file: ${fileDescriptor?.path} is not a file `,
      )();
      dispatch(setLoading(false));
      return;
    }
    client
      .get_remote_file_fetch({ hostname: hostname, path: fileDescriptor?.path })
      .then((response: any) => {
        return response.text();
      })
      .then((file) => {
        const progressCallback = (input?: number) => {
          if (!input) {
            return progress;
          }
          dispatch(setProgress(input));
        };
        const progressStatusCallback = (input?: string) => {
          if (!input) {
            return progressStatus;
          }
          dispatch(setProgressStatus(input));
        };
        const fileObject = {
          pid,
          mid,
          file,
          parser,
          hostname,
          paths: fileDescriptor.path,
          aids: [["data-table"], fileDescriptor.path.split("/").at(-1)],
          progress: progressCallback,
          progress_status: progressStatusCallback,
          progress_final: 90,
          success: function () {
            setProgress(100);
            setProgressStatus("File upload complete");
            dispatch(setLoading(false));
            dispatch(setTabName(TabNames.CCA_TABLE_INGESTION));
            // setUploadStatus(true);
            fileUploadSuccess(setProgress, setProgressStatus, (status) => console.log(status));
          },
          error: function () {
            // setUploadStatus(false);
            dispatch(setLoading(false));
            dialog.ajax_error(
              "Did you choose the correct file and filetype?  There was a problem parsing the file: ",
            )();
            dispatch(setProgress(0));
            dispatch(setProgressStatus(""));
          },
        };
        fileUploader.uploadFile(fileObject);
      });
  }, [mid, pid, hostname, fileDescriptor, fileUploadSuccess, parser, dispatch]);
};

/**
 * handle local file submission
 */
export const useHandleLocalFileSubmit = (): [
  (file: File, parser: string | undefined, setUploadStatus: (status: boolean) => void) => void,
  number,
  string | undefined,
] => {
  const mid = useAppSelector(selectMid);
  const pid = useAppSelector(selectPid);
  const progress = useAppSelector(selectProgress);
  const progressStatus = useAppSelector(selectProgressStatus);
  const dispatch = useAppDispatch();
  const fileUploadSuccess = useFileUploadSuccess();
  const handleSubmit = React.useCallback(
    (file: File, parser: string | undefined, setUploadStatus: (status: boolean) => void) => {
      const progressCallback = (input?: number) => {
        if (!input) {
          return progress;
        }
        dispatch(setProgress(input));
      };
      const progressStatusCallback = (input?: string) => {
        if (!input) {
          return progressStatus;
        }
        dispatch(setProgressStatus(input));
      };
      dispatch(setLoading(true));
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
          dispatch(setProgress(100));
          dispatch(setProgressStatus("File upload complete"));
          setUploadStatus(true);
          fileUploadSuccess(setProgress, setProgressStatus, setUploadStatus);
        },
        error: function () {
          setUploadStatus(false);
          dispatch(setLoading(false));
          dialog.ajax_error(
            "Did you choose the correct file and filetype?  There was a problem parsing the file: ",
          )();
          dispatch(setProgress(0));
          dispatch(setProgressStatus(""));
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
  setParser: (parser: string) => void | React.Dispatch<React.SetStateAction<string | undefined>>,
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
      dispatch(setFileUploaded(status));
    },
    [dispatch],
  );
};

/**
 * A function to handle effects of selection on the radio buttons in the ingestion tab for CCA
 * @param attributes from redux
 * @returns memoized onChange function to handle radio button selection
 */
export const useHandleTableIngestionOnChange = (attributes: Attribute[]) => {
  const dispatch = useAppDispatch();
  return React.useCallback(
    (input: any) => {
      // this function is overloaded to handle batching so we need to check for target or batchTarget
      if (input?.target && (input as any)?.target?.name && (input as any)?.target?.value) {
        const nextAttributes = produce(attributes, (draftState) => {
          draftState[input?.target?.name] = {
            ...draftState[input?.target?.name],
            "Axis Type": input?.target?.value,
          };
        });
        dispatch(setAttributes(nextAttributes));
      } else if (input?.batchTarget && input?.batchTarget?.length > 0) {
        const nextAttributes = produce(attributes, (draftState) => {
          input?.batchTarget.forEach((row: any) => {
            draftState[row?.name] = {
              ...draftState[row?.name],
              "Axis Type": row?.value,
            };
          });
        });
        dispatch(setAttributes(nextAttributes));
      }
    },
    [attributes, dispatch],
  );
};

/**
 * Hook for dealing with submission to the server of the final model values such as name and description
 * @returns a function for finalizing the cca model
 */
export const useFinishModel = () => {
  const mid = useAppSelector(selectMid);
  const description = useAppSelector(selectDescription);
  const name = useAppSelector(selectName);
  const marking = useAppSelector(selectMarking);
  return React.useCallback(() => {
    // update the final model meta data and trigger the post model finish script
    client.put_model({
      mid: mid,
      name: name,
      description: description,
      marking: marking,
      success: () => {
        client.post_model_finish({
          mid: mid,
          success: () => {
            location.href = server_root + "models/" + mid;
          },
        });
      },
      // throw up a dialog if we get into an error state
      error: dialog.ajax_error("Error updating model."),
    });
  }, [mid, name, description, marking, server_root]);
};

export const useHandleAuthentication = () => {
  const authInfo = useAppSelector(selectAuthInfo);
  const dispatch = useAppDispatch();
  return React.useCallback(async () => {
    dispatch(setLoading(true));
    if (!authInfo.password) {
      dispatch(setLoading(false));
      alert(`password is empty`);
      return;
    }
    client
      .post_remotes_fetch({
        parameters: {
          hostname: authInfo.hostname,
          username: authInfo.username,
          password: atob(authInfo.password),
        },
      })
      .then(async () => {
        return await client.get_remotes_fetch(authInfo.hostname).then((json: any) => {
          if (json.status === false) {
            alert(`connection could not be established`);
          } else {
            console.log("dispatching", { ...authInfo, sessionExists: true });
            dispatch(setAuthInfo({ ...authInfo, sessionExists: true }));
          }
          dispatch(setLoading(false));
          dispatch(setTabName(TabNames.CCA_REMOTE_BROWSER_TAB));
        });
      })
      .catch((errorResponse: any) => {
        dispatch(setLoading(false));
        if (errorResponse.status == 403) {
          alert(`${errorResponse.statusText} \n\n-${REMOTE_AUTH_LABELS.authErrorForbiddenDescription}
        \n-${REMOTE_AUTH_LABELS.authErrorForbiddenNote}`);
        } else if (errorResponse.status == 401) {
          alert(
            `${errorResponse.statusText} \n\n-${REMOTE_AUTH_LABELS.authErrorUnauthorizedDescription}`,
          );
        } else {
          alert(`${errorResponse.statusText}`);
        }
      });
  }, [authInfo]);
};

/**
 * Hook for dealing with submission to the server of the inputs, outputs, and scale inputs to the server.
 * @returns a function for updating inputs and outputs
 */
export const useUploadSelection = () => {
  const mid = useAppSelector(selectMid);
  const scaleInputs = useAppSelector(selectScaleInputs);
  const attributes = useAppSelector(selectAttributes);
  const dispatch = useAppDispatch();
  return React.useCallback(() => {
    const inputs = attributes
      .filter((attribute) => attribute["Axis Type"] === "Input")
      .map((attribute) => attribute.index);
    const outputs = attributes
      .filter((attribute) => attribute["Axis Type"] === "Output")
      .map((attribute) => attribute.index);
    if (inputs.length === 0) {
      dialog.dialog({
        message: "The number of inputs must be at least one.",
      });
    } else if (outputs.length === 0) {
      dialog.dialog({
        message: "The number of outputs must be at least one.",
      });
    } else {
      client.put_model_parameter({
        mid: mid,
        aid: "input-columns",
        value: inputs,
        input: true,
        success: function () {
          client.put_model_parameter({
            mid: mid,
            aid: "output-columns",
            value: outputs,
            input: true,
            success: function () {
              client.put_model_parameter({
                mid: mid,
                aid: "scale-inputs",
                value: scaleInputs,
                input: true,
                success: function () {
                  // set the tab
                  dispatch(setTabName(TabNames.CCA_FINISH_MODEL));
                },
              });
            },
          });
        },
      });
    }
  }, [mid, attributes, scaleInputs, dispatch]);
};

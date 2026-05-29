/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC .
Under the terms of Contract DE-NA0003525 with National Technology and Engineering Solutions
of Sandia, LLC, the U.S. Government retains certain rights in this software. */

import * as React from "react";
import { produce } from "immer";

import server_root from "js/slycat-server-root";
import client from "js/slycat-web-client";
import fileUploader from "js/slycat-file-uploader-factory";
import * as dialog from "js/slycat-dialog";

import { useAppDispatch, useAppSelector } from "./wizard-store/hooks";
import {
  Attribute,
  dataLocationType,
  resetCCAWizard,
  selectAttributes,
  selectAuthInfo,
  selectDataLocation,
  selectDescription,
  selectFileName,
  selectHdf5InputTable,
  selectHdf5OutputTable,
  selectLoading,
  selectLocalFileSelected,
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
  setErrorMessages,
  setFileName,
  setFileUploaded,
  setLoading,
  setLocalFileSelected,
  setMid,
  setParser,
  setPid,
  setProgress,
  setProgressStatus,
  setTabName,
  TabNames,
} from "./wizard-store/reducers/CCAWizardSlice";
import { REMOTE_AUTH_LABELS } from "utils/ui-labels";

/**
 * Shared error text for failed parser/upload operations.
 */
const FILE_PARSE_ERROR_MESSAGE =
  "Did you choose the correct file and filetype?  There was a problem parsing the file: ";

/**
 * Infer the parser from a filename extension.
 * Falls back to the provided parser if the extension is not recognized.
 */
const getParserFromFileName = (fileName: string, fallbackParser?: string): string | undefined => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "csv":
      return "slycat-csv-parser";
    case "dat":
      return "slycat-dakota-parser";
    case "h5":
    case "hdf5":
      return "slycat-hdf5-parser";
    default:
      return fallbackParser;
  }
};

/**
 * Extract the final path segment from a filesystem path.
 */
const getBaseNameFromPath = (path: string) => {
  const segments = path.split("/");
  return segments[segments.length - 1];
};

/**
 * Format server-side model error messages into a single display string.
 */
const formatModelErrors = (errors: string[]) => {
  let errorMessages = "";

  if (errors.length >= 1) {
    if (!errors[0].includes("Oops")) {
      errorMessages = "The errors listed below must be fixed before you can upload a model.\n\n";
    }

    for (let i = 0; i < errors.length; i += 1) {
      errorMessages += `Error:\n${errors[i]}\n`;
    }
  }

  return errorMessages;
};

/**
 * Build upload progress callback wrappers around redux state.
 * If called with no argument, returns the current value.
 * If called with a value, writes the new value to redux.
 */
const useUploadProgressCallbacks = () => {
  const dispatch = useAppDispatch();
  const progress = useAppSelector(selectProgress);
  const progressStatus = useAppSelector(selectProgressStatus);

  const progressCallback = React.useCallback(
    (input?: number) => {
      if (input === undefined) {
        return progress;
      }

      dispatch(setProgress(input));
      return input;
    },
    [dispatch, progress],
  );

  const progressStatusCallback = React.useCallback(
    (input?: string) => {
      if (input === undefined) {
        return progressStatus;
      }

      dispatch(setProgressStatus(input));
      return input;
    },
    [dispatch, progressStatus],
  );

  return { progressCallback, progressStatusCallback, progress, progressStatus };
};

/**
 * Higher order function for handling the continue logic.
 * @returns continue logic function
 */
export const useCCAHandleContinue = () => {
  const tabName = useAppSelector(selectTab);
  const dataLocation = useAppSelector(selectDataLocation);
  const authInfo = useAppSelector(selectAuthInfo);
  const parser = useAppSelector(selectParser);
  const localFileSelected = useAppSelector(selectLocalFileSelected);
  const hdf5InputTable = useAppSelector(selectHdf5InputTable);
  const hdf5OutputTable = useAppSelector(selectHdf5OutputTable);

  const dispatch = useAppDispatch();

  const uploadSelection = useUploadSelection();
  const uploadHandleRemoteFileSubmit = useHandleRemoteFileSubmit();
  const handleAuthentication = useHandleAuthentication();
  const finishModel = useFinishModel();
  const [handleLocalFileSubmit] = useHandleLocalFileSubmit();
  const setUploadStatus = useSetUploadStatus();
  const uploadTableFile = useUploadTableFile();
  const connectSMB = useConnectSMB();

  /**
   * Advance the wizard based on the current tab and state.
   */
  const handleContinue = React.useCallback(() => {
    if (tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB) {
      if (dataLocation === dataLocationType.LOCAL) {
        dispatch(setTabName(TabNames.CCA_LOCAL_BROWSER_TAB));
      } else if (dataLocation === dataLocationType.REMOTE) {
        dispatch(setTabName(TabNames.CCA_AUTHENTICATION_TAB));
      } else if (dataLocation === dataLocationType.SMB) {
        dispatch(setTabName(TabNames.CCA_SMB_AUTHENTICATION_TAB));
      }
      return;
    }

    if (tabName === TabNames.CCA_SMB_AUTHENTICATION_TAB && dataLocation === dataLocationType.SMB) {
      if (!authInfo.sessionExists) {
        connectSMB(() => dispatch(setTabName(TabNames.CCA_SMB_TAB)));
      } else {
        dispatch(setTabName(TabNames.CCA_SMB_TAB));
      }
      return;
    }

    if (tabName === TabNames.CCA_SMB_TAB) {
      uploadHandleRemoteFileSubmit();
      return;
    }

    if (tabName === TabNames.CCA_AUTHENTICATION_TAB) {
      if (authInfo?.sessionExists) {
        dispatch(setTabName(TabNames.CCA_REMOTE_BROWSER_TAB));
      } else {
        handleAuthentication();
      }
      return;
    }

    if (tabName === TabNames.CCA_REMOTE_BROWSER_TAB) {
      uploadHandleRemoteFileSubmit();
      return;
    }

    if (tabName === TabNames.CCA_LOCAL_BROWSER_TAB && localFileSelected) {
      const fileSelector = document.getElementById(
        "slycat-local-browser-file",
      ) as HTMLInputElement | null;

      const file = fileSelector?.files?.[0];

      if (file) {
        handleLocalFileSubmit(file, parser, setUploadStatus);
      }

      return;
    }

    if (tabName === TabNames.CCA_HDF5_INPUT_SELECTION_TAB && hdf5InputTable) {
      uploadTableFile(hdf5InputTable);
      return;
    }

    if (tabName === TabNames.CCA_HDF5_OUTPUT_SELECTION_TAB && hdf5OutputTable) {
      uploadTableFile(hdf5OutputTable);
      return;
    }

    if (tabName === TabNames.CCA_TABLE_INGESTION) {
      uploadSelection();
      return;
    }

    if (tabName === TabNames.CCA_FINISH_MODEL) {
      finishModel();
    }
  }, [
    tabName,
    dataLocation,
    authInfo?.sessionExists,
    localFileSelected,
    hdf5InputTable,
    hdf5OutputTable,
    dispatch,
    connectSMB,
    handleAuthentication,
    uploadHandleRemoteFileSubmit,
    handleLocalFileSubmit,
    parser,
    setUploadStatus,
    uploadTableFile,
    uploadSelection,
    finishModel,
  ]);

  return handleContinue;
};

/**
 * Build logic for the back button.
 * @returns handler for back button logic
 */
export const useCCAHandleBack = () => {
  const tabName = useAppSelector(selectTab);
  const dataLocation = useAppSelector(selectDataLocation);
  const parser = useAppSelector(selectParser);
  const dispatch = useAppDispatch();

  /**
   * Move the wizard backward based on the current tab and state.
   */
  const handleBack = React.useCallback(() => {
    if (tabName === TabNames.CCA_LOCAL_BROWSER_TAB) {
      dispatch(setTabName(TabNames.CCA_DATA_WIZARD_SELECTION_TAB));
      return;
    }

    if (tabName === TabNames.CCA_AUTHENTICATION_TAB) {
      dispatch(setTabName(TabNames.CCA_DATA_WIZARD_SELECTION_TAB));
      return;
    }

    if (tabName === TabNames.CCA_REMOTE_BROWSER_TAB) {
      dispatch(setTabName(TabNames.CCA_AUTHENTICATION_TAB));
      return;
    }

    if (tabName === TabNames.CCA_SMB_AUTHENTICATION_TAB && dataLocation === dataLocationType.SMB) {
      dispatch(setTabName(TabNames.CCA_DATA_WIZARD_SELECTION_TAB));
      return;
    }

    if (tabName === TabNames.CCA_SMB_TAB && dataLocation === dataLocationType.SMB) {
      dispatch(setTabName(TabNames.CCA_SMB_AUTHENTICATION_TAB));
      return;
    }

    if (tabName === TabNames.CCA_HDF5_INPUT_SELECTION_TAB) {
      if (dataLocation === dataLocationType.LOCAL) {
        dispatch(setTabName(TabNames.CCA_LOCAL_BROWSER_TAB));
      } else if (dataLocation === dataLocationType.REMOTE) {
        dispatch(setTabName(TabNames.CCA_REMOTE_BROWSER_TAB));
      }
      return;
    }

    if (tabName === TabNames.CCA_HDF5_OUTPUT_SELECTION_TAB) {
      dispatch(setTabName(TabNames.CCA_HDF5_INPUT_SELECTION_TAB));
      return;
    }

    if (tabName === TabNames.CCA_TABLE_INGESTION) {
      if (dataLocation === dataLocationType.LOCAL) {
        dispatch(setTabName(TabNames.CCA_LOCAL_BROWSER_TAB));
      } else if (dataLocation === dataLocationType.REMOTE) {
        dispatch(setTabName(TabNames.CCA_REMOTE_BROWSER_TAB));
      } else if (dataLocation === dataLocationType.SMB) {
        dispatch(setTabName(TabNames.CCA_SMB_TAB));
      }
      return;
    }

    if (tabName === TabNames.CCA_FINISH_MODEL) {
      if (parser !== "slycat-hdf5-parser") {
        dispatch(setTabName(TabNames.CCA_TABLE_INGESTION));
      } else {
        dispatch(setTabName(TabNames.CCA_HDF5_OUTPUT_SELECTION_TAB));
      }
    }
  }, [tabName, dataLocation, parser, dispatch]);

  return handleBack;
};

/**
 * A hook for controlling how the back and continue buttons work based on the current redux state.
 * @returns the back button and continue button jsx
 */
export const useCCAWizardFooter = () => {
  const tabName = useAppSelector(selectTab);
  const loading = useAppSelector(selectLoading);
  const localFileSelected = useAppSelector(selectLocalFileSelected);

  const handleContinue = useCCAHandleContinue();
  const handleBack = useCCAHandleBack();

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
      disabled={loading || (!localFileSelected && tabName === TabNames.CCA_LOCAL_BROWSER_TAB)}
    >
      Continue
    </button>
  ) : (
    <button className="btn btn-primary" type="button" key="loading" disabled>
      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      Loading...
    </button>
  );

  return [backButton, nextButton];
};

/**
 * Function to handle setup for creating a cca model in the model wizard modal.
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
      // Create the model immediately so later steps have a model id to reference.
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
  }, [statePid, stateMid, dispatch, pid, marking]);
};

/**
 * Upload a selected HDF5 table and advance the wizard accordingly.
 */
export const useUploadTableFile = () => {
  const dispatch = useAppDispatch();
  const currentTab = useAppSelector(selectTab);
  const pid = useAppSelector(selectPid);
  const mid = useAppSelector(selectMid);
  const fileName = useAppSelector(selectFileName);
  const scaleInputs = useAppSelector(selectScaleInputs);

  return React.useCallback(
    (fullPath: string) => {
      const onInvalidTable = () => {
        dialog.ajax_error("There was an error, did you choose a valid HDF5 table? ")();
      };

      if (currentTab === TabNames.CCA_HDF5_INPUT_SELECTION_TAB) {
        client.post_hdf5_table({
          path: fullPath,
          pid,
          mid,
          aids: [["data-table"], fileName],
          success: () => {
            dispatch(setTabName(TabNames.CCA_HDF5_OUTPUT_SELECTION_TAB));
          },
          error: onInvalidTable,
        });
        return;
      }

      if (currentTab === TabNames.CCA_HDF5_OUTPUT_SELECTION_TAB) {
        client.post_hdf5_table({
          path: fullPath,
          pid,
          mid,
          aids: [["data-table"], fileName],
          success: () => {
            client.post_combine_hdf5_tables({
              mid,
              success: () => {
                client.put_model_parameter({
                  mid,
                  aid: "scale-inputs",
                  value: scaleInputs,
                  input: true,
                  success: () => {
                    dispatch(setTabName(TabNames.CCA_FINISH_MODEL));
                  },
                });
              },
            });
          },
          error: onInvalidTable,
        });
      }
    },
    [currentTab, dispatch, mid, pid, fileName, scaleInputs],
  );
};

// TODO: Needs to be implemented when connection is lost to the host
export const onReauth = () => {
  // console.log("TODO: Implement onReauth");
};

/**
 * Handle the cleanup for closing the cca wizard modal.
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
  }, [setModalOpen, stateMid, dispatch]);
};

/**
 * Callback function for when a file is done uploading for gathering and setting all the file metadata.
 * @returns a memoized function to call once uploading a file is done
 */
const useFileUploadSuccess = () => {
  const mid = useAppSelector(selectMid);
  const dispatch = useAppDispatch();

  return React.useCallback(
    (
      autoParser: string | undefined,
      setProgressValue: (status: number) => void,
      setProgressStatusValue: (status: string) => void,
      setUploadStatus: (status: boolean) => void,
    ) => {
      setProgressValue(95);
      setProgressStatusValue("Finishing...");

      if (autoParser === "slycat-hdf5-parser") {
        dispatch(setLoading(false));
        setUploadStatus(true);
        dispatch(setTabName(TabNames.CCA_HDF5_INPUT_SELECTION_TAB));
        return;
      }

      client.get_model_arrayset_metadata({
        mid,
        aid: "data-table",
        arrays: "0",
        statistics: "0/...",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        success: (metadata: any) => {
          setProgressValue(100);
          setProgressStatusValue("Finished");

          const attributes: Attribute[] = (metadata?.arrays[0]?.attributes as [])?.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (attribute: any, index) => {
              const constant = metadata.statistics[index].unique === 1;
              const isString = attribute.type === "string";

              let tooltip = "";
              if (isString) {
                tooltip =
                  "This variable's values contain strings, so it cannot be included in the analysis.";
              } else if (constant) {
                tooltip =
                  "This variable's values are all identical, so it cannot be included in the analysis.";
              }

              return {
                index,
                name: attribute.name,
                type: attribute.type,
                "Axis Type": constant || isString ? "" : "Input",
                constant,
                disabled: constant || isString,
                hidden: isString,
                selected: false,
                lastSelected: false,
                tooltip,
              };
            },
          );

          dispatch(setErrorMessages(undefined));
          dispatch(setAttributes(attributes ?? []));
          dispatch(setLoading(false));
          setUploadStatus(true);
          dispatch(setTabName(TabNames.CCA_TABLE_INGESTION));
        },
        error: () => {
          client
            .get_model_parameter_fetch({
              mid,
              aid: "error-messages",
            })
            .then((errors) => {
              setProgressStatusValue("Error Processing File");
              dispatch(setLoading(false));
              dispatch(setErrorMessages(formatModelErrors(errors)));
            });
        },
      });
    },
    [mid, dispatch],
  );
};

/**
 * Sets up a stable function for handling remote file uploads, including setting loading status,
 * progress bar, and switching to the next tab.
 * @returns a stable function for handling remote file upload
 */
export const useHandleRemoteFileSubmit = () => {
  const mid = useAppSelector(selectMid);
  const pid = useAppSelector(selectPid);
  const fileDescriptor = useAppSelector(selectRemotePath);
  const selectedParser = useAppSelector(selectParser);
  const { hostname } = useAppSelector(selectAuthInfo);

  const dispatch = useAppDispatch();

  const fileUploadSuccess = useFileUploadSuccess();
  const setUploadStatus = useSetUploadStatus();
  const { progressCallback, progressStatusCallback } = useUploadProgressCallbacks();

  return React.useCallback(() => {
    dispatch(setLoading(true));

    if (!fileDescriptor?.path) {
      dialog.ajax_error("no file selected")();
      dispatch(setLoading(false));
      return;
    }

    if (fileDescriptor.type !== "f") {
      dialog.ajax_error(
        `Did you choose the correct file and filetype?  selected file: ${fileDescriptor.path} is not a file `,
      )();
      dispatch(setLoading(false));
      return;
    }

    client
      .get_remote_file_fetch({ hostname, path: fileDescriptor.path })
      .then((response: any) => response.text())
      .then((file) => {
        const fileName = getBaseNameFromPath(fileDescriptor.path);
        const parser = getParserFromFileName(fileName, selectedParser);

        if (parser && parser !== selectedParser) {
          dispatch(setParser(parser));
        }

        fileUploader.uploadFile({
          pid,
          mid,
          file,
          parser,
          hostname,
          paths: fileDescriptor.path,
          aids: [["data-table"], fileName],
          progress: progressCallback,
          progress_status: progressStatusCallback,
          progress_final: 90,
          success: () => {
            dispatch(setProgress(100));
            dispatch(setProgressStatus("File upload complete"));
            dispatch(setLoading(false));
            dispatch(setTabName(TabNames.CCA_TABLE_INGESTION));
            setUploadStatus(true);

            fileUploadSuccess(
              parser,
              (value) => dispatch(setProgress(value)),
              (value) => dispatch(setProgressStatus(value)),
              () => {
                // Preserve prior behavior: remote upload passed a no-op callback here.
              },
            );
          },
          error: () => {
            setUploadStatus(false);
            dispatch(setLoading(false));
            dialog.ajax_error(FILE_PARSE_ERROR_MESSAGE)();
            dispatch(setProgress(0));
            dispatch(setProgressStatus(""));
          },
        });
      });
  }, [
    dispatch,
    fileDescriptor,
    hostname,
    pid,
    mid,
    selectedParser,
    setUploadStatus,
    fileUploadSuccess,
    progressCallback,
    progressStatusCallback,
  ]);
};

/**
 * Handle local file submission.
 */
export const useHandleLocalFileSubmit = (): [
  (file: File, parser: string | undefined, setUploadStatus: (status: boolean) => void) => void,
  number,
  string | undefined,
] => {
  const mid = useAppSelector(selectMid);
  const pid = useAppSelector(selectPid);
  const dispatch = useAppDispatch();

  const fileUploadSuccess = useFileUploadSuccess();
  const { progressCallback, progressStatusCallback, progress, progressStatus } =
    useUploadProgressCallbacks();

  const handleLocalFileSubmit = React.useCallback(
    (file: File, parser: string | undefined, setUploadStatus: (status: boolean) => void) => {
      const autoParser = getParserFromFileName(file.name, parser);

      if (autoParser && autoParser !== parser) {
        dispatch(setParser(autoParser));
      }

      dispatch(setFileName(file.name));
      dispatch(setLoading(true));

      fileUploader.uploadFile({
        pid,
        mid,
        file,
        parser: autoParser,
        aids: [["data-table"], file.name],
        progress: progressCallback,
        progress_status: progressStatusCallback,
        progress_final: 90,
        success: () => {
          client
            .get_model_parameter_fetch({
              mid,
              aid: "error-messages",
            })
            .then((errors) => {
              const errorMessages = formatModelErrors(errors);

              dispatch(setLoading(false));

              if (errors.length >= 1) {
                dispatch(setProgressStatus("Error Processing File"));
                dispatch(setProgress(0));
                dispatch(setProgressStatus("Failed"));
                setUploadStatus(true);
                dispatch(setErrorMessages(errorMessages));
                dispatch(setLocalFileSelected(false));
                const fileSelector = document.getElementById(
                  "slycat-local-browser-file",
                ) as HTMLInputElement | null;
                if (fileSelector) {
                  fileSelector.value = "";
                }
                return;
              }

              dispatch(setProgress(100));
              dispatch(setProgressStatus("File upload complete"));
              setUploadStatus(true);

              fileUploadSuccess(
                autoParser,
                (value) => dispatch(setProgress(value)),
                (value) => dispatch(setProgressStatus(value)),
                setUploadStatus,
              );
            });
        },
        error: () => {
          setUploadStatus(false);
          dispatch(setLoading(false));
          dialog.ajax_error(FILE_PARSE_ERROR_MESSAGE)();
          dispatch(setProgress(0));
          dispatch(setProgressStatus(""));
          const fileSelector = document.getElementById(
            "slycat-local-browser-file",
          ) as HTMLInputElement | null;
          if (fileSelector) {
            fileSelector.value = "";
          }
        },
      });
    },
    [dispatch, fileUploadSuccess, mid, pid, progressCallback, progressStatusCallback],
  );

  return [handleLocalFileSubmit, progress, progressStatus];
};

/**
 * Returns a function that sets the callback "setParser" value to the selected parser.
 */
export const useHandleParserChange = (
  setParserCallback:
    | ((parser: string) => void)
    | React.Dispatch<React.SetStateAction<string | undefined>>,
) =>
  React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setParserCallback(e?.target?.value ?? undefined);
    },
    [setParserCallback],
  );

/**
 * Stable setter for upload status in redux.
 */
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
 * A function to handle effects of selection on the radio buttons in the ingestion tab for CCA.
 * @param attributes from redux
 * @returns memoized onChange function to handle radio button selection
 */
export const useHandleTableIngestionOnChange = (attributes: Attribute[]) => {
  const dispatch = useAppDispatch();

  return React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (input: any) => {
      // This handler supports both single updates and batched updates.
      if (input?.currentTarget?.name && input?.currentTarget?.value) {
        const nextAttributes = produce(attributes, (draftState) => {
          draftState[input.currentTarget.name] = {
            ...draftState[input.currentTarget.name],
            "Axis Type": input.currentTarget.value,
          };
        });

        dispatch(setAttributes(nextAttributes));
        return;
      }

      if (input?.batchTarget?.length > 0) {
        const nextAttributes = produce(attributes, (draftState) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          input.batchTarget.forEach((row: any) => {
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
 * Hook for dealing with submission to the server of the final model values such as name and description.
 * @returns a function for finalizing the cca model
 */
export const useFinishModel = () => {
  const mid = useAppSelector(selectMid);
  const description = useAppSelector(selectDescription);
  const name = useAppSelector(selectName);
  const marking = useAppSelector(selectMarking);

  return React.useCallback(() => {
    // Update the final model metadata and trigger model completion.
    client.put_model({
      mid,
      name,
      description,
      marking,
      success: () => {
        client.post_model_finish({
          mid,
          success: () => {
            location.href = `${server_root}models/${mid}`;
          },
        });
      },
      error: dialog.ajax_error("Error updating model."),
    });
  }, [mid, name, description, marking]);
};

/**
 * Creates a function that uses authentication state to authenticate to a remote server.
 * @returns callback function
 */
export const useHandleAuthentication = () => {
  const authInfo = useAppSelector(selectAuthInfo);
  const dispatch = useAppDispatch();

  return React.useCallback(async () => {
    dispatch(setLoading(true));

    if (!authInfo.password) {
      dispatch(setLoading(false));
      alert("password is empty");
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
        return client.get_remotes_fetch(authInfo.hostname).then((json: any) => {
          if (json.status === false) {
            alert("connection could not be established");
          } else {
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
  }, [authInfo, dispatch]);
};

/**
 * Hook for dealing with submission to the server of the inputs, outputs, and scale inputs.
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
      return;
    }

    if (outputs.length === 0) {
      dialog.dialog({
        message: "The number of outputs must be at least one.",
      });
      return;
    }

    client.put_model_parameter({
      mid,
      aid: "input-columns",
      value: inputs,
      input: true,
      success: () => {
        client.put_model_parameter({
          mid,
          aid: "output-columns",
          value: outputs,
          input: true,
          success: () => {
            client.put_model_parameter({
              mid,
              aid: "scale-inputs",
              value: scaleInputs,
              input: true,
              success: () => {
                dispatch(setTabName(TabNames.CCA_FINISH_MODEL));
              },
            });
          },
        });
      },
    });
  }, [mid, attributes, scaleInputs, dispatch]);
};

/**
 * Builds and returns a stable function that will connect and authenticate to an SMB server.
 * @returns callback for connecting to smb server
 */
export const useConnectSMB = () => {
  const authValues = useAppSelector(selectAuthInfo);
  const dispatch = useAppDispatch();

  return React.useCallback(
    (callBackSuccess?: () => void) => {
      dispatch(setLoading(true));

      client
        .post_remotes_smb_fetch({
          user_name: authValues.username?.trim(),
          password: authValues.password,
          server: authValues.hostname?.trim(),
          share: authValues.share?.trim(),
        })
        .then(async (response: Response) => {
          dispatch(setLoading(false));

          const data = await response.json();

          if (response.ok && data.status) {
            if (callBackSuccess) {
              callBackSuccess();
            }
          } else {
            alert(`could not connect ${response.statusText} , ${data.msg}`);
          }
        })
        .catch((errorResponse) => {
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
    },
    [authValues.hostname, authValues.password, authValues.share, authValues.username, dispatch],
  );
};

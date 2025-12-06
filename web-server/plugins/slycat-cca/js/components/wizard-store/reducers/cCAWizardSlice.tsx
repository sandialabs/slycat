/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

export enum TabNames {
  CCA_DATA_WIZARD_SELECTION_TAB = "CCADataWizardSelectionTab",
  CCA_LOCAL_BROWSER_TAB = "CCALocalBrowserTab",
  CCA_SMB_TAB = "CCASmbTab",
  CCA_SMB_AUTHENTICATION_TAB = "CCASmbAuthenticationTab",
  CCA_HDF5_INPUT_SELECTION_TAB = "CCAHDF5InputSelectionTab",
  CCA_HDF5_OUTPUT_SELECTION_TAB = "CCAHDF5OutputSelectionTab",
  CCA_AUTHENTICATION_TAB = "CCAAuthenticationTab",
  CCA_REMOTE_BROWSER_TAB = "CCARemoteBrowserTab",
  CCA_TABLE_INGESTION = "CCATableIngestion",
  CCA_FINISH_MODEL = "CCAFinishModel",
}
export enum dataLocationType {
  LOCAL = "local",
  REMOTE = "remote",
  SMB = "smb",
}
export interface FileDescriptor {
  type: string;
  path: string;
}
export interface AuthenticationInformation {
  username: string | undefined;
  password: string | undefined;
  hostname: string | undefined;
  share?: string | undefined;
  domain?: string | undefined;
  sessionExists: boolean;
}
export interface Attribute {
  index: number;
  "Axis Type": string;
  name: string;
  type: string;
  constant: boolean;
  disabled: boolean;
  hidden: boolean;
  selected: boolean;
  lastSelected: boolean;
  tooltip: string;
}

export interface CCAWizardState {
  tab: TabNames;
  dataLocation: dataLocationType;
  mid: string | undefined;
  pid: string | undefined;
  fileUploaded: boolean;
  localFileSelected: boolean;
  attributes: Attribute[];
  scaleInputs: boolean;
  marking: string | undefined;
  description: string | undefined;
  name: string | undefined;
  loading: boolean;
  authInfo: AuthenticationInformation;
  remotePath: FileDescriptor | undefined;
  progress: number;
  progressStatus: string | undefined;
  parser: string | undefined;
  hdf5InputTable: string | undefined;
  hdf5OutputTable: string | undefined;
  fileName: string | undefined;
}
const initialState: CCAWizardState = {
  tab: TabNames.CCA_DATA_WIZARD_SELECTION_TAB,
  dataLocation: dataLocationType.LOCAL,
  mid: undefined,
  pid: undefined,
  fileUploaded: false,
  localFileSelected: false,
  attributes: [],
  scaleInputs: false,
  marking: undefined,
  description: undefined,
  name: undefined,
  loading: false,
  authInfo: {
    username: undefined,
    password: undefined,
    hostname: undefined,
    domain: undefined,
    share: undefined,
    sessionExists: false,
  },
  remotePath: undefined,
  progress: 0,
  progressStatus: undefined,
  parser: undefined,
  hdf5InputTable: undefined,
  hdf5OutputTable: undefined,
  fileName: undefined,
};
export const cCAWizardSlice = createSlice({
  name: "cCAWizard",
  initialState,
  reducers: {
    setLocalFileSelected: (state, action: PayloadAction<boolean>) => {
      state.localFileSelected = action.payload;
    },
    setRemotePath: (state, action: PayloadAction<FileDescriptor>) => {
      state.remotePath = action.payload;
    },
    setParser: (state, action: PayloadAction<string>) => {
      state.parser = action.payload;
    },
    setProgressStatus: (state, action: PayloadAction<string>) => {
      state.progressStatus = action.payload;
    },
    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = action.payload;
    },
    setTabName: (state, action: PayloadAction<TabNames>) => {
      state.tab = action.payload;
    },
    setDataLocation: (state, action: PayloadAction<dataLocationType>) => {
      state.dataLocation = action.payload;
    },
    setMid: (state, action: PayloadAction<string>) => {
      state.mid = action.payload;
    },
    setPid: (state, action: PayloadAction<string>) => {
      state.pid = action.payload;
    },
    setFileUploaded: (state, action: PayloadAction<boolean>) => {
      state.fileUploaded = action.payload;
    },
    setAttributes: (state, action: PayloadAction<Attribute[]>) => {
      state.attributes = action.payload;
    },
    setScaleInputs: (state, action: PayloadAction<boolean>) => {
      state.scaleInputs = action.payload;
    },
    setMarking: (state, action: PayloadAction<string>) => {
      state.marking = action.payload;
    },
    setDescription: (state, action: PayloadAction<string>) => {
      state.description = action.payload;
    },
    setName: (state, action: PayloadAction<string>) => {
      state.name = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setAuthInfo: (state, action: PayloadAction<AuthenticationInformation>) => {
      state.authInfo = action.payload;
    },
    setHdf5InputTable: (state, action: PayloadAction<string>) => {
      state.hdf5InputTable = action.payload;
    },
    setHdf5OutputTable: (state, action: PayloadAction<string>) => {
      state.hdf5OutputTable = action.payload;
    },
    setFileName: (state, action: PayloadAction<string>) => {
      state.fileName = action.payload;
    },
    resetCCAWizard: () => initialState,
  },
});

// Action creators are generated for each case reducer function
export const {
  setLocalFileSelected,
  setRemotePath,
  setParser,
  setProgressStatus,
  setProgress,
  setTabName,
  setDataLocation,
  setMid,
  setPid,
  resetCCAWizard: resetCCAWizard,
  setFileUploaded,
  setAttributes,
  setScaleInputs,
  setMarking,
  setDescription,
  setName,
  setLoading,
  setAuthInfo,
  setHdf5InputTable,
  setHdf5OutputTable,
  setFileName,
} = cCAWizardSlice.actions;
// Other code such as selectors can use the imported `RootState` type
export const selectTab = (state: RootState) => state.cCAWizard.tab;
export const selectDataLocation = (state: RootState) => state.cCAWizard.dataLocation;
export const selectFileUploaded = (state: RootState) => state.cCAWizard.fileUploaded;
export const selectPid = (state: RootState) => state.cCAWizard.pid;
export const selectMid = (state: RootState) => state.cCAWizard.mid;
export const selectAttributes = (state: RootState) => state.cCAWizard.attributes;
export const selectScaleInputs = (state: RootState) => state.cCAWizard.scaleInputs;
export const selectMarking = (state: RootState) => state.cCAWizard.marking;
export const selectDescription = (state: RootState) => state.cCAWizard.description;
export const selectName = (state: RootState) => state.cCAWizard.name;
export const selectLoading = (state: RootState) => state.cCAWizard.loading;
export const selectAuthInfo = (state: RootState) => state.cCAWizard.authInfo;
export const selectParser = (state: RootState) => state.cCAWizard.parser;
export const selectProgressStatus = (state: RootState) => state.cCAWizard.progressStatus;
export const selectProgress = (state: RootState) => state.cCAWizard.progress;
export const selectRemotePath = (state: RootState) => state.cCAWizard.remotePath;
export const selectFileName = (state: RootState) => state.cCAWizard.fileName;
export const selectLocalFileSelected = (state: RootState) => state.cCAWizard.localFileSelected;
export const selectHdf5InputTable = (state: RootState) => state.cCAWizard.hdf5InputTable;
export const selectHdf5OutputTable = (state: RootState) => state.cCAWizard.hdf5OutputTable;

export default cCAWizardSlice.reducer;

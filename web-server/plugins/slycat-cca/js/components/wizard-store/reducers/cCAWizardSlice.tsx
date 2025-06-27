import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

export enum TabNames {
  CCA_DATA_WIZARD_SELECTION_TAB = "CCADataWizardSelectionTab",
  CCA_LOCAL_BROWSER_TAB = "CCSLocalBrowserTab",
  CCA_TABLE_INGESTION = "CCATableIngestion",
  CCA_FINISH_MODEL = "CCAFinishModel",
}
export enum dataLocationType {
  LOCAL = "local",
  REMOTE = "remote",
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
  attributes: Attribute[];
  scaleInputs: boolean;
  marking: string | undefined;
  description: string | undefined;
  name: string | undefined;
}
const initialState: CCAWizardState = {
  tab: TabNames.CCA_DATA_WIZARD_SELECTION_TAB,
  dataLocation: dataLocationType.LOCAL,
  mid: undefined,
  pid: undefined,
  fileUploaded: false,
  attributes: [],
  scaleInputs: false,
  marking: undefined,
  description: undefined,
  name: undefined,
};
export const cCAWizardSlice = createSlice({
  name: "cCAWizard",
  initialState,
  reducers: {
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
    resetCCAWizard: () => initialState,
  },
});

// Action creators are generated for each case reducer function
export const {
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
export const selectDescription = (state: RootState) => state.cCAWizard.marking;
export const selectName = (state: RootState) => state.cCAWizard.marking;

export default cCAWizardSlice.reducer;

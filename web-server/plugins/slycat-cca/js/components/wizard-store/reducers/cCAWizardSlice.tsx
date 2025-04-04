import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

export enum TabNames {
  CCA_DATA_WIZARD_SELECTION_TAB = "CCADataWizardSelectionTab",
  CCA_LOCAL_BROWSER_TAB = "CCSLocalBrowserTab",
}
export enum dataLocationType {
  LOCAL = "local",
  REMOTE = "remote",
}
export interface CCAWizardState {
  tab: TabNames;
  dataLocation: dataLocationType;
  mid: string | undefined;
  pid: string | undefined;
}
const initialState: CCAWizardState = {
  tab: TabNames.CCA_DATA_WIZARD_SELECTION_TAB,
  dataLocation: dataLocationType.LOCAL,
  mid: undefined,
  pid: undefined
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
       // TODO: dispatch model creation if no MID present aka undefined
      state.pid = action.payload;
    },
    uploadFile: (state) => {
      console.log(`upload`);
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
  uploadFile,
  resetCCAWizard: resetCCAWizard,
} = cCAWizardSlice.actions;
// Other code such as selectors can use the imported `RootState` type
export const selectTab = (state: RootState) => state.cCAWizard.tab;
export const selectDataLocation = (state: RootState) => state.cCAWizard.dataLocation;
export const selectPid = (state: RootState) => state.cCAWizard.pid;
export const selectMid = (state: RootState) => state.cCAWizard.mid;

export default cCAWizardSlice.reducer;

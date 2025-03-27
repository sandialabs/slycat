import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '../store'

export enum TabNames {
    CCADataWizardSelectionTab = "CCADataWizardSelectionTab",
    CCSLocalBrowserTab = "CCSLocalBrowserTab"
}
const initialState: {tab:TabNames} = {
    tab: TabNames.CCADataWizardSelectionTab,
  }
export const tabTrackingSlice = createSlice({
  name: 'tabTracking',
  initialState,
  reducers: {
    setTabName: (state, action: PayloadAction<TabNames>) => {
      console.log(action.payload)
      state.tab = action.payload
    },
    resetTabTracking: () => initialState
  },
})

// Action creators are generated for each case reducer function
export const { setTabName, resetTabTracking } = tabTrackingSlice.actions
// Other code such as selectors can use the imported `RootState` type
export const selectTab = (state: RootState) => state.tabTracking.tab


export default tabTrackingSlice.reducer
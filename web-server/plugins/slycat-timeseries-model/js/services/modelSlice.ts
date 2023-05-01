import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface ModelState {
  modelId: string | undefined;
}

const parsedUrl = new URL(window.location.href);
const modelId = parsedUrl.pathname.split("/").pop();

const initialState: ModelState = {
  modelId: modelId,
};

export const modelSlice = createSlice({
  name: "model",
  initialState,
  reducers: {
    setModelId: (state, action: PayloadAction<string>) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      state.modelId = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { setModelId } = modelSlice.actions;

export default modelSlice.reducer;

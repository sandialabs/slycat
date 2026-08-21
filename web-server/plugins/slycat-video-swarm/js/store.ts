import { configureStore } from "@reduxjs/toolkit";
import controlsReducer, {
  ControlsState,
  initialState as controlsInitialState,
} from "./services/controlsSlice";

export type RootState = {
  controls: ControlsState;
};

export const createVSStore = (preloadedState?: Partial<RootState>) =>
  configureStore({
    reducer: {
      controls: controlsReducer,
    },
    preloadedState: {
      controls: { ...controlsInitialState, ...preloadedState?.controls },
    },
    devTools: process.env.NODE_ENV !== "production",
  });

export type VSStore = ReturnType<typeof createVSStore>;
export type AppDispatch = VSStore["dispatch"];

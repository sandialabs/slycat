import { configureStore } from "@reduxjs/toolkit";
import controlsReducer, {
  ControlsState,
  initialState as controlsInitialState,
} from "./services/controlsSlice";
import legendReducer, {
  LegendState,
  initialState as legendInitialState,
} from "./services/legendSlice";

export type RootState = {
  controls: ControlsState;
  legend: LegendState;
};

export const createVSStore = (preloadedState?: Partial<RootState>) =>
  configureStore({
    reducer: {
      controls: controlsReducer,
      legend: legendReducer,
    },
    preloadedState: {
      controls: { ...controlsInitialState, ...preloadedState?.controls },
      legend: { ...legendInitialState, ...preloadedState?.legend },
    },
    devTools: process.env.NODE_ENV !== "production",
  });

export type VSStore = ReturnType<typeof createVSStore>;
export type AppDispatch = VSStore["dispatch"];

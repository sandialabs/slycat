/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { ProjectAcl } from "utils/project-role";

export interface CurrentProject {
  _id: string;
  acl: ProjectAcl;
}

export interface CurrentProjectState {
  project: CurrentProject | null;
}

export const initialCurrentProjectState: CurrentProjectState = {
  project: null,
};

const currentProjectSlice = createSlice({
  name: "currentProject",
  initialState: initialCurrentProjectState,
  reducers: {
    setCurrentProject: (state, action: PayloadAction<CurrentProject | null>) => {
      state.project = action.payload;
    },
  },
});

export const { setCurrentProject } = currentProjectSlice.actions;
export default currentProjectSlice.reducer;

/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface CurrentUser {
  uid: string;
  name: string;
  server_administrator: boolean;
}

export interface AuthState {
  currentUser: CurrentUser | null;
}

export const initialAuthState: AuthState = {
  currentUser: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState: initialAuthState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<CurrentUser | null>) => {
      state.currentUser = action.payload;
    },
  },
});

export const { setCurrentUser } = authSlice.actions;
export default authSlice.reducer;

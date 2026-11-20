/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import React, { createContext, type ReactNode } from "react";
import { configureStore } from "@reduxjs/toolkit";
import {
  Provider,
  createDispatchHook,
  createSelectorHook,
  type ReactReduxContextValue,
  type TypedUseSelectorHook,
} from "react-redux";
import authReducer, {
  initialAuthState,
  type AuthState,
  type CurrentUser,
} from "./authSlice";
import currentProjectReducer, {
  initialCurrentProjectState,
  type CurrentProject,
  type CurrentProjectState,
} from "./currentProjectSlice";
import {
  acceptedProjectRole,
  canDeleteModel,
  canDeleteProject,
  type ProjectRole,
} from "utils/project-role";

export type AppStoreState = {
  auth: AuthState;
  currentProject: CurrentProjectState;
};

export type AppStorePreloadedState = {
  auth?: Partial<AuthState>;
  currentProject?: Partial<CurrentProjectState>;
};

export function createAppStore(preloadedState?: AppStorePreloadedState) {
  return configureStore({
    reducer: {
      auth: authReducer,
      currentProject: currentProjectReducer,
    },
    preloadedState: {
      auth: { ...initialAuthState, ...preloadedState?.auth },
      currentProject: { ...initialCurrentProjectState, ...preloadedState?.currentProject },
    },
    devTools: process.env.NODE_ENV !== "production",
  });
}

export const appStore = createAppStore();

export type AppStore = ReturnType<typeof createAppStore>;
export type AppStoreDispatch = AppStore["dispatch"];

const AppStoreContext = createContext<ReactReduxContextValue<AppStoreState> | null>(null);

export const useAppStoreDispatch = createDispatchHook(AppStoreContext);
export const useAppStoreSelector: TypedUseSelectorHook<AppStoreState> =
  createSelectorHook(AppStoreContext);

type AppStoreProviderProps = {
  children: ReactNode;
  store?: AppStore;
};

export function AppStoreProvider({ children, store = appStore }: AppStoreProviderProps) {
  return (
    <Provider store={store} context={AppStoreContext}>
      {children}
    </Provider>
  );
}

export function currentUserFromApi(user: {
  uid?: string;
  name?: string;
  server_administrator?: boolean;
} | null | undefined): CurrentUser | null {
  if (!user?.uid) {
    return null;
  }
  return {
    uid: user.uid,
    name: user.name ?? "",
    server_administrator: Boolean(user.server_administrator),
  };
}

export function currentProjectFromApi(project: {
  _id?: string;
  current_user_role?: unknown;
} | null | undefined): CurrentProject | null {
  if (!project?._id) {
    return null;
  }
  return {
    _id: project._id,
    current_user_role: acceptedProjectRole(project.current_user_role),
  };
}

export function selectCurrentUser(state: AppStoreState): CurrentUser | null {
  return state.auth.currentUser;
}

export function selectCurrentProject(state: AppStoreState): CurrentProject | null {
  return state.currentProject.project;
}

export function selectCurrentProjectRole(state: AppStoreState): ProjectRole {
  return acceptedProjectRole(state.currentProject.project?.current_user_role);
}

export function useCurrentUser(): CurrentUser | null {
  return useAppStoreSelector(selectCurrentUser);
}

export function useCanDeleteProject(role: unknown): boolean {
  return canDeleteProject(acceptedProjectRole(role));
}

export function useCanDeleteModel(): boolean {
  return canDeleteModel(useAppStoreSelector(selectCurrentProjectRole));
}

export { setCurrentUser } from "./authSlice";
export { setCurrentProject } from "./currentProjectSlice";
export type { CurrentUser } from "./authSlice";
export type { CurrentProject } from "./currentProjectSlice";

/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import SshAuthentication from "components/SshAuthentication";
import type { SshAuthValues } from "utils/remote-auth";
import { useAppDispatch, useAppSelector } from "../wizard-store/hooks";
import {
  AuthenticationInformation,
  selectAuthError,
  selectLoading,
  setAuthInfo,
  setTabName,
  TabNames,
} from "../wizard-store/reducers/CCAWizardSlice";
import { useHandleAuthentication } from "../CCAWizardUtils";
import { CCAError } from "../CCAError";

export const CCAAuthenticationTab = (props: { hidden?: boolean }) => {
  const { hidden = false } = props;
  const dispatch = useAppDispatch();
  const handleAuthentication = useHandleAuthentication();
  const loading = useAppSelector(selectLoading);
  const authError = useAppSelector(selectAuthError);

  const applyValues = React.useCallback(
    (values: SshAuthValues) => {
      const authInfo: AuthenticationInformation = {
        username: values.username,
        password: values.password,
        hostname: values.hostname,
        sessionExists: values.sessionExists,
      };
      dispatch(setAuthInfo(authInfo));
    },
    [dispatch],
  );

  const handleEnter = React.useCallback(
    (values: SshAuthValues) => {
      applyValues(values);
      if (values.sessionExists) {
        dispatch(setTabName(TabNames.CCA_REMOTE_BROWSER_TAB));
      } else {
        void handleAuthentication({
          hostname: values.hostname,
          username: values.username,
          password: values.password,
        });
      }
    },
    [applyValues, dispatch, handleAuthentication],
  );

  return (
    <div hidden={hidden}>
      {!hidden && (
        <SshAuthentication
          hostnameMode="editable"
          loadingData={loading}
          focusPassword={Boolean(authError)}
          onChange={applyValues}
          onEnter={handleEnter}
        />
      )}
      {authError && <CCAError errorMessage={authError} />}
    </div>
  );
};

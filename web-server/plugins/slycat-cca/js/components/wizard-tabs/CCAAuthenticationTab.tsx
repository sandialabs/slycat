/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import SlycatRemoteControls from "components/SlycatRemoteControls";
import { useAppDispatch, useAppSelector } from "../wizard-store/hooks";
import {
  AuthenticationInformation,
  selectAuthInfo,
  selectLoading,
  setAuthInfo,
} from "../wizard-store/reducers/cCAWizardSlice";
export const CCAAuthenticationTab = (props: { hidden?: boolean }) => {
  const { hidden = false } = props;
  const dispatch = useAppDispatch();
  const authInfo = useAppSelector(selectAuthInfo);
  const loading = useAppSelector(selectLoading);
  const callBack = (
    hostname: string,
    username: string,
    password: string,
    session_exists: boolean,
  ) => {
    const authInfo: AuthenticationInformation = {
      username,
      password: btoa(password),
      // decode with atob
      hostname,
      sessionExists: session_exists,
    };
    dispatch(setAuthInfo(authInfo));
  };
  return (
    <div hidden={hidden}>
      <SlycatRemoteControls
        sessionExists={authInfo.sessionExists}
        loadingData={loading}
        callBack={callBack}
        showConnectButton={false}
      />
    </div>
  );
};

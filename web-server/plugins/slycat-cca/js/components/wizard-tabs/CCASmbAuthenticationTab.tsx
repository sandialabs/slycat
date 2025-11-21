/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import SmbAuthentication from "components/SmbAuthentication";
import {
  AuthenticationInformation,
  setAuthInfo,
  setTabName,
  TabNames,
} from "../wizard-store/reducers/CCAWizardSlice";
import { useAppDispatch } from "../wizard-store/hooks";
import { useHandleAuthentication } from "../CCAWizardUtils";
export const CCASmbAuthenticationTab = (props: { hidden?: boolean }) => {
  const { hidden = false } = props;
  const dispatch = useAppDispatch();
  const handleAuthentication = useHandleAuthentication();
  const setSmbAuthValues = function (
    hostname: string,
    username: string,
    password: string,
    share: string,
    domain: string,
    session_exists: boolean,
    last_key: string,
  ) {
    const authInfo: AuthenticationInformation = {
      username,
      password: password,
      // decode with atob for password
      hostname,
      domain,
      share,
      sessionExists: session_exists,
    };
    dispatch(setAuthInfo(authInfo));
    //If the user hits enter key, try to connect
    if (last_key === "Enter") {
      if (authInfo?.sessionExists) {
        dispatch(setTabName(TabNames.CCA_REMOTE_BROWSER_TAB));
      } else {
        handleAuthentication();
      }
    }
  };

  return (
    <div hidden={hidden}>
      {!hidden && <SmbAuthentication loadingData={false} callBack={setSmbAuthValues} />}
    </div>
  );
};

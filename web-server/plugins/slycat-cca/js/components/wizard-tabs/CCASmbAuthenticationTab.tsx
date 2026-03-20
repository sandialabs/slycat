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
import { useConnectSMB } from "../CCAWizardUtils";
export const CCASmbAuthenticationTab = (props: { hidden?: boolean }) => {
  const { hidden = false } = props;
  const dispatch = useAppDispatch();
  const connectSMB = useConnectSMB();
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
        dispatch(setTabName(TabNames.CCA_SMB_TAB));
      } else {
        connectSMB(() => dispatch(setTabName(TabNames.CCA_SMB_TAB)));
      }
    }
  };

  return (
    <div hidden={hidden}>
      <div className="alert alert-primary" role="alert">
        <strong>Windows Network Share (SMB) Example:</strong>
        <br />
        If the Windows share URL is: sdss.company.com\Collab3
        <br />
          <div style={{fontSize: "14px", marginLeft: "5px"}}>
            Enter "sdss.company.com" as the Hostname
            <br />
            Enter "Collab3" as the Share Name
            <br />
            Enter your Username and "company.com" as the Domain
            <br />
          </div>
        Browse for your directory after you are connected.
        <br />
      </div>
      {!hidden && <SmbAuthentication loadingData={false} callBack={setSmbAuthValues} />}
    </div>
  );
};

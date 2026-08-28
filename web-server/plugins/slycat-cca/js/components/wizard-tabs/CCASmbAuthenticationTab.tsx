/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import SmbAuthentication from "components/SmbAuthentication";
import type { SmbAuthValues } from "utils/remote-auth";
import { useAppDispatch, useAppSelector } from "../wizard-store/hooks";
import {
  AuthenticationInformation,
  selectLoading,
  setAuthInfo,
  setTabName,
  TabNames,
} from "../wizard-store/reducers/CCAWizardSlice";
import { useConnectSMB } from "../CCAWizardUtils";

export const CCASmbAuthenticationTab = (props: { hidden?: boolean }) => {
  const { hidden = false } = props;
  const dispatch = useAppDispatch();
  const connectSMB = useConnectSMB();
  const loading = useAppSelector(selectLoading);

  const applyValues = React.useCallback(
    (values: SmbAuthValues) => {
      const authInfo: AuthenticationInformation = {
        username: values.username,
        password: values.password,
        hostname: values.hostname,
        domain: values.domain,
        share: values.share,
        sessionExists: values.sessionExists,
      };
      dispatch(setAuthInfo(authInfo));
    },
    [dispatch],
  );

  const handleEnter = React.useCallback(
    (values: SmbAuthValues) => {
      applyValues(values);
      if (values.sessionExists) {
        dispatch(setTabName(TabNames.CCA_SMB_TAB));
      } else {
        connectSMB(() => dispatch(setTabName(TabNames.CCA_SMB_TAB)), {
          hostname: values.hostname,
          username: values.username,
          password: values.password,
          share: values.share,
          domain: values.domain,
        });
      }
    },
    [applyValues, connectSMB, dispatch],
  );

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
      {!hidden && (
        <SmbAuthentication
          loadingData={loading}
          onChange={applyValues}
          onEnter={handleEnter}
        />
      )}
    </div>
  );
};

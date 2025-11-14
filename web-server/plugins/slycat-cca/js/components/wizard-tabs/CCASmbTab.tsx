/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import {
  selectAuthInfo,
} from "../wizard-store/reducers/CCAWizardSlice";
import { useAppSelector } from "../wizard-store/hooks";
import RemoteFileBrowser from "components/FileBrowser/RemoteFileBrowser";
export const CCASmbTab = (props: { hidden?: boolean }) => {
  const { hidden = false } = props;
  const authValues = useAppSelector(selectAuthInfo);

  return (
    <div hidden={hidden}>
      <div>
        <RemoteFileBrowser
          onSelectFileCallBack={() => {
            console.log("onSelectFileCallBack")
          }}
          onSelectParserCallBack={() => {
            console.log("onSelectParserCallBack")
          }}
          onReauthCallBack={() => {
            console.log("onReauthCallBack")
          }}
          hostname={authValues.hostname??''}
          useSMB={true}
          showSelector={false}
        />
      </div>
    </div>
  );
};

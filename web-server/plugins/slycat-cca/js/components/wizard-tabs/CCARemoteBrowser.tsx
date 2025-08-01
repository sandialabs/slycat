/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { useSetUploadStatus } from "../CCAWizardUtils";
import RemoteFileBrowser from "components/RemoteFileBrowser";
import { useAppDispatch, useAppSelector } from "../wizard-store/hooks";
import {
  selectAuthInfo,
  selectTab,
  setTabName,
  TabNames,
} from "../wizard-store/reducers/cCAWizardSlice";
import { SlycatParserControls } from "../slycat-parser-controls/SlycatParserControls";
export const CCARemoteBrowserTab = (props: { hidden?: boolean }) => {
  const { hidden = false } = props;
  const setUploadStatus = useSetUploadStatus();
  const [parser, setParser] = React.useState<string | undefined>(undefined);
  const dispatch = useAppDispatch();
  const { hostname, sessionExists } = useAppSelector(selectAuthInfo);
  const currentTab = useAppSelector(selectTab);
  const onSelectTableFile = (newPath: any, type: any, file: any) => {
    console.log(newPath, type, file);
  };
  const onSelectParserCallBack = (parser: string) => {
    console.log("parser", parser);
  };
  const onReauth = () => {
    if (currentTab === TabNames.CCA_REMOTE_BROWSER_TAB) {
      dispatch(setTabName(TabNames.CCA_AUTHENTICATION_TAB));
    }
  };
  return (
    <div hidden={hidden}>
      {hostname && sessionExists ? (
        <>
          <RemoteFileBrowser
            onSelectFileCallBack={onSelectTableFile}
            onSelectParserCallBack={onSelectParserCallBack}
            onReauthCallBack={onReauth}
            hostname={hostname}
            useSMB={false}
            showSelector={false}
          />
          <SlycatParserControls setParser={setParser} />
        </>
      ) : (
        <span>Bad connection re-authenticate</span>
      )}
    </div>
  );
};

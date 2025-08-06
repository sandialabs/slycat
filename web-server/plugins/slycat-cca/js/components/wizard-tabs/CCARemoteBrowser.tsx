/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import RemoteFileBrowser from "components/RemoteFileBrowser";
import { useAppDispatch, useAppSelector } from "../wizard-store/hooks";
import {
  selectAuthInfo,
  selectTab,
  setTabName,
  setParser,
  TabNames,
  setRemotePath,
  selectLoading,
  selectProgress,
  selectProgressStatus,
} from "../wizard-store/reducers/cCAWizardSlice";
import { SlycatParserControls } from "../slycat-parser-controls/SlycatParserControls";
export const CCARemoteBrowserTab = (props: { hidden?: boolean }) => {
  const { hidden = false } = props;
  const loading = useAppSelector(selectLoading);
  const progress = useAppSelector(selectProgress);
  const progressStatus = useAppSelector(selectProgressStatus);
  const dispatch = useAppDispatch();
  const { hostname, sessionExists } = useAppSelector(selectAuthInfo);
  const currentTab = useAppSelector(selectTab);
  // set the path
  const onSelectTableFile = (newPath: any, type: any, file: any) => {
    dispatch(setRemotePath({ type, path: newPath }));
  };
  // set parser function
  const onSetParser = React.useCallback(
    (parser: string) => {
      dispatch(setParser(parser));
    },
    [dispatch],
  );
  // if auth is lost go back to the auth page
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
            onReauthCallBack={onReauth}
            hostname={hostname}
            useSMB={false}
            showSelector={false}
          />
          <SlycatParserControls setParser={onSetParser} />
        </>
      ) : (
        <span>Bad connection re-authenticate</span>
      )}
      {loading && (
        <div className="progress" style={{ visibility: progress > 0 ? undefined : "hidden" }}>
          <div
            className="progress-bar progress-bar-striped progress-bar-animated"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={100}
            style={{ width: progress?.toString() + "%" }}
          >
            {progressStatus}
          </div>
        </div>
      )}
    </div>
  );
};

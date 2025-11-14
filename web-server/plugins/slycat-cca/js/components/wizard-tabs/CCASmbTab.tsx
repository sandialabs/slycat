/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import {
  selectAuthInfo,
  selectTab,
  setParser,
  TabNames,
} from "../wizard-store/reducers/CCAWizardSlice";
import { useAppDispatch, useAppSelector } from "../wizard-store/hooks";
import RemoteFileBrowser from "components/FileBrowser/RemoteFileBrowser";
import { SlycatParserControls } from "../slycat-parser-controls/SlycatParserControls";
export const CCASmbTab = (props: { hidden?: boolean }) => {
  const { hidden = false } = props;
  const authValues = useAppSelector(selectAuthInfo);
  const tabName = useAppSelector(selectTab);
  const dispatch = useAppDispatch();
  // set parser function
  const onSetParser = React.useCallback(
    (parser: string) => {
      dispatch(setParser(parser));
    },
    [dispatch],
  );
  return (
    <div hidden={hidden}>
      <div>
        {tabName ===  TabNames.CCA_SMB_TAB && 
        <><RemoteFileBrowser
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
        <SlycatParserControls setParser={onSetParser} />
        </>
        }
      </div>
    </div>
  );
};

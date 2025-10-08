/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import HDF5Browser from "components/FileBrowser/HDF5Browser";
import { selectMid, selectPid, selectFileUploaded, setHdf5InputTable} from "../wizard-store/reducers/CCAWizardSlice"
import { onReauth } from "../CCAWizardUtils";
import { useAppSelector, useAppDispatch } from "../wizard-store/hooks";

export const CCAHDF5InputSelectionTab = (props: { hidden?: boolean }) => {
  const { hidden = false } = props;
  const OnReauth = onReauth();
  const fileUploaded = useAppSelector(selectFileUploaded);
  const mid = useAppSelector(selectMid);
  const pid = useAppSelector(selectPid); // Get from state
  const hostname = "local";
  const dispatch = useAppDispatch();
  const handleTablePath = React.useCallback((fullPath:string, fileType:string) => {
      if (fileType === "f") {
        // Can't use '/' in web service call to post_hdf5_table
        fullPath = fullPath.replace(/(?!^)\//g, "-");

        dispatch(setHdf5InputTable(fullPath));
      }
    },[dispatch]);

  return (
    <div hidden={hidden}>
      <HDF5Browser
        onSelectFileCallBack={handleTablePath}
        onReauthCallBack={OnReauth}
        hostname={hostname}
        pid={pid}
        mid={mid}
        fileUploaded={fileUploaded}
      />
    </div>
  );
};

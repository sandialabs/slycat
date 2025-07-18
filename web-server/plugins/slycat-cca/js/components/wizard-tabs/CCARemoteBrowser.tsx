/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { useSetUploadStatus } from "../CCAWizardUtils";

export const CCARemoteBrowserTab = (props: { hidden?: boolean }) => {
  const { hidden = false } = props;
  const setUploadStatus = useSetUploadStatus();
  return <div hidden={hidden}>REMOTE</div>;
};

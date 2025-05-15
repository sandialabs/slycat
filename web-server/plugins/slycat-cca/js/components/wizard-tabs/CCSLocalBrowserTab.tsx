/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { SlycatLocalBrowser } from "../slycat-local-browser/SlycatLocalBrowser";
import { useSetUploadStatus } from "../CCAWizardUtils";
import { useAppSelector } from "../wizard-store/hooks";
import { selectFileUploaded } from "../wizard-store/reducers/cCAWizardSlice";

export const CCALocalBrowserTab = (props: { hidden?: boolean }) => {
  const { hidden = false } = props;
  const fileUploaded = useAppSelector(selectFileUploaded);
  const setUploadStatus = useSetUploadStatus();
  return (
    <div hidden={hidden}>
      <SlycatLocalBrowser setUploadStatus={setUploadStatus} />
    </div>
  );
};

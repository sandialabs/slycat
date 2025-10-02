/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { SlycatLocalBrowser } from "../slycat-local-browser/SlycatLocalBrowser";
import { useAppDispatch } from "../wizard-store/hooks";
import { setLocalFileSelected } from "../wizard-store/reducers/CCAWizardSlice";

export const CCALocalBrowserTab = (props: { hidden?: boolean }) => {
  const { hidden = false } = props;
  const dispatch = useAppDispatch();
  const localFileSelected = React.useCallback((fileSelected: boolean) => {
    dispatch(setLocalFileSelected(fileSelected));
  }, [dispatch]);

  return (
    <div hidden={hidden}>
      <SlycatLocalBrowser callBack={localFileSelected} />
    </div>
  );
};

/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { CCANavItem } from "./CCANavItem";
import { useAppSelector } from "./wizard-store/hooks";
import { selectTab, TabNames } from "./wizard-store/reducers/cCAWizardSlice";

export const CCAWizardNavItems = () => {
  const tabName = useAppSelector(selectTab);
  return (
    <ul className="nav nav-pills">
      <CCANavItem
        key={"Locate Data"}
        name={"Locate Data"}
        active={tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB}
      />
      <CCANavItem
        key={"Upload Table"}
        name={"Upload Table"}
        active={tabName === TabNames.CCA_LOCAL_BROWSER_TAB}
        hidden={false}
      />
      {/* TODO: the hidden tabs below should be consolidated */}
      <CCANavItem key={"Choose Host"} name={"Choose Host"} hidden={true} />
      <CCANavItem key={"Select Table"} name={"Select Table"} hidden={true} />
      <CCANavItem key={"Select Columns"} name={"Select Columns"} />
      <CCANavItem key={"Name Model"} name={"Name Model"} />
    </ul>
  );
};

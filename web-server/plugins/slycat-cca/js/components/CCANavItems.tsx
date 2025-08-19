/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { CCANavItem } from "./CCANavItem";
import { useAppSelector } from "./wizard-store/hooks";
import { selectDataLocation, selectTab, TabNames } from "./wizard-store/reducers/CCAWizardSlice";

export const CCAWizardNavItems = () => {
  const tabName = useAppSelector(selectTab);
  const dataLocation = useAppSelector(selectDataLocation);
  return (
    <ul className="nav nav-pills">
      <CCANavItem
        key={"Locate Data"}
        name={"Locate Data"}
        active={tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB}
      />
      <CCANavItem
        key={"Authentication"}
        name={"Authentication"}
        active={tabName === TabNames.CCA_AUTHENTICATION_TAB}
        hidden={tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB || dataLocation !== "remote"}
      />
      <CCANavItem
        key={"Upload Table"}
        name={"Upload Table"}
        active={
          tabName === TabNames.CCA_LOCAL_BROWSER_TAB ||
          tabName === TabNames.CCA_REMOTE_BROWSER_TAB
        }
        hidden={
          tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB ||
          tabName === TabNames.CCA_AUTHENTICATION_TAB
        }
      />
      <CCANavItem
        key={"Select Columns"}
        name={"Select Columns"}
        active={tabName === TabNames.CCA_TABLE_INGESTION}
        hidden={
          tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB ||
          tabName === TabNames.CCA_LOCAL_BROWSER_TAB ||
          tabName === TabNames.CCA_REMOTE_BROWSER_TAB || 
          tabName === TabNames.CCA_AUTHENTICATION_TAB
        }
      />
      <CCANavItem
        key={"Name Model"}
        name={"Name Model"}
        active={tabName === TabNames.CCA_FINISH_MODEL}
        hidden={tabName !== TabNames.CCA_FINISH_MODEL}
      />
      {/* TODO: the hidden tabs below should be consolidated */}
      <CCANavItem key={"Choose Host"} name={"Choose Host"} hidden={true} />
      <CCANavItem key={"Select Table"} name={"Select Table"} hidden={true} />
    </ul>
  );
};

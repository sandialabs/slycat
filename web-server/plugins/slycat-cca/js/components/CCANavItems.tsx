/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { CCANavItem } from "./CCANavItem";
import { useAppSelector } from "./wizard-store/hooks";
import {
  dataLocationType,
  selectDataLocation,
  selectParser,
  selectTab,
  TabNames,
} from "./wizard-store/reducers/CCAWizardSlice";

export const CCAWizardNavItems = () => {
  const tabName = useAppSelector(selectTab);
  const dataLocation = useAppSelector(selectDataLocation);
  const parser = useAppSelector(selectParser);
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
        active={
          tabName === TabNames.CCA_AUTHENTICATION_TAB ||
          tabName === TabNames.CCA_SMB_AUTHENTICATION_TAB
        }
        hidden={
          tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB ||
          (dataLocation !== dataLocationType.REMOTE && dataLocation !== dataLocationType.SMB)
        }
      />
      <CCANavItem
        key={"Upload Table"}
        name={"Upload Table"}
        active={
          tabName === TabNames.CCA_LOCAL_BROWSER_TAB ||
          tabName === TabNames.CCA_REMOTE_BROWSER_TAB ||
          tabName === TabNames.CCA_SMB_TAB
        }
        hidden={
          tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB ||
          tabName === TabNames.CCA_AUTHENTICATION_TAB ||
          tabName === TabNames.CCA_SMB_AUTHENTICATION_TAB
        }
      />
      <CCANavItem
        key={"HDF5 Input"}
        name={"HDF5 Input"}
        active={tabName === TabNames.CCA_HDF5_INPUT_SELECTION_TAB}
        hidden={
          tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB ||
          tabName === TabNames.CCA_AUTHENTICATION_TAB ||
          tabName === TabNames.CCA_LOCAL_BROWSER_TAB ||
          tabName === TabNames.CCA_REMOTE_BROWSER_TAB ||
          tabName === TabNames.CCA_TABLE_INGESTION ||
          parser !== "slycat-hdf5-parser"
        }
      />
      <CCANavItem
        key={"HDF5 Output"}
        name={"HDF5 Output"}
        active={tabName === TabNames.CCA_HDF5_OUTPUT_SELECTION_TAB}
        hidden={
          tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB ||
          tabName === TabNames.CCA_AUTHENTICATION_TAB ||
          tabName === TabNames.CCA_LOCAL_BROWSER_TAB ||
          tabName === TabNames.CCA_REMOTE_BROWSER_TAB ||
          tabName === TabNames.CCA_HDF5_INPUT_SELECTION_TAB ||
          tabName === TabNames.CCA_TABLE_INGESTION ||
          parser !== "slycat-hdf5-parser"
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
          tabName === TabNames.CCA_AUTHENTICATION_TAB ||
          tabName === TabNames.CCA_SMB_AUTHENTICATION_TAB || 
          tabName === TabNames.CCA_SMB_TAB ||
          tabName === TabNames.CCA_HDF5_INPUT_SELECTION_TAB ||
          tabName === TabNames.CCA_HDF5_OUTPUT_SELECTION_TAB ||
          parser === "slycat-hdf5-parser"
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

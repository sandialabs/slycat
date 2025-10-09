/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { CCAWizardDataSelectionTab } from "./wizard-tabs/CCADataWizardSelectionTab";
import { CCAWizardNavItems } from "./CCANavItems";
import { useAppSelector } from "./wizard-store/hooks";
import { selectTab, TabNames } from "./wizard-store/reducers/CCAWizardSlice";
import { CCALocalBrowserTab } from "./wizard-tabs/CCALocalBrowserTab";
import { CCAHDF5InputSelectionTab } from "./wizard-tabs/CCAHDF5InputSelectionTab";
import { CCAHDF5OutputSelectionTab } from "./wizard-tabs/CCAHDF5OutputSelectionTab";
import { CCATableIngestion } from "./wizard-tabs/CCATableIngestion";
import { CCAModelCreation } from "./wizard-tabs/CCAModelCreation";
import { CCARemoteBrowserTab } from "./wizard-tabs/CCARemoteBrowser";
import { CCAAuthenticationTab } from "./wizard-tabs/CCAAuthenticationTab";

export const CCAWizardSteps = () => {
  // The `state` arg is correctly typed as `RootState` already
  const tabName = useAppSelector(selectTab);
  return (
    <div className="modal-body">
      <CCAWizardNavItems />
      <div className="tab-content">
        <CCAWizardDataSelectionTab hidden={!(tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB)} />
        <CCALocalBrowserTab hidden={!(tabName === TabNames.CCA_LOCAL_BROWSER_TAB)} />
        <CCAHDF5InputSelectionTab hidden={!(tabName === TabNames.CCA_HDF5_INPUT_SELECTION_TAB)} />
        <CCAHDF5OutputSelectionTab hidden={!(tabName === TabNames.CCA_HDF5_OUTPUT_SELECTION_TAB)} />
        <CCAAuthenticationTab hidden={!(tabName === TabNames.CCA_AUTHENTICATION_TAB)} />
        <CCARemoteBrowserTab hidden={!(tabName === TabNames.CCA_REMOTE_BROWSER_TAB)} />
        <CCATableIngestion hidden={!(tabName === TabNames.CCA_TABLE_INGESTION)} />
        <CCAModelCreation hidden={!(tabName === TabNames.CCA_FINISH_MODEL)}/>
      </div>
    </div>
  );
};

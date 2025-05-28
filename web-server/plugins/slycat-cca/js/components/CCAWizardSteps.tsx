/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { CCAWizardDataSelectionTab } from "./wizard-tabs/CCADataWizardSelectionTab";
import { CCAWizardNavItems } from "./CCANavItems";
import { useAppSelector } from "./wizard-store/hooks";
import { selectTab, TabNames } from "./wizard-store/reducers/cCAWizardSlice";
import { CCALocalBrowserTab } from "./wizard-tabs/CCSLocalBrowserTab";
import { CCATableIngestion } from "./wizard-tabs/CCATableIngestion";

export const CCAWizardSteps = () => {
  // The `state` arg is correctly typed as `RootState` already
  const tabName = useAppSelector(selectTab);
  return (
    <div className="modal-body">
      <CCAWizardNavItems />
      <div className="tab-content">
        <CCAWizardDataSelectionTab hidden={!(tabName === TabNames.CCA_DATA_WIZARD_SELECTION_TAB)} />
        <CCALocalBrowserTab hidden={!(tabName === TabNames.CCA_LOCAL_BROWSER_TAB)} />
        <CCATableIngestion hidden={!(tabName === TabNames.CCA_TABLE_INGESTION)} />
        <div hidden={true}>
          <form role="form">
            {/* <slycat-remote-controls
                params="
                hostname:remote.hostname,
                username:remote.username,
                password:remote.password,
                status:remote.status,
                status_type:remote.status_type,
                enable:remote.enable,
                focus:remote.focus,
                activate:connect,
                session_exists:remote.session_exists"
              ></slycat-remote-controls> */}
          </form>
        </div>

        <div hidden={true} style={{ height: "400px" }}>
          <div className="slycat-remote-browser-flex-layout">
            {/* <slycat-remote-browser
                params="
                type:'remote',
                sid:remote.sid,
                hostname:remote.hostname,
                selection:browser.selection,
                path:browser.path,
                open_file_callback:load_table,
                session_exists:remote.session_exists,
                persistence_id:'cca-table-file',
                progress:remote.progress,
                progress_status:remote.progress_status,
                reauth:reauth,"
              ></slycat-remote-browser>
              <slycat-parser-controls params="parser:parser,category:'table'"></slycat-parser-controls> */}
          </div>
        </div>
        <div hidden={!(tabName === TabNames.CCA_FINISH_MODEL)}>
          <form data-bind="submit: name_model" id="new-cca-name-model-form" noValidate>
            {/* <slycat-model-controls
                params="name:model.name,description:model.description,marking:model.marking"
              ></slycat-model-controls> */}
          </form>
        </div>
      </div>
    </div>
  );
};

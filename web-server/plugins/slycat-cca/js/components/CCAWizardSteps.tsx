/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { CCAWizardSelectionTab } from "./CCAWizardSelectionTab";
import { CCAWizardNavItems } from "./CCANavItems";

export const CCAWizardSteps = () => {
  return (
    <div className="modal-body">
      <CCAWizardNavItems/>

      <div className="tab-content">
        <CCAWizardSelectionTab/>
        <div hidden={true}>
          <div
            className="alert alert-danger"
            role="alert"
            data-bind="visible:show_local_browser_error()"
          >
            You must selected a file before continuing.
          </div>
          {/* <slycat-local-browser
              params="
              selection:browser.selection,
              progress:browser.progress,
              progress_status:browser.progress_status"
            ></slycat-local-browser>
            <slycat-parser-controls params="parser:parser,category:'table'"></slycat-parser-controls> */}
        </div>

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

        <div hidden={true}>
          {/* <slycat-table-ingestion
              params="
              variables: attributes,
              properties: [{name: 'Classification', type: 'select', values: ['Input','Output','Neither']}]
            "
            ></slycat-table-ingestion> */}
          <form role="form">
            <div className="form-group mt-3">
              <div className="form-check pl-1">
                <label>
                  <input type="checkbox" data-bind="checked: scale_inputs" /> Scale to unit variance
                </label>
              </div>
            </div>
          </form>
        </div>

        <div hidden={true}>
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

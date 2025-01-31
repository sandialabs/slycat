/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";

export const CCAWizardSteps = () => {
  return (
    <div className="modal-body">
      <ul className="nav nav-pills">
        <li className="nav-item active" data-bind="css:{active:tab() == 0}">
          <a className="nav-link">Locate Data</a>
        </li>
        <li
          className="nav-item"
          hidden={true}
          data-bind="css:{active:tab() == 1}, visible: cca_type() == 'local'"
        >
          <a className="nav-link">Upload Table</a>
        </li>
        <li
          className="nav-item"
          hidden={true}
          data-bind="css:{active:tab() == 2}, visible: cca_type() == 'remote'"
        >
          <a className="nav-link">Choose Host</a>
        </li>
        <li
          className="nav-item"
          hidden={true}
          data-bind="css:{active:tab() == 3}, visible: cca_type() == 'remote'"
        >
          <a className="nav-link">Select Table</a>
        </li>
        <li className="nav-item" data-bind="css:{active:tab() == 4}">
          <a className="nav-link">Select Columns</a>
        </li>
        <li className="nav-item" data-bind="css:{active:tab() == 5}">
          <a className="nav-link">Name Model</a>
        </li>
      </ul>

      <div className="tab-content">
        <div hidden={false}>
          <div className="form-check" style={{ marginLeft: "15px" }}>
            <label>
              <input
                type="radio"
                name="local-or-remote-radios"
                id="local-radio"
                value="local"
                data-bind="checked: cca_type"
              />
              Local
            </label>
          </div>
          <div className="form-check" style={{ marginLeft: "15px" }}>
            <label>
              <input
                type="radio"
                name="local-or-remote-radios"
                id="remote-radio"
                value="remote"
                data-bind="checked: cca_type"
              />
              Remote
            </label>
          </div>
        </div>

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

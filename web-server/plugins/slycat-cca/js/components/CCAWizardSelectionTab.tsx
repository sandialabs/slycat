/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";

export const CCAWizardSelectionTab = () => {
  return (
    <div>
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
  );
};

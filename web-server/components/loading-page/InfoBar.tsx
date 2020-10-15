"use strict";
import * as React from "react";
import { getFormattedDateTime } from "./utils.ts";
import { InfoBarProps } from "./types.ts";

/**
 * react pure component used to create a the info bar
 *
 * @export
 * @extends {React.Component<InfoBarProps>}
 */
const InfoBar: React.FunctionComponent<InfoBarProps> = (props) => (
  <div className="row justify-content-center">
    <div className="col-3">Updated {getFormattedDateTime()}</div>
    <div className="col-2">
      Job id: <b>{props.jid}</b>
    </div>
    <div className="col-4">
      Remote host: <b>{props.hostname}</b>
    </div>
    <div className="col-2">
      Session: <b>{props.sessionExists ? "Connected" : "Not connected"}</b>
    </div>
  </div>
);

export default InfoBar;

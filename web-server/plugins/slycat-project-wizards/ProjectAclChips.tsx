/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import React from "react";
import type { AclChipRole } from "./projectAcl";

const ROLE_BTN_CLASS: Record<AclChipRole, string> = {
  administrator: "btn-danger",
  writer: "btn-warning",
  reader: "btn-primary",
};

const REMOVE_AS: Record<AclChipRole, string> = {
  administrator: "an administrator",
  writer: "a writer",
  reader: "a reader",
};

type ProjectAclChipsProps = {
  names: string[];
  role: AclChipRole;
  removable?: boolean;
  size?: "sm";
  onRemove?: (name: string) => void;
};

const ProjectAclChips: React.FC<ProjectAclChipsProps> = ({
  names,
  role,
  removable = false,
  size,
  onRemove,
}) => {
  const btnClass = `btn ${size === "sm" ? "btn-sm " : ""}${ROLE_BTN_CLASS[role]}`;
  const withMargin = size === "sm" || role !== "administrator";

  return (
    <>
      {names.map((name) => (
        <div
          key={`${role}-${name}`}
          className="btn-group"
          role="group"
          style={withMargin ? { margin: 5 } : undefined}
        >
          {removable ? (
            <button
              type="button"
              className={btnClass}
              title={`Remove ${name} as ${REMOVE_AS[role]}`}
              onClick={() => onRemove?.(name)}
            >
              <i className="fa-regular fa-trash-can"></i>
            </button>
          ) : null}
          <div className={btnClass} style={{ pointerEvents: "none" }}>
            <span>{name}</span>
          </div>
        </div>
      ))}
    </>
  );
};

export default ProjectAclChips;

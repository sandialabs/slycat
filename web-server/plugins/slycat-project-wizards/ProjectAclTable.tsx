/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import React from "react";
import Icon, { type IconName } from "components/Icons/Icon";
import type { AclRole, AclTableRow } from "./projectAcl";
import "./edit-ui.css";

const ROLE_LABEL: Record<AclRole, string> = {
  administrator: "Administrator",
  writer: "Writer",
  reader: "Reader",
};

const ROLE_ICON: Record<AclRole, IconName> = {
  administrator: "shield-check",
  writer: "pencil-simple",
  reader: "eye",
};

const REMOVE_AS: Record<AclRole, string> = {
  administrator: "an administrator",
  writer: "a writer",
  reader: "a reader",
};

export const ACL_USERS_LABEL = "Individual Users";
export const ACL_METAGROUPS_LABEL = "Metagroups";
export const ACL_TABLE_LABEL = "Assigned Users and Metagroups";

type AclRowKind = "user" | "group";

type ProjectAclTableProps = {
  title: string;
  kind: AclRowKind;
  rows: AclTableRow[];
  removable?: boolean;
  onRemove?: (name: string, role: AclRole) => void;
};

const IconLabel: React.FC<{ type: IconName; title: string; label: string }> = ({
  type,
  title,
  label,
}) => (
  <span className="d-inline-flex align-items-center gap-2">
    <Icon type={type} title={title} className="edit-project-acl-icon" />
    <span>{label}</span>
  </span>
);

const ProjectAclTable: React.FC<ProjectAclTableProps> = ({
  title,
  kind,
  rows,
  removable = false,
  onRemove,
}) => {
  const colSpan = removable ? 3 : 2;
  const nameIcon: IconName = kind === "user" ? "user" : "users-three";
  const nameTitle = kind === "user" ? "User" : "Metagroup";

  return (
    <div className="table-responsive edit-project-acl-table-wrap">
      <table
        className="table table-sm table-hover align-middle mb-0 edit-project-acl-table"
        aria-label={title}
      >
        <thead>
          <tr className="table-light">
            <th scope="col" colSpan={colSpan}>
              {title}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="text-muted">
                None assigned
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={`${kind}-${row.role}-${row.name}`}>
                <td>
                  <IconLabel type={nameIcon} title={nameTitle} label={row.name} />
                </td>
                <td>
                  <IconLabel
                    type={ROLE_ICON[row.role]}
                    title={ROLE_LABEL[row.role]}
                    label={ROLE_LABEL[row.role]}
                  />
                </td>
                {removable ? (
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      title={`Remove ${row.name} as ${REMOVE_AS[row.role]}`}
                      onClick={() => onRemove?.(row.name, row.role)}
                    >
                      <Icon type="trash-can" title={`Remove ${row.name}`} />
                      <span className="visually-hidden">Remove {row.name}</span>
                    </button>
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectAclTable;

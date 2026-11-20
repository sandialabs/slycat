/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

export type ProjectRole = "administrator" | "writer" | "reader" | "none";

const PROJECT_ROLES: ReadonlySet<string> = new Set(["administrator", "writer", "reader", "none"]);

/**
 * Accept a role string from the server. Anything else, including a missing value, is none.
 */
export function acceptedProjectRole(role: unknown): ProjectRole {
  if (typeof role === "string" && PROJECT_ROLES.has(role)) {
    return role as ProjectRole;
  }
  return "none";
}

function isProjectAdmin(role: ProjectRole): boolean {
  return role === "administrator";
}

function isProjectWriter(role: ProjectRole): boolean {
  return role === "administrator" || role === "writer";
}

export const canDeleteProject = isProjectAdmin;
export const canEditProject = isProjectAdmin;
export const canDeleteModel = isProjectWriter;
export const canEditModel = isProjectWriter;
export const canCreateModel = isProjectWriter;

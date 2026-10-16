/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

export type ProjectRole = "administrator" | "writer" | "reader" | "none";

export interface AclUser {
  user: string;
}

export interface ProjectAcl {
  administrators?: AclUser[];
  writers?: AclUser[];
  readers?: AclUser[];
  server_administrators?: AclUser[];
}

export interface GetProjectRoleOptions {
  serverAdministrator?: boolean;
}

function userInList(list: AclUser[] | undefined, uid: string): boolean {
  return Array.isArray(list) && list.some((entry) => entry && entry.user === uid);
}

/**
 * Derive the current user's role on a project from JSON ACL.
 * Precedence: server administrator, project administrator, writer, reader, none.
 */
export function getProjectRole(
  acl: ProjectAcl | null | undefined,
  uid: string | null | undefined,
  options: GetProjectRoleOptions = {},
): ProjectRole {
  if (!uid) {
    return "none";
  }
  if (options.serverAdministrator) {
    return "administrator";
  }
  if (!acl) {
    return "none";
  }
  if (userInList(acl.server_administrators, uid) || userInList(acl.administrators, uid)) {
    return "administrator";
  }
  if (userInList(acl.writers, uid)) {
    return "writer";
  }
  if (userInList(acl.readers, uid)) {
    return "reader";
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

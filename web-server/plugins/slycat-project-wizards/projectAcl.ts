/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

export type UserPermission = "reader" | "writer" | "administrator";
export type MetagroupPermission = "reader" | "writer";
export type AclRole = UserPermission;
export type AclChipRole = AclRole;

export interface AclTableRow {
  name: string;
  role: AclRole;
}

export interface AclUser {
  user: string;
}

export interface ProjectAclGroups {
  readers: string[];
  writers: string[];
}

export interface ProjectAcl {
  administrators: AclUser[];
  writers: AclUser[];
  readers: AclUser[];
  groups: ProjectAclGroups;
}

export interface ProjectSnapshot {
  _id: string;
  name: string;
  description?: string;
  acl?: unknown;
}

function asUserList(list: unknown): AclUser[] {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((item) => {
      if (item && typeof item === "object" && typeof (item as AclUser).user === "string") {
        return { user: (item as AclUser).user };
      }
      return null;
    })
    .filter((item): item is AclUser => item !== null);
}

function asNameList(list: unknown): string[] {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.filter((item): item is string => typeof item === "string");
}

export function normalizeAcl(acl: unknown): ProjectAcl {
  const raw = acl && typeof acl === "object" ? (acl as Record<string, unknown>) : {};
  const groupsRaw = raw.groups;
  let groupReaders: string[] = [];
  let groupWriters: string[] = [];
  if (groupsRaw && typeof groupsRaw === "object" && !Array.isArray(groupsRaw)) {
    const groups = groupsRaw as Record<string, unknown>;
    groupReaders = asNameList(groups.readers);
    groupWriters = asNameList(groups.writers);
  }
  return {
    administrators: asUserList(raw.administrators),
    writers: asUserList(raw.writers),
    readers: asUserList(raw.readers),
    groups: {
      readers: groupReaders,
      writers: groupWriters,
    },
  };
}

export function userNames(list: AclUser[]): string[] {
  return list.map((item) => item.user);
}

export function aclUserRows(acl: ProjectAcl): AclTableRow[] {
  return [
    ...acl.administrators.map((item) => ({ name: item.user, role: "administrator" as const })),
    ...acl.writers.map((item) => ({ name: item.user, role: "writer" as const })),
    ...acl.readers.map((item) => ({ name: item.user, role: "reader" as const })),
  ];
}

export function aclMetagroupRows(acl: ProjectAcl): AclTableRow[] {
  return [
    ...acl.groups.writers.map((name) => ({ name, role: "writer" as const })),
    ...acl.groups.readers.map((name) => ({ name, role: "reader" as const })),
  ];
}

export function removeUserFromAcl(acl: ProjectAcl, uid: string): ProjectAcl {
  const notUser = (item: AclUser) => item.user !== uid;
  return {
    ...acl,
    administrators: acl.administrators.filter(notUser),
    writers: acl.writers.filter(notUser),
    readers: acl.readers.filter(notUser),
  };
}

export function addUserToAcl(acl: ProjectAcl, uid: string, role: UserPermission): ProjectAcl {
  const next = removeUserFromAcl(acl, uid);
  const entry = { user: uid };
  if (role === "administrator") {
    next.administrators = [...next.administrators, entry];
  } else if (role === "writer") {
    next.writers = [...next.writers, entry];
  } else {
    next.readers = [...next.readers, entry];
  }
  return next;
}

export function removeMetagroupFromAcl(acl: ProjectAcl, name: string): ProjectAcl {
  return {
    ...acl,
    groups: {
      readers: acl.groups.readers.filter((item) => item !== name),
      writers: acl.groups.writers.filter((item) => item !== name),
    },
  };
}

export function addMetagroupToAcl(
  acl: ProjectAcl,
  name: string,
  role: MetagroupPermission,
): ProjectAcl {
  const next = removeMetagroupFromAcl(acl, name);
  if (role === "writer") {
    next.groups = { ...next.groups, writers: [...next.groups.writers, name] };
  } else {
    next.groups = { ...next.groups, readers: [...next.groups.readers, name] };
  }
  return next;
}

export function permissionDescription(permission: UserPermission): string {
  if (permission === "reader") {
    return "Readers can view all data in a project.";
  }
  if (permission === "writer") {
    return "Writers can view all data in a project, and add, modify, or delete models.";
  }
  return "Administrators can view all data in a project, add, modify, and delete models, modify or delete the project, and add or remove project members.";
}

export function metagroupPermissionDescription(permission: MetagroupPermission): string {
  if (permission === "reader") {
    return "Reader metagroups can view all data in a project.";
  }
  return "Writer metagroups can view all data in a project, and add, modify, or delete models.";
}

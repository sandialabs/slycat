/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import React, { useEffect, useRef, useState } from "react";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import { SLYCAT_AUTH_LABELS } from "utils/ui-labels";
import api_root from "js/slycat-api-root";
import "./edit-ui.css";
import ProjectAclTable, { ACL_METAGROUPS_LABEL, ACL_USERS_LABEL } from "./ProjectAclTable";
import {
  aclMetagroupRows,
  aclUserRows,
  addMetagroupToAcl,
  addUserToAcl,
  metagroupPermissionDescription,
  normalizeAcl,
  permissionDescription,
  removeMetagroupFromAcl,
  removeUserFromAcl,
  type MetagroupPermission,
  type ProjectAcl,
  type ProjectSnapshot,
  type UserPermission,
} from "./projectAcl";

const METAGROUP_SEARCH_DEBOUNCE_MS = 800;

type CurrentUser = {
  uid?: string;
  name?: string;
};

type MetagroupSearchResult = {
  name: string;
  owner: string;
  memberCount: number;
};

type EditProjectProps = {
  project: ProjectSnapshot;
};

const EditProject: React.FC<EditProjectProps> = ({ project }) => {
  const [tab, setTab] = useState(0);
  const [name, setName] = useState(project.name || "");
  const [description, setDescription] = useState(project.description || "");
  const [acl, setAcl] = useState<ProjectAcl>(() => normalizeAcl(project.acl));
  const [permission, setPermission] = useState<UserPermission>("reader");
  const [newUser, setNewUser] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser>({});
  const [metagroupPermission, setMetagroupPermission] = useState<MetagroupPermission>("reader");
  const [metagroupSearch, setMetagroupSearch] = useState("");
  const [metagroupSearchResults, setMetagroupSearchResults] = useState<MetagroupSearchResult[]>([]);
  const [metagroupSearchLoading, setMetagroupSearchLoading] = useState(false);
  const [selectedMetagroup, setSelectedMetagroup] = useState<MetagroupSearchResult | null>(null);
  const generalFormRef = useRef<HTMLFormElement>(null);
  const membersFormRef = useRef<HTMLFormElement>(null);
  const searchIdRef = useRef(0);

  useEffect(() => {
    client.get_user({
      success: (user: CurrentUser) => {
        setCurrentUser(user);
      },
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = metagroupSearch.trim();
    const searchId = ++searchIdRef.current;

    if (!query) {
      setMetagroupSearchResults([]);
      setMetagroupSearchLoading(false);
      setSelectedMetagroup(null);
      return;
    }

    setMetagroupSearchLoading(true);
    setMetagroupSearchResults([]);
    setSelectedMetagroup(null);

    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      fetch(api_root + "groups/" + encodeURIComponent(query))
        .then((response) => {
          if (!response.ok) {
            throw new Error("Group search failed with status " + response.status);
          }
          return response.json();
        })
        .then((groups: Array<{ name: string; owner: string; member_count: number }>) => {
          if (cancelled || searchId !== searchIdRef.current) {
            return;
          }
          const matches = groups.map((group) => ({
            name: group.name,
            owner: group.owner,
            memberCount: group.member_count,
          }));
          setMetagroupSearchResults(matches);
        })
        .catch(() => {
          if (cancelled || searchId !== searchIdRef.current) {
            return;
          }
          setMetagroupSearchResults([]);
        })
        .then(() => {
          if (!cancelled && searchId === searchIdRef.current) {
            setMetagroupSearchLoading(false);
          }
        });
    }, METAGROUP_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [metagroupSearch]);

  const metagroupSearchHelper = (() => {
    const query = metagroupSearch.trim();
    if (!query) {
      return "";
    }
    if (metagroupSearchLoading && metagroupSearchResults.length === 0) {
      return "Searching...";
    }
    if (!metagroupSearchLoading && metagroupSearchResults.length === 0) {
      return "No metagroups match your search.";
    }
    return "";
  })();

  const addProjectMember = (formElement: HTMLFormElement | null) => {
    if (!formElement) {
      return;
    }
    formElement.classList.add("was-validated");
    if (formElement.checkValidity() !== true) {
      return;
    }
    formElement.classList.remove("was-validated");

    client.get_user({
      uid: newUser,
      success: (user: { uid: string; name: string }) => {
        if (permission === "reader") {
          dialog.confirm({
            title: "Add Project Reader",
            message:
              "Add " + user.name + " to the project?  They will have read access to all project data.",
            ok: () => {
              setAcl((prev) => addUserToAcl(prev, user.uid, "reader"));
              setNewUser("");
            },
          });
        }
        if (permission === "writer") {
          dialog.confirm({
            title: "Add Project Writer",
            message:
              "Add " +
              user.name +
              " to the project?  They will have read and write access to all project data.",
            ok: () => {
              setAcl((prev) => addUserToAcl(prev, user.uid, "writer"));
              setNewUser("");
            },
          });
        }
        if (permission === "administrator") {
          dialog.confirm({
            title: "Add Project Administrator",
            message:
              "Add " +
              user.name +
              " to the project?  They will have read and write access to all project data, and will be able to add and remove other project members.",
            ok: () => {
              setAcl((prev) => addUserToAcl(prev, user.uid, "administrator"));
              setNewUser("");
            },
          });
        }
      },
      error: (request: { status: number }, _status: string, reason_phrase: string) => {
        if (request.status == 404) {
          dialog.dialog({
            title: "Unknown User",
            message:
              "User '" +
              newUser +
              "' couldn't be found.  Ensure that you correctly entered their id, not their name.",
          });
        } else {
          dialog.dialog({
            title: "Error retrieving user information",
            message: reason_phrase,
          });
        }
      },
    });
  };

  const removeProjectMember = (uid: string) => {
    if (currentUser.uid === uid) {
      dialog.confirm({
        title: "Warning!",
        message:
          "You are removing yourself as an administrator. \
          If you do this and save changes, you will be unable to access this project.",
        ok: () => {
          setAcl((prev) => removeUserFromAcl(prev, uid));
        },
      });
    } else {
      setAcl((prev) => removeUserFromAcl(prev, uid));
    }
  };

  const clearMetagroupSelection = () => {
    setSelectedMetagroup(null);
    setMetagroupSearch("");
  };

  const addProjectMetagroup = (group: MetagroupSearchResult | null = selectedMetagroup) => {
    if (!group) {
      return;
    }
    const groupName = group.name;
    if (metagroupPermission === "reader") {
      dialog.confirm({
        title: "Add Project Reader Metagroup",
        message:
          "Add metagroup '" +
          groupName +
          "' to the project?  Members of this group will have read access to all project data.",
        ok: () => {
          setAcl((prev) => addMetagroupToAcl(prev, groupName, "reader"));
          clearMetagroupSelection();
        },
      });
    }
    if (metagroupPermission === "writer") {
      dialog.confirm({
        title: "Add Project Writer Metagroup",
        message:
          "Add metagroup '" +
          groupName +
          "' to the project?  Members of this group will have read and write access to all project data.",
        ok: () => {
          setAcl((prev) => addMetagroupToAcl(prev, groupName, "writer"));
          clearMetagroupSelection();
        },
      });
    }
  };

  const saveProject = (formElement: HTMLFormElement | null) => {
    if (!formElement) {
      return;
    }
    formElement.classList.add("was-validated");
    if (formElement.checkValidity() !== true) {
      return;
    }
    formElement.classList.remove("was-validated");
    client.put_project({
      pid: project._id,
      name,
      description,
      acl,
      success: () => {
        window.location.reload(true);
      },
      error: dialog.ajax_error("Error updating project."),
    });
  };

  const deleteProjectCache = () => {
    client.delete_project_cache({
      pid: project._id,
      success: () => {},
      error: dialog.ajax_error("Error updating project."),
    });
  };

  return (
    <>
      <div className="modal-header">
        <h3 className="modal-title">Edit Project</h3>
        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div className="modal-body">
        <ul className="nav nav-tabs edit-project-nav-tabs" role="tablist">
          <li className="nav-item" role="presentation">
            <a
              className={`nav-link${tab === 0 ? " active" : ""}`}
              href="#"
              role="tab"
              id="edit-project-general-tab"
              aria-selected={tab === 0}
              onClick={(event) => {
                event.preventDefault();
                setTab(0);
              }}
            >
              <h5 className="mb-0">General</h5>
            </a>
          </li>
          <li className="nav-item" role="presentation">
            <a
              className={`nav-link${tab === 1 ? " active" : ""}`}
              href="#"
              role="tab"
              id="edit-project-permissions-tab"
              aria-selected={tab === 1}
              onClick={(event) => {
                event.preventDefault();
                setTab(1);
              }}
            >
              <h5 className="mb-0">User Access</h5>
            </a>
          </li>
        </ul>

        <div className="tab-content edit-project-tab-content mt-4 mb-2 mx-3">
          <div
            role="tabpanel"
            aria-labelledby="edit-project-general-tab"
            style={{ display: tab === 0 ? undefined : "none" }}
          >
            <form
              id="edit-project-form"
              ref={generalFormRef}
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                saveProject(event.currentTarget);
              }}
            >
              <div className="mb-3 row required">
                <label htmlFor="slycat-edit-project-name" className="col-sm-2 col-form-label">
                  Name
                </label>
                <div className="col-sm-10">
                  <input
                    id="slycat-edit-project-name"
                    className="form-control"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                  <div className="invalid-feedback">Please enter a project name.</div>
                </div>
              </div>
              <div className="mb-3 row">
                <label htmlFor="slycat-edit-project-description" className="col-sm-2 col-form-label">
                  Description
                </label>
                <div className="col-sm-10">
                  <textarea
                    id="slycat-edit-project-description"
                    className="form-control"
                    rows={5}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  ></textarea>
                </div>
              </div>
            </form>
            <div className="mb-3 text-end">
              <button
                className="btn btn-danger"
                type="button"
                data-bs-dismiss="modal"
                onClick={deleteProjectCache}
              >
                Delete Project Media Cache
              </button>
            </div>
          </div>

          <div
            role="tabpanel"
            aria-labelledby="edit-project-permissions-tab"
            style={{ display: tab === 1 ? undefined : "none" }}
          >
            <div className="mb-3">
              <ProjectAclTable
                title={ACL_USERS_LABEL}
                kind="user"
                rows={aclUserRows(acl)}
                removable
                onRemove={removeProjectMember}
              />
            </div>

            <div className="mb-3">
              <form
                id="edit-project-members-form"
                ref={membersFormRef}
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  addProjectMember(event.currentTarget);
                }}
              >
                <div className="row g-2 align-items-start">
                  <div className="col">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder={SLYCAT_AUTH_LABELS.username}
                      value={newUser}
                      onChange={(event) => setNewUser(event.target.value)}
                      required
                    />
                    <div className="invalid-feedback">
                      Please enter a {SLYCAT_AUTH_LABELS.username.toLowerCase()}.
                    </div>
                  </div>
                  <div className="col-4">
                    <select
                      className="form-select form-select-sm"
                      value={permission}
                      onChange={(event) => setPermission(event.target.value as UserPermission)}
                    >
                      <option value="reader">Reader</option>
                      <option value="writer">Writer</option>
                      <option value="administrator">Administrator</option>
                    </select>
                  </div>
                  <div className="col-auto">
                    <button
                      className="btn btn-sm btn-primary"
                      type="button"
                      disabled={!newUser.trim()}
                      onClick={() => addProjectMember(membersFormRef.current)}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </form>
              {newUser.trim() ? (
                <p className="form-text text-center mt-1 mb-0">
                  {permissionDescription(permission)}
                </p>
              ) : null}
            </div>

            <hr className="my-4" />

            <div className="mb-3">
              <ProjectAclTable
                title={ACL_METAGROUPS_LABEL}
                kind="group"
                rows={aclMetagroupRows(acl)}
                removable
                onRemove={(name) => setAcl((prev) => removeMetagroupFromAcl(prev, name))}
              />
            </div>

            <div className="mb-3">
              <div className="mb-2">
                <input
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="Search metagroups..."
                  autoComplete="off"
                  value={metagroupSearch}
                  onChange={(event) => setMetagroupSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      if (selectedMetagroup) {
                        addProjectMetagroup(selectedMetagroup);
                      }
                      event.preventDefault();
                    }
                  }}
                />
              </div>

              {metagroupSearchResults.length > 0 ? (
                <div className="edit-project-metagroups-table-wrap mb-2">
                  <table className="edit-project-metagroups-table">
                    <thead>
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Owner</th>
                        <th scope="col" className="members-col">
                          <span className="members-box">Members</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {metagroupSearchResults.map((group) => (
                        <tr
                          key={group.name}
                          className={selectedMetagroup?.name === group.name ? "selected" : undefined}
                          onClick={() => setSelectedMetagroup(group)}
                          onDoubleClick={() => addProjectMetagroup(group)}
                        >
                          <td>{group.name}</td>
                          <td>{group.owner}</td>
                          <td className="members-col">
                            <span className="members-box">{group.memberCount}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {metagroupSearchHelper ? (
                <p className="form-text">
                  {metagroupSearchHelper}
                  {metagroupSearchLoading ? (
                    <span
                      className="spinner-border spinner-border-sm ms-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                  ) : null}
                </p>
              ) : null}

              <div className="row g-2 align-items-center justify-content-end mt-2">
                <div className="col-4">
                  <select
                    className="form-select form-select-sm"
                    value={metagroupPermission}
                    onChange={(event) =>
                      setMetagroupPermission(event.target.value as MetagroupPermission)
                    }
                  >
                    <option value="reader">Reader</option>
                    <option value="writer">Writer</option>
                  </select>
                </div>
                <div className="col-auto">
                  <button
                    className="btn btn-sm btn-primary"
                    type="button"
                    disabled={!selectedMetagroup}
                    onClick={() => addProjectMetagroup()}
                  >
                    Add
                  </button>
                </div>
              </div>
              {selectedMetagroup ? (
                <p className="form-text text-center mt-1 mb-0">
                  {metagroupPermissionDescription(metagroupPermission)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => saveProject(generalFormRef.current)}
        >
          Save Changes
        </button>
      </div>
    </>
  );
};

export default EditProject;

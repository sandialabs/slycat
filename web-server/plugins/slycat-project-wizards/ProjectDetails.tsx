/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import React from "react";
import ProjectAclTable, {
  ACL_METAGROUPS_LABEL,
  ACL_TABLE_LABEL,
  ACL_USERS_LABEL,
} from "./ProjectAclTable";
import {
  aclMetagroupRows,
  aclUserRows,
  normalizeAcl,
  type ProjectSnapshot,
} from "./projectAcl";

type ProjectDetailsProps = {
  project: ProjectSnapshot;
};

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project }) => {
  const acl = normalizeAcl(project.acl);

  return (
    <>
      <div className="modal-header">
        <h3 className="modal-title">Project Details</h3>
        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div className="modal-body">
        <div className="card mb-3">
          <div className="card-header">
            <strong>Name</strong>
          </div>
          <div className="card-body">
            <p id="slycat-edit-project-name">{project.name}</p>
          </div>
        </div>
        <div className="card mb-3">
          <div className="card-header">
            <strong>Description</strong>
          </div>
          <div className="card-body">
            <p>{project.description}</p>
          </div>
        </div>
        <div className="card mb-3">
          <div className="card-header">
            <strong>{ACL_TABLE_LABEL}</strong>
          </div>
          <div className="card-body">
            <ProjectAclTable
              title={ACL_USERS_LABEL}
              kind="user"
              rows={aclUserRows(acl)}
            />
            <div className="mt-3">
              <ProjectAclTable
                title={ACL_METAGROUPS_LABEL}
                kind="group"
                rows={aclMetagroupRows(acl)}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-primary" data-bs-dismiss="modal">
          Close
        </button>
      </div>
    </>
  );
};

export default ProjectDetails;

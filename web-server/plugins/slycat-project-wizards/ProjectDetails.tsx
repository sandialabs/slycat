/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import React from "react";
import ProjectAclChips from "./ProjectAclChips";
import { normalizeAcl, userNames, type ProjectSnapshot } from "./projectAcl";

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
            <strong>Members</strong>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-sm-12">
                <ProjectAclChips names={userNames(acl.administrators)} role="administrator" size="sm" />
                <ProjectAclChips names={userNames(acl.writers)} role="writer" size="sm" />
                <ProjectAclChips names={userNames(acl.readers)} role="reader" size="sm" />
              </div>
            </div>
          </div>
        </div>
        <div className="card mb-3">
          <div className="card-header">
            <strong>Metagroups</strong>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-sm-12">
                <ProjectAclChips names={acl.groups.writers} role="writer" size="sm" />
                <ProjectAclChips names={acl.groups.readers} role="reader" size="sm" />
              </div>
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

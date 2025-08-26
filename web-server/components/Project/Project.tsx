import server_root from "js/slycat-server-root";
import * as React from "react";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import styles from "./Projects.module.scss";

interface ProjectProps {
  name: string;
  id: string;
  description: string;
  creator: string;
  created: string;
}

/**
 * Delete a model, with a modal warning, given the name and model ID.
 */
const delete_project = (name: string, id: string, e: React.MouseEvent) => {
  // stop propagation of the click event
  e.stopPropagation();

  dialog.dialog({
    title: "Delete Project?",
    message: `The Project "${name}" and every model in the project will be deleted immediately. This action cannot be undone.`,
    buttons: [
      { className: "btn-light", label: "Cancel" },
      { className: "btn-danger", label: "Delete" },
    ],
    callback(button: any) {
      if (button?.label === "Delete") {
        client.delete_project({ pid: id, success: () => location.reload() });
      }
    },
  });
};

/**
 * react component for project info on the project list
 */
const Project: React.FC<ProjectProps> = ({ name, id, description, creator, created }) => {
  const project_href = server_root + "projects/" + id;

  const navigateToProject = () => {
    window.location.assign(project_href);
  };

  return (
    <div className={`card mb-4 shadow-sm ${styles.cursorPointer}`} onClick={navigateToProject}>
      <div className="card-body">
        <span className="float-end">
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            name={id}
            onClick={(e) => delete_project(name, id, e)}
            title="Delete this project"
          >
            <span className="fa fa-trash-o" />
          </button>
        </span>
        <a href={project_href} className="text-decoration-none" onClick={(e) => e.stopPropagation()}>
          <h5 className="card-title">{name}</h5>
        </a>

        {description && <p className="card-text">{description}</p>}
      </div>
      <div className="card-footer">
        <small className="text-body-secondary">
          Created <span>{new Date(created).toLocaleString()}</span> by{" "}
          <span>{creator}</span>
        </small>
      </div>
    </div>
  );
};

export default Project;

import server_root from "js/slycat-server-root";
import * as React from "react";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";

interface ProjectProps {
  name: string;
  id: string;
  description: string;
  creator: string;
  created: string;
}

/**
 * not used
 */
interface ProjectState {}

/**
 * Delete a model, with a modal warning, given the name and model ID.
 */
const delete_project = (name: string, id: string) => {
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
 *
 * @export default
 * @class Project
 * @extends {React.Component<ProjectProps, ProjectState>}
 */
export default class Project extends React.Component<ProjectProps, ProjectState> {
  render() {
    return (
      <div className="card mb-3">
        <div className="card-body">
          <span className="float-end">
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              name={this.props.id}
              onClick={() => delete_project(this.props.name, this.props.id)}
              title="Delete this project"
            >
              <span className="fa fa-trash-o" />
            </button>
          </span>
          <a href={server_root + "projects/" + this.props.id} className="text-decoration-none">
            <h5 className="card-title">{this.props.name}</h5>
          </a>

          {this.props.description && <p className="card-text">{this.props.description}</p>}
        </div>
        <div className="card-footer">
          <small className="text-body-secondary">
            Created <span>{this.props.created}</span> by <span>{this.props.creator}</span>
          </small>
        </div>
      </div>
    );
  }
}

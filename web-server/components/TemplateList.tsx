import React from "react";
import { createRoot } from "react-dom/client";
import * as dialog from "../js/slycat-dialog";
import client from "../js/slycat-web-client";
import ModelTypeBadge from "./Models/ModelTypeBadge";

export interface TemplateProps {
  id: string;
  project: string;
  name: string;
  created: string;
  creator: string;
  model_type: string;
}
const Template: React.FC<TemplateProps> = (props) => {
  const delete_template = () => {
    const templateId = props.id;
    const projectId = props.project;
    dialog.dialog({
      title: "Delete Template?",
      message: `The template "${props.name}" will be deleted immediately and there is no undo.  This will not affect any existing models.`,
      buttons: [
        { className: "btn-light", label: "Cancel" },
        { className: "btn-danger", label: "OK" },
      ],
      callback(button: any) {
        if (button?.label !== "OK") return;
        client.delete_reference({
          rid: templateId,
          success() {
            renderTemplates(projectId);
          },
          error: dialog.ajax_error("Couldn't delete template."),
        });
      },
    });
  };

  return (
    <div className="list-group-item py-3">
      <div className="d-flex flex-row align-items-baseline mb-1">
        <strong className="flex-fill">{props.name}</strong>
        <ModelTypeBadge modelType={props.model_type} className="ms-4 me-3" />
        <button
          type="button"
          className="btn btn-sm btn-outline-warning me-1"
          data-bind="click: $parent.edit_template"
        >
          <span className="fa fa-pencil"></span>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          name={props.id}
          onClick={() => delete_template()}
          title="Delete this template"
        >
          <span className="fa fa-trash-o" />
        </button>
      </div>
      <div className="d-flex flex-row mt-0 align-items-baseline">
        <small className="fst-italic text-body-secondary flex-fill">
          Created <span>{props.created}</span> by <span>{props.creator}</span>
        </small>
      </div>
    </div>
  );
};

/**
 * @param items list of item objects
 * @param type string type
 */
export interface TemplatesListProps {
  templates: any;
}

/**
 *
 * @param project_id string project id
 */
const renderTemplates = (project_id: string) => {
  // Create a React TemplatesList component after getting the list of templates in this project
  client.get_project_references({
    pid: project_id,
    success(result: any) {
      const templatesListJSX = <TemplatesList templates={result} />;
      const slycatTemplatesRoot = createRoot(
        document.getElementById("slycat-templates") as HTMLElement,
      );
      slycatTemplatesRoot.render(templatesListJSX);
    },
  });
};
const TemplatesList: React.FC<TemplatesListProps> = (props) => {
  const templates = props.templates
    .filter((reference: any) => {
      return reference.bid && !reference.mid;
    })
    .map((reference: any) => {
      return (
        <Template
          name={reference.name}
          key={reference._id}
          id={reference._id}
          created={reference.created}
          creator={reference.creator}
          model_type={reference["model-type"]}
          project={reference.project}
        />
      );
    });

  if (templates.length > 0) {
    return (
      <div className="container">
        <h3 className="mb-5">Templates</h3>
        <div className="card">
          <div className="list-group list-group-flush">{templates}</div>
        </div>
      </div>
    );
  }
  return null;
};

export { renderTemplates, TemplatesList };

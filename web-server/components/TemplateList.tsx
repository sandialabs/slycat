import React, { useState, useEffect } from "react";
import * as dialog from "../js/slycat-dialog";
import client from "../js/slycat-web-client";
import ModelTypeBadge from "./Models/ModelTypeBadge";
import Icon from "components/Icons/Icon";

export interface TemplateProps {
  id: string;
  project: string;
  name: string;
  created: string;
  creator: string;
  model_type: string;
  onRefresh: () => void;
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
        { className: "btn-danger", label: "Delete" },
      ],
      callback(button: any) {
        if (button?.label !== "Delete") return;
        client.delete_reference({
          rid: templateId,
          success() {
            props.onRefresh();
          },
          error: dialog.ajax_error("Couldn't delete template."),
        });
      },
    });
  };

  const edit_template = () => {
    console.log("Edit template");
    const templateId = props.id;
    const projectId = props.project;
    dialog.prompt({
      title: "Edit Template",
      value: props.name,
      buttons: [
        { className: "btn-light", label: "Cancel" },
        { className: "btn-primary", label: "Save" },
      ],
      callback: (button: any, valueIn: any) => {
        if (button?.label !== "Save") return;
        console.debug("Edit template", templateId, props.name);
        client.put_reference({
          rid: templateId,
          name: valueIn(),
          success: () => {
            props.onRefresh();
          },
          error: dialog.ajax_error("Couldn't edit template."),
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
          className="btn btn-sm btn-outline-primary me-1"
          name={props.id}
          onClick={() => edit_template()}
          title="Edit this template"
        >
          <Icon type="pencil" />
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          name={props.id}
          onClick={() => delete_template()}
          title="Delete this template"
        >
          <Icon type="trash-can" />
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
 * @param projectId string project id
 */
export interface TemplatesListProps {
  projectId: string;
}

const TemplatesList: React.FC<TemplatesListProps> = (props) => {
  const [templates, setTemplates] = useState<any[]>([]);

  const fetchTemplates = () => {
    client.get_project_references({
      pid: props.projectId,
      success(result: any) {
        setTemplates(result);
      },
      error() {
        console.log("Unable to retrieve project templates.");
      },
    });
  };

  useEffect(() => {
    fetchTemplates();
  }, [props.projectId]);

  const templateElements = templates
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
          onRefresh={fetchTemplates}
        />
      );
    });

  if (templateElements.length > 0) {
    return (
      <div className="container">
        <div className="accordion" id="templates-accordion">
          <div className="accordion-item">
            <h2 className="accordion-header">
              <button
                className="accordion-button collapsed fs-3 fw-medium"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#templates"
                aria-expanded="false"
                aria-controls="templates"
              >
                Templates
              </button>
            </h2>
            <div
              id="templates"
              className="accordion-collapse collapse"
              data-bs-parent="#templates-accordion"
            >
              <div className="accordion-body p-0">
                <div className="list-group list-group-flush">{templateElements}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export { TemplatesList };

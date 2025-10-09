import React from "react";
import server_root from "js/slycat-server-root";
import MarkingsBadge from "components//MarkingsBadge";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import styles from "./Models.module.scss";
import ModelTypeBadge from "./ModelTypeBadge";
import Icon from "components/Icons/Icon";

interface ModelProps {
  markings: any[];
  marking: any;
  id: string;
  model_type: string;
  name: string;
  result: any;
  message: string;
  description: string;
  created: string;
  creator: string;
}

/**
 * Delete a model, with a modal warning, given the name and model ID.
 */
const delete_model = (name: string, id: string, e: React.MouseEvent) => {
  e.stopPropagation();
  dialog.dialog({
    title: "Delete Model?",
    message: `The model "${name}" will be deleted immediately. This action cannot be undone.`,
    buttons: [
      { className: "btn-light", label: "Cancel" },
      { className: "btn-danger", label: "Delete" },
    ],
    callback(button: any) {
      if (button?.label === "Delete") {
        client.delete_model({ mid: id, success: () => location.reload() });
      }
    },
  });
};
/**
 * Takes a json object of a model and create a model list JSX element from that data and returns it
 * @param props a model json meta data
 * @returns JSX model for the model list
 */
const Model: React.FC<ModelProps> = ({
  markings,
  marking,
  id,
  model_type,
  name,
  result,
  message,
  description,
  created,
  creator,
}) => {
  const recognized_marking = markings.find((obj) => obj.type == marking);
  const model_href = server_root + "models/" + id;

  const navigateToModel = () => {
    window.location.assign(model_href);
  };

  return (
    <div className="col">
      <div
        className={`card h-100 rounded-0 shadow-sm ${styles.cursorPointer}`}
        onClick={navigateToModel}
      >
        <MarkingsBadge marking={marking} recognized_marking={recognized_marking} />
        <div className="card-body">
          <ModelTypeBadge modelType={model_type} className="mt-1 mb-2 ms-3 float-end" />
          <a
            href={model_href}
            className="text-decoration-none"
            onClick={(e) => e.stopPropagation()}
          >
            <h5 className="card-title">{name}</h5>
          </a>

          {description && <p className="card-text">{description}</p>}
        </div>

        {result == "failed" && (
          <span className="badge rounded-pill text-bg-danger" title={message}>
            Failed
          </span>
        )}

        <div className="card-footer d-flex flex-row align-items-center">
          <small className="fst-italic text-body-secondary flex-fill">
            Created <span>{new Date(created).toLocaleString()}</span>
            <br />
            by <span>{creator}</span>
          </small>
          <span>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              name={id}
              onClick={(e) => delete_model(name, id, e)}
              title="Delete this model"
            >
              <Icon type="trash-can" />
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};
export default Model;

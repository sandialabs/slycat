import React from "react";
import server_root from "js/slycat-server-root";
import model_names from "js/slycat-model-names";
import MarkingsBadge from "./MarkingsBadge";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";

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
const delete_model = (name: string, id: string) => {
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
const Model = (props: ModelProps) => {
  let recognized_marking = props.markings.find((obj) => obj.type == props.marking);
  const cssClasses = `list-group-item list-group-item-action 
        ${recognized_marking === undefined ? "list-group-item-warning" : ""}`;
  return (
    <div className="col">
      <div className="card h-100 rounded-0 shadow-sm">
        <MarkingsBadge marking={props.marking} recognized_marking={recognized_marking} />
        <div className="card-body">
          <span className="float-end ms-3">
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              name={props.id}
              onClick={() => delete_model(props.name, props.id)}
              title="Delete this model"
            >
              <span className="fa fa-trash-o" />
            </button>
          </span>

          <a href={server_root + "models/" + props.id} className="text-decoration-none">
            <h5 className="card-title">{props.name}</h5>
          </a>

          {props.description && <p className="card-text">{props.description}</p>}
        </div>

        {props.result == "failed" && (
          <span className="badge text-bg-danger" title={props.message}>
            Failed
          </span>
        )}

        <div className="card-footer">
          <span className="badge text-bg-primary text-capitalize ms-3 float-end">
            {model_names.translate_model_type(props.model_type)}
          </span>
          <small className="text-body-secondary">
            Created <span>{props.created}</span>
            <br />
            by <span>{props.creator}</span>
          </small>
        </div>
      </div>
    </div>
  );
};
export default Model;

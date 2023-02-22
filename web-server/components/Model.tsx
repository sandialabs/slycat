import React from "react";
import server_root from "./../js/slycat-server-root";
import model_names from "./../js/slycat-model-names";
import MarkingsBadge from "./MarkingsBadge";

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
 * Takes a json object of a model and create a model list JSX element from that data and returns it
 * @param props a model json meta data
 * @returns JSX model for the model list
 */
const Model = (props: ModelProps) => {
    let recognized_marking = props.markings.find((obj) => obj.type == props.marking);const cssClasses = `list-group-item list-group-item-action 
        ${recognized_marking === undefined ? "list-group-item-warning" : ""}`
    return (
        <a 
            className={cssClasses}
            href={server_root + "models/" + props.id}
        >
            <div className='h6'>
                <span className='badge badge-secondary mr-1'>
                {model_names.translate_model_type(props.model_type) + " model"}
                </span>
                &nbsp;
                <strong>{props.name}</strong>
            </div>
            <MarkingsBadge marking={props.marking} recognized_marking={recognized_marking} />
            {props.result == "failed" && (
                <span className='badge badge-danger' title={props.message}>
                Failed
                </span>
            )}
            <p className='mb-2'>{props.description}</p>
            <small>
                <em>
                Created <span>{props.created}</span> by <span>{props.creator}</span>
                </em>
            </small>
        </a>
    );
}
export default Model;
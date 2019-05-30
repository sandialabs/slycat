'use strict';
import server_root from "js/slycat-server-root";
import * as React from 'react';

/**
 * @member warning_element the warning element
 * @member selectedNameIndex the marking element from the server
 * @member project_id string id of the project
 */
export interface UnrecognizedMarkingWarningProps { 
  warning_element: Element
  marking: Element
  project_id:string
}

/**
 * not used
 */
export interface UnrecognizedMarkingWarningState {
}

/**
 * class that promps that a marking was not recognized
 */
export default class UnrecognizedMarkingWarning extends React.Component<UnrecognizedMarkingWarningProps, UnrecognizedMarkingWarningState> {
  /**
   * not used
   */
  public constructor(props:UnrecognizedMarkingWarningProps) {
    super(props)
    this.state = {}
  }

  /**
   * Hide the overlay that is covering up the model
   *
   * @memberof UnrecognizedMarkingWarning
   */
  showModel = (): void =>
  {
    this.props.warning_element.setAttribute('class', 'invisible');
  }

  render () {
    return (
      <div className="card mt-5 mx-5">
        <div className="card-header bg-warning text-center">
          <h4 className="card-title mb-0">Unrecognized Marking</h4>
        </div>
        <div className="card-body bg-light text-center">
          <p className="card-text">This model has a marking that is not recognized.</p>
          {this.props.marking &&
            <p className="mb-0"><code>{this.props.marking}</code></p>
          }
          {/* 
          <p className="mb-0">Choose one of the options below.</p>
          */}
        </div>
        <ul className="list-group list-group-flush">
          <li className="list-group-item pb-3">
            <h5>Edit Marking to Display Model</h5>
            <p>
              If you wish to edit this model's marking and then display it:
            </p>

            <ol className="mb-4">
              <li>Click the <strong className="text-nowrap">Edit</strong> dropdown button at the top of the page.</li>
              <li>Select <strong className="text-nowrap">Model Name & Info</strong>.</li>
              <li>Choose a new marking.</li>
              <li>Click the <strong className="text-nowrap">Save Changes</strong> button.</li>
            </ol>

            <div className="alert alert-warning mb-0" role="alert">
              The model will display immediately after you choose the new marking and click the <strong className="text-nowrap">Save Changes</strong> button.
            </div>
          </li>
          <li className="list-group-item pb-3">
            {/*
            <h5>Go Back To Project</h5>
            <p>If you do not wish to view this model, you can go back to the project.</p>
            */}
            <a href={`${server_root}projects/${this.props.project_id}`} 

            >&larr; Go back to project</a>
          </li>
          {/*
          <li className="list-group-item pb-3">
            <h5>Display Model Now</h5>
            <p>If you wish to view this model now, you can display it even with its unrecognized marking.</p>
            <button type="button" className="btn btn-danger" 
              onClick={this.showModel}>
              Display Model Now
            </button>
          </li>
          */}
        </ul>
      </div>
    );
  }
}
import React from "react";
import server_root from "js/slycat-server-root";

let UnrecognizedMarkingWarning = (params) =>
{
  function showModel()
  {
    // Hide the overlay that is covering up the model
    params.warning_element.setAttribute('class', 'invisible');
  }

  return (
    <div className="card mt-5 mx-5">
      <div className="card-header bg-warning text-center">
        <h4 className="card-title mb-0">Warning</h4>
      </div>
      <div className="card-body bg-light text-center">
        <h5 className="card-title">Unrecognized Marking</h5>
        <p className="card-text">This model has a marking that is not recognize.</p>
        {params.marking &&
          <p><code>{params.marking}</code></p>
        }
        <p className="mb-0">Choose one of the options below.</p>
      </div>
      <ul className="list-group list-group-flush">
        <li className="list-group-item pb-3">
          <h5>Go Back To Project</h5>
          <p>If you do not wish to view this model, you can go back to the project.</p>
          <a href={`${server_root}projects/${params.project_id}`} className="btn btn-primary">Go Back To Project</a>
        </li>
        <li className="list-group-item pb-3">
          <h5>Edit Marking & Display Model</h5>
          <p>
            If you wish to edit this model's marking and then display it:
          </p>

          <ol className="mb-4">
            <li>Click the <strong className="text-nowrap">Edit</strong> menu above.</li>
            <li>Select <strong className="text-nowrap">Model Name & Info</strong>.</li>
            <li>Choose a new marking.</li>
            <li>Click the <strong className="text-nowrap">Save Changes</strong> button.</li>
          </ol>

          <div className="alert alert-warning mb-0" role="alert">
            The model will display immediately after you choose the new marking and click the <strong className="text-nowrap">Save Changes</strong> button.
          </div>
        </li>
        <li className="list-group-item pb-3">
          <h5>Display Model Now</h5>
          <p>If you wish to view this model now, you can display it even with its unrecognized marking.</p>
          <button type="button" className="btn btn-danger" 
            onClick={showModel}>
            Display Model Now
          </button>
        </li>
      </ul>
    </div>
  )
}

export default UnrecognizedMarkingWarning;
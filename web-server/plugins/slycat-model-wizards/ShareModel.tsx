import React from "react";

/**
 * ShareModel component for the Share Model dialog
 */
const ShareModel: React.FC = () => {
  return (
    <>
      <div className="modal-header">
        <h3 className="modal-title">Share Model</h3>
        <button type="button" className="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div className="modal-body">
        <p className="lead">This is the new share model page by Alex.</p>
      </div>
      <div className="modal-footer">
        <button className="btn btn-primary" data-dismiss="modal">
          Close
        </button>
      </div>
    </>
  );
};

export default ShareModel;

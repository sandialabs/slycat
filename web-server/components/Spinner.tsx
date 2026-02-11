import * as React from "react";

/**
 * functional component that renders a centered spinner
 */

export default function Spinner() {
  return (
    <div className="d-flex justify-content-center mt-4">
      <div className="spinner-border" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
}

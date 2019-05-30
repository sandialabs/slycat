import React from "react";

class Spinner extends React.Component {
  render() {
    return (
    	<div className="d-flex justify-content-center mt-4">
        <div className="spinner-border" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }
}

export { Spinner };

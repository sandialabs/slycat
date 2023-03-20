import React from "react";

type Props = {
  modelId: string;
};

export const Table: React.FC<Props> = (props) => {
  const { modelId } = props;

  return (
    <div id="table-pane" className="ui-layout-south" style={{ overflow: "auto" }}>
      <div className="load-status"></div>
      <div id="table"></div>
    </div>
  );
};

export default Table;

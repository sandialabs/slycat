import React from "react";
import SlycatSlickgrid from "components/SlycatSlickgrid";
import { GridOption, Column } from "slickgrid";
import { useSelector } from "react-redux";
import { selectTablePaneHeight, selectTablePaneWidth } from "../features/table/tableSlice";

type PSTableProps = {};

const PSTable: React.FC<PSTableProps> = (props) => {
  const table_pane_width = useSelector(selectTablePaneWidth);
  const table_pane_height = useSelector(selectTablePaneHeight);

  var columns: Column[] = [
    { id: "title", name: "Title", field: "title" },
    { id: "duration", name: "Duration", field: "duration" },
    { id: "%", name: "% Complete", field: "percentComplete", width: 90 },
    { id: "start", name: "Start", field: "start" },
    { id: "finish", name: "Finish", field: "finish" },
    { id: "effort-driven", name: "Effort Driven", field: "effortDriven", width: 90 },
  ];

  var options: GridOption = {
    // enableCellNavigation: true,
    // enableColumnReorder: false
  };

  var data = [];
  for (var i = 0; i < 500; i++) {
    data[i] = {
      title: "Task " + i,
      duration: "5 days",
      percentComplete: Math.round(Math.random() * 100),
      start: "01/01/2009",
      finish: "01/05/2009",
      effortDriven: i % 5 == 0,
    };
  }

  return !options ? (
    false
  ) : (
    <SlycatSlickgrid
      gridId="pstable"
      columnDefinitions={columns}
      gridOptions={options}
      dataset={data}
      width={table_pane_width}
      height={table_pane_height}
    />
  );
};

export default PSTable;

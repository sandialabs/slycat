import React, { useEffect, useRef } from "react";
import { SlickGrid, GridOption, Column } from "slickgrid";

type SlycatSlickgridProps = {
  gridId: string;
  gridOptions: GridOption;
  columnDefinitions: Column[];
  dataset: any[];
  width: number;
  height: number;
};

const SlycatSlickgrid: React.FC<SlycatSlickgridProps> = (props) => {
  const { gridId, columnDefinitions, gridOptions, dataset, width, height } = props;
  const gridRef = useRef<SlickGrid | null>(null);

  // This effect creates the grid using SlickGrid.
  useEffect(() => {
    gridRef.current = new SlickGrid(`#${gridId}`, dataset, columnDefinitions, gridOptions);

    return () => {
      gridRef.current?.destroy();
    };
  }, []);

  // This effect handles resizing the grid when width or height changes
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.resizeCanvas();
      gridRef.current.autosizeColumns();
    }
  }, [width, height]);

  return <div id={gridId} style={{ width, height }} />;
};

export default SlycatSlickgrid;

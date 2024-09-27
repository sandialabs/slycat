import React from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  toggleShowGrid,
  selectShowGrid,
} from "plugins/slycat-parameter-image/js/features/scatterplot/scatterplotSlice";

const ScatterplotOptionsGrid: React.FC = () => {
  const dispatch = useDispatch();
  const select_show_grid = useSelector(selectShowGrid);

  const handleShowGridChange = () => {
    dispatch(toggleShowGrid());
  };

  return (
    <div className="form-check">
      <input
        className="form-check-input"
        type="checkbox"
        value=""
        id="showGrid"
        checked={select_show_grid}
        onChange={handleShowGridChange}
      />
      <label className="form-check-label" htmlFor="showGrid">
        Show Background Grid
      </label>
    </div>
  );
};

export default ScatterplotOptionsGrid;

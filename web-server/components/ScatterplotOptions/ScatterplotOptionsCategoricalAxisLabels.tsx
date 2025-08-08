import React from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  toggleHideLabels,
  selectHideLabels,
  selectHorizontalSpacing,
  selectVerticalSpacing,
  setHorizontalSpacing,
  setVerticalSpacing,
  DEFAULT_HORIZONTAL_SPACING,
  MIN_HORIZONTAL_SPACING,
  MAX_HORIZONTAL_SPACING,
  HORIZONTAL_SPACING_STEP,
  DEFAULT_VERTICAL_SPACING,
  MIN_VERTICAL_SPACING,
  MAX_VERTICAL_SPACING,
  VERTICAL_SPACING_STEP,
} from "plugins/slycat-parameter-image/js/scatterplotSlice";
import { SlycatNumberInputWithReset } from "./SlycatNumberInputWithReset";

export const CATEGORICAL_AXIS_LABELS_WARNING =
  "Hide Some Categorical Axis Labels To Increase Readability";
export const CATEGORICAL_AXIS_LABELS_POPOVER_TITLE = "Warning";
export const CATEGORICAL_AXIS_LABELS_POPOVER_CONTENT =
  "Some axis labels are hidden to increase readability.";

const ScatterplotOptionsCategoricalAxisLabels: React.FC = () => {
  const dispatch = useDispatch();
  const select_hide_labels = useSelector(selectHideLabels);
  const horizontal_spacing = useSelector(selectHorizontalSpacing);
  const vertical_spacing = useSelector(selectVerticalSpacing);

  const disabled_class = !select_hide_labels ? "text-muted" : "";

  const handleHideLabelsChange = () => {
    dispatch(toggleHideLabels());
  };

  const handleHorizontalSpacingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setHorizontalSpacing(Number(event.currentTarget.value)));
  };

  const handleVerticalSpacingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setVerticalSpacing(Number(event.currentTarget.value)));
  };

  return (
    <>
      <div className="form-inline">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            value=""
            id="hideLabels"
            checked={select_hide_labels}
            onChange={handleHideLabelsChange}
          />
          <label className="form-check-label" htmlFor="hideLabels">
            {CATEGORICAL_AXIS_LABELS_WARNING}
          </label>
        </div>
      </div>

      <table className={`table table-borderless mt-4 ms-3 w-auto`} role="grid">
        <thead>
          <tr>
            <td className={`pb-0 pe-3 ${disabled_class}`} />
            <th className={`pb-0 pe-3 ${disabled_class}`} scope="col">
              Horizontal
            </th>
            <th className={`pb-0 pe-3 ${disabled_class}`} scope="col">
              Vertical
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="align-middle">
            <th className={`pe-5 ${disabled_class}`} scope="row">
              Categorical Axis Label Spacing
            </th>
            <td className="pe-3">
              <SlycatNumberInputWithReset
                name={"horizontal_spacing"}
                value={horizontal_spacing}
                default_value={DEFAULT_HORIZONTAL_SPACING}
                min_value={MIN_HORIZONTAL_SPACING}
                max_value={MAX_HORIZONTAL_SPACING}
                step={HORIZONTAL_SPACING_STEP}
                handle_change={handleHorizontalSpacingChange}
                title_reset="Reset spacing of horizontal labels to default"
                disabled={!select_hide_labels}
              />
            </td>
            <td className="pe-3">
              <SlycatNumberInputWithReset
                name={"vertical_spacing"}
                value={vertical_spacing}
                default_value={DEFAULT_VERTICAL_SPACING}
                min_value={MIN_VERTICAL_SPACING}
                max_value={MAX_VERTICAL_SPACING}
                step={VERTICAL_SPACING_STEP}
                handle_change={handleVerticalSpacingChange}
                title_reset="Reset border width of vertical labels to default"
                disabled={!select_hide_labels}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
};

export default ScatterplotOptionsCategoricalAxisLabels;

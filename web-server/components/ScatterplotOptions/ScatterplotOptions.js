import React from "react";
import { connect } from "react-redux";
import {
  setUnselectedPointSize,
  setUnselectedBorderSize,
  setSelectedPointSize,
  setSelectedBorderSize,
  setScatterplotMargin,
} from "plugins/slycat-parameter-image/js/actions";
import styles from "./slycat-scatterplot-options.module.scss";
import ScatterplotOptionsGrid from "./ScatterplotOptionsGrid";
import ScatterplotOptionsSyncScaling from "./ScatterplotOptionsSyncScaling";
import ScatterplotOptionsCategoricalAxisLabels from "./ScatterplotOptionsCategoricalAxisLabels";
import { SlycatNumberInputWithReset } from "./SlycatNumberInputWithReset";

export const DEFAULT_UNSELECTED_POINT_SIZE = 8;
export const MIN_UNSELECTED_POINT_SIZE = 1;
export const MAX_UNSELECTED_POINT_SIZE = 40;
export const DEFAULT_UNSELECTED_BORDER_SIZE = 1;
export const MIN_UNSELECTED_BORDER_SIZE = 0;
// Doesn't make sense for thicker border than half of point size
// because it's all border by then.
export const MAX_UNSELECTED_BORDER_SIZE = MAX_UNSELECTED_POINT_SIZE / 2 - 0.5;

export const DEFAULT_SELECTED_POINT_SIZE = 16;
export const MIN_SELECTED_POINT_SIZE = 2;
export const MAX_SELECTED_POINT_SIZE = 80;
export const DEFAULT_SELECTED_BORDER_SIZE = 2;
export const MIN_SELECTED_BORDER_SIZE = 0;
// Doesn't make sense for thicker border than half of point size
// because it's all border by then.
export const MAX_SELECTED_BORDER_SIZE = MAX_SELECTED_POINT_SIZE / 2 - 0.5;

export const POINT_SIZE_STEP = 1;
export const BORDER_SIZE_STEP = 0.1;

export const DEFAULT_SCATTERPLOT_MARGIN_TOP = 25;
export const DEFAULT_SCATTERPLOT_MARGIN_RIGHT = 300;
export const DEFAULT_SCATTERPLOT_MARGIN_BOTTOM = 25;
export const DEFAULT_SCATTERPLOT_MARGIN_LEFT = 350;

export const MIN_MARGIN = 0;
export const MAX_MARGIN = 9999;
export const MARGIN_STEP = 1;

class ScatterplotOptions extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {};
  }

  handleMarginChange = (event) => {
    this.props.setScatterplotMargin({
      [event.currentTarget.name]: event.currentTarget.value,
    });
  };

  render() {
    return (
      <div className={`${styles.slycatScatterplotOptions} ${this.props.uniqueID}`}>
        <table className={`table table-borderless mt-4 w-auto`} role="grid">
          <thead>
            <tr>
              <td className={`pb-0 pe-3`} />
              <th className={`pb-0 pe-3`} scope="col">
                Point Size
              </th>
              <th className={`pb-0 pe-3`} scope="col">
                Border Width
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="align-middle">
              <th className={`ps-0 pe-5`}>Unselected Points</th>
              <td className="pe-3">
                <SlycatNumberInputWithReset
                  value={this.props.unselected_point_size}
                  default_value={DEFAULT_UNSELECTED_POINT_SIZE}
                  min_value={MIN_UNSELECTED_POINT_SIZE}
                  max_value={MAX_UNSELECTED_POINT_SIZE}
                  step={POINT_SIZE_STEP}
                  handle_change={this.props.setUnselectedPointSize}
                  title_reset="Reset size of unselected points to default"
                />
              </td>
              <td className="pe-3">
                <SlycatNumberInputWithReset
                  value={this.props.unselected_border_size}
                  default_value={DEFAULT_UNSELECTED_BORDER_SIZE}
                  min_value={MIN_UNSELECTED_BORDER_SIZE}
                  max_value={MAX_UNSELECTED_BORDER_SIZE}
                  step={BORDER_SIZE_STEP}
                  handle_change={this.props.setUnselectedBorderSize}
                  title_reset="Reset border width of unselected points to default"
                />
              </td>
            </tr>
            <tr className="align-middle">
              <th className={`ps-0 pe-5`}>Selected Points</th>
              <td className="pe-3">
                <SlycatNumberInputWithReset
                  value={this.props.selected_point_size}
                  default_value={DEFAULT_SELECTED_POINT_SIZE}
                  min_value={MIN_SELECTED_POINT_SIZE}
                  max_value={MAX_SELECTED_POINT_SIZE}
                  step={POINT_SIZE_STEP}
                  handle_change={this.props.setSelectedPointSize}
                  title_reset="Reset size of selected points to default"
                />
              </td>
              <td className="pe-3">
                <SlycatNumberInputWithReset
                  value={this.props.selected_border_size}
                  default_value={DEFAULT_SELECTED_BORDER_SIZE}
                  min_value={MIN_SELECTED_BORDER_SIZE}
                  max_value={MAX_SELECTED_BORDER_SIZE}
                  step={BORDER_SIZE_STEP}
                  handle_change={this.props.setSelectedBorderSize}
                  title_reset="Reset border width of selected points to default"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <hr className="mt-4 mb-4" />
        <div className="slycat-plot-margins row g-4 align-items-baseline">
          <div className="col-auto">
            <label className="form-label">Margins</label>
          </div>
          <div className="col-auto">
            <SlycatNumberInputWithReset
              name={"top"}
              label="Top"
              value={this.props.scatterplot_margin_top}
              default_value={DEFAULT_SCATTERPLOT_MARGIN_TOP}
              min_value={MIN_MARGIN}
              step={MARGIN_STEP}
              handle_change={this.handleMarginChange}
              title_reset="Reset size of top plot margin to default"
            />
          </div>
          <div className="col-auto">
            <SlycatNumberInputWithReset
              name={"left"}
              label="Left"
              value={this.props.scatterplot_margin_left}
              default_value={DEFAULT_SCATTERPLOT_MARGIN_LEFT}
              min_value={MIN_MARGIN}
              step={MARGIN_STEP}
              handle_change={this.handleMarginChange}
              title_reset="Reset size of left plot margin to default"
            />
          </div>
          <div className="col-auto">
            <SlycatNumberInputWithReset
              name={"right"}
              label="Right"
              value={this.props.scatterplot_margin_right}
              default_value={DEFAULT_SCATTERPLOT_MARGIN_RIGHT}
              min_value={MIN_MARGIN}
              step={MARGIN_STEP}
              handle_change={this.handleMarginChange}
              title_reset="Reset size of right plot margin to default"
            />
          </div>
          <div className="col-auto">
            <SlycatNumberInputWithReset
              name={"bottom"}
              label="Bottom"
              value={this.props.scatterplot_margin_bottom}
              default_value={DEFAULT_SCATTERPLOT_MARGIN_BOTTOM}
              min_value={MIN_MARGIN}
              step={MARGIN_STEP}
              handle_change={this.handleMarginChange}
              title_reset="Reset size of bottom plot margin to default"
            />
          </div>
          <table className={`table table-borderless text-center mt-4 ms-3 w-auto`} role="grid">
            <tbody>
              <tr>
                <td className={`pb-0 pe-3`} />
                <th className={`pb-0 pe-3`} scope="col">
                  Top
                </th>
                <td className={`pb-0 pe-3`} />
              </tr>
              <tr>
                <td className={`pb-0 pe-3`} />
                <td className={`pb-0 pe-3`}>
                  <SlycatNumberInputWithReset
                    name={"top"}
                    value={this.props.scatterplot_margin_top}
                    default_value={DEFAULT_SCATTERPLOT_MARGIN_TOP}
                    min_value={MIN_MARGIN}
                    step={MARGIN_STEP}
                    handle_change={this.handleMarginChange}
                    title_reset="Reset size of top plot margin to default"
                  />
                </td>
                <td className={`pb-0 pe-3`} />
              </tr>
              <tr>
                <th className={`pb-0 pe-3`}>Left</th>
                <td className={`pb-0 pe-3`} />
                <th className={`pb-0 pe-3`}>Right</th>
              </tr>
              <tr>
                <td className={`pb-0 pe-3`}>
                  <SlycatNumberInputWithReset
                    name={"left"}
                    value={this.props.scatterplot_margin_left}
                    default_value={DEFAULT_SCATTERPLOT_MARGIN_LEFT}
                    min_value={MIN_MARGIN}
                    step={MARGIN_STEP}
                    handle_change={this.handleMarginChange}
                    title_reset="Reset size of left plot margin to default"
                  />
                </td>
                <td className={`pb-0 pe-3`}></td>
                <td className={`pb-0 pe-3`}>
                  <SlycatNumberInputWithReset
                    name={"right"}
                    value={this.props.scatterplot_margin_right}
                    default_value={DEFAULT_SCATTERPLOT_MARGIN_RIGHT}
                    min_value={MIN_MARGIN}
                    step={MARGIN_STEP}
                    handle_change={this.handleMarginChange}
                    title_reset="Reset size of right plot margin to default"
                  />
                </td>
              </tr>
              <tr>
                <td className={`pb-0 pe-3`} />
                <th className={`pb-0 pe-3`} scope="col">
                  Bottom
                </th>
                <td className={`pb-0 pe-3`} />
              </tr>
              <tr>
                <td className={`pb-0 pe-3`} />
                <td className={`pb-0 pe-3`}>
                  <SlycatNumberInputWithReset
                    name={"bottom"}
                    value={this.props.scatterplot_margin_bottom}
                    default_value={DEFAULT_SCATTERPLOT_MARGIN_BOTTOM}
                    min_value={MIN_MARGIN}
                    step={MARGIN_STEP}
                    handle_change={this.handleMarginChange}
                    title_reset="Reset size of bottom plot margin to default"
                  />
                </td>
                <td className={`pb-0 pe-3`} />
              </tr>
            </tbody>
          </table>
        </div>
        <hr className="mt-4 mb-4" />
        <ScatterplotOptionsGrid />
        <ScatterplotOptionsSyncScaling />
        <hr className="mt-4 mb-4" />
        <div className="slycat-scatterplot-categorical-axis-labels">
          <ScatterplotOptionsCategoricalAxisLabels />
        </div>
      </div>
    );
  }
}

export class SlycatNumberInputWithReset extends React.Component {
  render() {
    return (
      <div className="input-group input-group-sm w-auto d-inline-flex slycat-component-SlycatNumberInput">
        <input
          type="number"
          name={this.props.name}
          className={`form-control form-control-sm 
            ${this.props.value != this.props.default_value ? "edited" : ""}`}
          min={this.props.min}
          max={this.props.max}
          step={this.props.step}
          value={this.props.value}
          onChange={this.props.handle_change}
          disabled={this.props.disabled}
        />
        <button
          className="btn btn-outline-secondary"
          type="button"
          name={`${this.props.name}_reset`}
          title={this.props.title_reset}
          value={this.props.default_value}
          disabled={this.props.disabled || this.props.value == this.props.default_value}
          onClick={this.props.handle_change}
        >
          <FontAwesomeIcon icon={faUndo} />
        </button>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    unselected_point_size: state.unselected_point_size,
    unselected_border_size: state.unselected_border_size,
    selected_point_size: state.selected_point_size,
    selected_border_size: state.selected_border_size,
    scatterplot_margin_top: state.scatterplot_margin.top,
    scatterplot_margin_right: state.scatterplot_margin.right,
    scatterplot_margin_bottom: state.scatterplot_margin.bottom,
    scatterplot_margin_left: state.scatterplot_margin.left,
  };
};

export default connect(mapStateToProps, {
  setUnselectedPointSize,
  setUnselectedBorderSize,
  setSelectedPointSize,
  setSelectedBorderSize,
  setScatterplotMargin,
})(ScatterplotOptions);

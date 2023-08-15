import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import slycat_color_maps from "js/slycat-color-maps";
import PlotGrid from "./PlotGrid";
import Histogram from "./Histogram";
import PlotBackground from "./PlotBackground";
import {
  ValueIndexType,
  selectColormap,
  selectXScale,
  selectXTicks,
  selectYTicks,
  selectYScaleRange,
  selectXLabelX,
  X_LABEL_VERTICAL_OFFSET,
  selectXColumnName,
  Y_LABEL_HORIZONTAL_OFFSET,
  selectYLabelY,
  selectXHasCustomRange,
  selectXValuesAndIndexes,
  selectXValuesAndIndexesWithoutHidden,
  selectXColumnType,
} from "../selectors";
import {
  selectShowHistogram,
  selectUnselectedBorderSize,
  selectSelectedBorderSize,
  selectFontSize,
  selectFontFamily,
  selectShowGrid,
  selectAutoScale,
} from "../scatterplotSlice";
import {
  setSelectedSimulations,
  selectSelectedSimulations,
  selectSelectedSimulationsWithoutHidden,
} from "../dataSlice";
import * as d3 from "d3v7";
import _ from "lodash";

// This wrapper is here only to hide and show the histogram based on selectShowHistogram selector.
// This should really be done in the parent component, but currently there is no parent
// React component because we are still using legacy code to render the histogram.
// This simple logic can't be moved into PSHistogram because it would require all the hooks
// to be executed even when the histogram is hidden, which is a potential performance issue.
const PSHistogramWrapper: React.FC = () => {
  const show_histogram = useSelector(selectShowHistogram);
  // Only render the component if show_histogram is true
  if (!show_histogram) {
    return null;
  }
  return <PSHistogram />;
};

export default PSHistogramWrapper;

type PSHistogramProps = {};

const PSHistogram: React.FC<PSHistogramProps> = (props) => {
  const dispatch = useDispatch();
  // Making a copy of the x_scale to avoid mutating the selector since we will be modifying the scale's domain
  const x_scale = useSelector(selectXScale).copy();
  const colormap = useSelector(selectColormap);
  const y_scale_range = useSelector(selectYScaleRange);
  const x_ticks = useSelector(selectXTicks);
  const y_ticks = useSelector(selectYTicks);
  const x_values_and_indexes = useSelector(selectXValuesAndIndexes);
  const x_values_and_indexes_without_hidden = useSelector(selectXValuesAndIndexesWithoutHidden);
  const histogram_bar_stroke_width = useSelector(selectUnselectedBorderSize);
  // Doubling size of selected points border width because histogram bars are generally much large
  // and need a thicker border to stand out from the unselected bars.
  const histogram_bar_selected_stroke_width = useSelector(selectSelectedBorderSize) * 2;
  const font_size = useSelector(selectFontSize);
  const font_family = useSelector(selectFontFamily);
  const x_label_y = X_LABEL_VERTICAL_OFFSET;
  const x_label_x = useSelector(selectXLabelX);
  const x_name = useSelector(selectXColumnName);
  const x_column_type = useSelector(selectXColumnType);
  const y_label_y = useSelector(selectYLabelY);
  const show_grid = useSelector(selectShowGrid);
  const plot_grid_color = slycat_color_maps.get_plot_grid_color(colormap);
  const histogram_bar_color = slycat_color_maps.get_histogram_bar_color(colormap);
  const background = slycat_color_maps.get_background(colormap).toString();
  const x_has_custom_range = useSelector(selectXHasCustomRange);
  const auto_scale = useSelector(selectAutoScale);
  const selected_simulations = useSelector(selectSelectedSimulations);
  const selected_simulations_without_hidden = useSelector(selectSelectedSimulationsWithoutHidden);

  // Declare a local state to keep track of selected_simulations_without_hidden
  // to be able to compare it to the current value of selected_simulations_without_hidden
  // since we need to know which are new to flash them in the histogram.
  const [
    selectedSimulationsWithoutHiddenLocalState,
    setSelectedSimulationsWithoutHiddenLocalState,
  ] = useState<number[]>(selected_simulations_without_hidden);
  // Local state for flashBinIndexes to be able to flash bins for newly selected simulations.
  const [flashBinIndexes, setFlashBinIndexes] = useState<number[]>([]);

  const handleBackgroundClick = (event: React.MouseEvent) => {
    // If neither the meta key nor ctrl key was pressed during the click event, deselect all simulations
    if (!(event.metaKey || event.ctrlKey)) {
      dispatch(setSelectedSimulations([]));
    }
    // If Ctrl or Meta click on the background, do nothing because user was probably trying to add a bar
  };

  const handleBinClick = (
    event: React.MouseEvent<SVGRectElement, MouseEvent>,
    bin: {
      range: number[];
      count: number;
      index: number;
      bins_length: number;
      data: d3.Bin<ValueIndexType, number>;
    },
  ) => {
    // Destructure the data property from the bin object
    const { data } = bin;

    // Map over the data array to create a new array of indices
    const indices_matching_bin = data.map(({ index }) => index);

    // Check if the meta key or ctrl key was pressed during the click event
    const isMetaOrCtrlPressed = event.metaKey || event.ctrlKey;

    // Check if the clicked bar is already selected
    const isBarAlreadySelected = selected_bin_indexes.includes(bin.index);

    if (isMetaOrCtrlPressed && isBarAlreadySelected) {
      // If Ctrl or Meta click was on an already selected bar, remove the indices matching the bin from the selected_simulations
      const new_selected_simulations = _.difference(selected_simulations, indices_matching_bin);
      dispatch(setSelectedSimulations(new_selected_simulations));
    } else if (isMetaOrCtrlPressed) {
      // If Ctrl or Meta click on an unselected bar, merge the indices with the currently selected simulations, removing duplicates
      const merged_indices = _.union(selected_simulations, indices_matching_bin);
      // Dispatch the merged indices to the setSelectedSimulations action
      dispatch(setSelectedSimulations(merged_indices));
    } else {
      // If normal click, dispatch the indices matching the bin to the setSelectedSimulations action
      dispatch(setSelectedSimulations(indices_matching_bin));
    }
  };

  const makeBins = (values_and_indexes: ValueIndexType[]) => {
    // If the x variable is a string, we can't use d3.bin() to create the bins
    // because d3.bin() only works with numeric values.
    // So doing it manually here.
    if (x_column_type === "string") {
      // Group the values by value
      const grouped = d3.group(values_and_indexes, (d) => d.value);
      // Sort the groups by value (values are all strings, so let's use localeCompare)
      const groupedSorted = new Map(
        [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      );
      // Reformat the groupedSorted Map into same format as d3.bin() output,
      // which is an array of arrays with each array containing the following:
      // the values of the group
      // x0 property: lower bound of the bin
      // x1 property: upper bound of the bin
      // length property: number of elements in the bin
      const groupedSortedArray = Array.from(groupedSorted, ([key, values]) => {
        let bin = [...values];
        bin.x0 = key;
        bin.x1 = key;
        bin.length = values.length;
        return bin;
      });
      console.debug(`groupedSortedArray: %o`, groupedSortedArray);
      return groupedSortedArray;
    } else {
      // For numeric x variables, use d3.bin() to create the bins.
      const bin = d3
        .bin()
        .value((d: ValueIndexType) => d.value)
        // Setting the number of bins to be the same as the number of ticks
        // so that each tick has its own bin.
        .thresholds(x_ticks);
      // Other options for setting the number of bins by using supported threshold generators
      // .thresholds(d3.thresholdFreedmanDiaconis)
      // .thresholds(d3.thresholdScott)
      // .thresholds(d3.thresholdSturges)

      // Not specifying domain unless a custom variable range has been set by the user
      // for the current x variable because
      // "If the default extent domain is used and the thresholds are specified as a count
      // (rather than explicit values), then the computed domain will be niced such that all bins are uniform width."
      // https://d3js.org/d3-array/bin#bin_domain
      if (x_has_custom_range) {
        bin.domain(x_scale.domain()).thresholds(x_scale.ticks(x_ticks));
      }
      const bins = bin(values_and_indexes);
      return bins;
    }
  };

  // Make bins for the histogram.
  const bins_without_hidden = makeBins(x_values_and_indexes_without_hidden);

  // For non-string variables, adjusting x_scale domain to match the bins.
  if (x_column_type !== "string") {
    const bins_with_hidden = makeBins(x_values_and_indexes);

    // With auto_scale true, we use bins without hidden values to set the domain.
    // But if it's false, we set it to match bins of x_values, not x_values_without_hidden.
    const bins_for_x_scale_domain = auto_scale ? bins_without_hidden : bins_with_hidden;
    x_scale.domain([
      bins_for_x_scale_domain[0].x0,
      bins_for_x_scale_domain[bins_for_x_scale_domain.length - 1].x1,
    ]);
  }

  // Declare the y (vertical position) scale.
  const y_scale = d3
    .scaleLinear()
    .domain([0, d3.max(bins_without_hidden, (d) => d.length)])
    .range(y_scale_range);

  // Create an array of indices of bins_without_hidden whose elements' index attributes are all in selected_simulations_without_hidden.
  // In other words, find bins that contain only selected simulations.
  const selected_bin_indexes = bins_without_hidden
    .map((bin, index) => {
      // Disregard empty bins
      if (bin.length === 0) {
        return undefined;
      }
      // If all the indices in the bin are in selected_simulations_without_hidden, return the index of the bin
      const matching_bin_index = bin
        .map((value_and_index: ValueIndexType) => value_and_index.index)
        .every((index) => selected_simulations_without_hidden.includes(index))
        ? index
        : undefined;
      return matching_bin_index;
    })
    // Filter out undefined values (bins with unselected simulations)
    .filter((index) => index !== undefined) as number[];

  // Create an array of indices of bins_without_hidden where some but not all
  // of its elements' index attributes are in selected_simulations_without_hidden.
  // In other words, find bins that contain some but not all selected simulations.
  const partially_selected_bin_indexes = bins_without_hidden
    .map((bin, index) => {
      // Disregard empty bins
      if (bin.length === 0) {
        return undefined;
      }
      // If some but not all the indices in the bin are in selected_simulations_without_hidden, return the index of the bin
      const matching_bin_index = bin
        .map((value_and_index: ValueIndexType) => value_and_index.index)
        .some((index) => selected_simulations_without_hidden.includes(index))
        ? index
        : undefined;
      return matching_bin_index;
    })
    // Filter out undefined values (bins with unselected simulations)
    .filter((index) => index !== undefined)
    // Filter out any values that are also in selecte_bin_indexes
    .filter((index) => !selected_bin_indexes.includes(index)) as number[];

  // Update flashBinIndexes state when selected_simulations_without_hidden changes
  // so that histogram can flash bins for newly selected simulations.
  useEffect(() => {
    // Find new selected_simulations_without_hidden
    let newSelectedSimulations = selected_simulations_without_hidden.filter(
      (x) => !selectedSimulationsWithoutHiddenLocalState.includes(x),
    );
    // selected_simulations_without_hidden changed, so let's update local state with new value
    setSelectedSimulationsWithoutHiddenLocalState(selected_simulations_without_hidden);

    // Create an array of indices of bins_without_hidden where at least one of their elements are in selected_simulations_without_hidden.
    // In other words, find bins that contain any selected simulations.
    let flashBins = bins_without_hidden
      .map((bin, index) => {
        // Disregard empty bins
        if (bin.length === 0) {
          return undefined;
        }
        // If any of the indices in the bin are in newSelectedSimulations, return the index of the bin
        const matching_bin_index = bin
          .map((value_and_index: ValueIndexType) => value_and_index.index)
          .some((index) => newSelectedSimulations.includes(index))
          ? index
          : undefined;
        return matching_bin_index;
      })
      // Filter out undefined values (bins with unselected simulations)
      .filter((index) => index !== undefined) as number[];

    // Update flashBinIndexes local state
    setFlashBinIndexes(flashBins);
  }, [selected_simulations_without_hidden]);

  return (
    <>
      <PlotBackground background={background} />
      {/* Only show PlotGrid if show_grid is true */}
      {show_grid ? (
        <PlotGrid
          x_scale={x_scale}
          y_scale={y_scale}
          x_ticks={x_ticks}
          y_ticks={y_ticks}
          colormap={colormap}
          plot_grid_color={plot_grid_color}
          show_vertical_grid_lines={false}
        />
      ) : null}
      <Histogram
        x_scale={x_scale}
        y_scale={y_scale}
        y_scale_range={y_scale_range}
        bins={bins_without_hidden}
        selected_bin_indexes={selected_bin_indexes}
        partially_selected_bin_indexes={partially_selected_bin_indexes}
        flash_bin_indexes={flashBinIndexes}
        x_ticks={x_ticks}
        y_ticks={y_ticks}
        histogram_bar_color={histogram_bar_color}
        histogram_bar_stroke_width={histogram_bar_stroke_width}
        histogram_bar_selected_stroke_width={histogram_bar_selected_stroke_width}
        font_size={font_size}
        font_family={font_family}
        x_label_x={x_label_x}
        x_label_y={x_label_y}
        x_name={x_name}
        y_label_y={y_label_y}
        colormap={colormap}
        y_label_horizontal_offset={Y_LABEL_HORIZONTAL_OFFSET}
        handleBinClick={handleBinClick}
        handleBackgroundClick={handleBackgroundClick}
      />
    </>
  );
};

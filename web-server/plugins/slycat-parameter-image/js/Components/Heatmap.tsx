// modified from https://www.react-graph-gallery.com/heatmap
// Presentational only: D3 for scales/color, React for rendering rects.
// Fetching and data shaping belong in PSUQSAPanel / Redux — not here.

import React, { useMemo } from "react";
import * as d3 from "d3v7";
import { HeatmapCell } from "../uqsaSlice";

const MARGIN = { top: 10, right: 10, bottom: 30, left: 24 };

const num_formatter = new Intl.NumberFormat('en-US', {
  maximumSignificantDigits: 3,
});

type HeatmapProps = {
  width: number;
  height: number;
  data: HeatmapCell[];
  use_colors: boolean;
  use_numbers: boolean;
  // Forwards the clicked cell. Pearson cells include xIndex/yIndex; this
  // component does not look up columns or touch the scatterplot.
  show_plot: (e: React.MouseEvent<SVGElement>, cell: HeatmapCell) => void;
};

// Band identity is the column index when the cell has one, so two columns
// with the same alias or raw name stay in separate bands. Statistic headers
// have no index and use their label. The label is tick text only.
function bandKey(label: string, index: number | undefined): string {
  return index != null ? `index:${index}` : label;
}

type AxisGroup = { key: string; label: string };

function axisGroups(
  data: HeatmapCell[],
  labelOf: (cell: HeatmapCell) => string,
  indexOf: (cell: HeatmapCell) => number | undefined,
): AxisGroup[] {
  const groups: AxisGroup[] = [];
  const seen = new Set<string>();
  for (const cell of data) {
    const key = bandKey(labelOf(cell), indexOf(cell));
    if (!seen.has(key)) {
      seen.add(key);
      groups.push({ key, label: labelOf(cell) });
    }
  }
  return groups;
}

export const Heatmap = ({ width, height, data, use_colors, use_numbers, show_plot }: HeatmapProps) => {

  // bounds = area inside the axis
  const boundsWidth = width - MARGIN.right - MARGIN.left;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;

  const allXGroups = useMemo(
    () => axisGroups(data, (cell) => cell.x, (cell) => cell.xIndex),
    [data],
  );
  const allYGroups = useMemo(
    () => axisGroups(data, (cell) => cell.y, (cell) => cell.yIndex),
    [data],
  );

  // x and y scales
  const xScale = useMemo(() => {
    return d3.scaleBand().range([0, boundsWidth]).domain(allXGroups.map((group) => group.key)).padding(0.01);
  }, [allXGroups, boundsWidth]);

  const yScale = useMemo(() => {
    return d3.scaleBand().range([boundsHeight, 0]).domain(allYGroups.map((group) => group.key)).padding(0.01);
  }, [allYGroups, boundsHeight]);

  const [min, max] = useMemo(
    () => d3.extent(data.map((d) => d.value).filter((v): v is number => v != null)),
    [data],
  );

  // Use == null so value 0 is valid
  if (min == null || max == null) {
    return null;
  }

  // Color scale
  const colorScale = d3.scaleSequential().interpolator(d3.interpolatePuBu).domain([min, max]);

  // Text color
  function getTextColor(bgColorString: string, use_colors: boolean) {

    // only change text if we're using colors
    if (!use_colors) 
      return "black"

    // get color lightness
    const color = d3.lab(bgColorString);

    // If lightness is greater than 50%, use black text. Otherwise, use white.
    return color.l > 50 ? "black" : "white";
  }
  
  // Build the rectangles (skip null values)
  const allRects = data.map((d, i) => {
    if (d.value === null) {
      return null;
    }
    const x = xScale(bandKey(d.x, d.xIndex)) ?? 0;
    const y = yScale(bandKey(d.y, d.yIndex)) ?? 0;
    return (
      <rect
        key={i}
        id={String(i)}
        x={x}
        y={y}
        width={xScale.bandwidth()}
        height={yScale.bandwidth()}
        opacity={1}
        fill={use_colors ? colorScale(d.value) : "white"}
        rx={5}
        stroke={"black"}
        onClick={(e) => show_plot(e, d)}
        style={{cursor: 'pointer'}}>
          <title>Click to show plot</title>
      </rect>
    );
  });

  // Add the numbers (skip null values)
  const allNums = data.map((d, i) => {
    if (d.value === null) {
      return null;
    }
    const x = (xScale(bandKey(d.x, d.xIndex)) ?? 0) + xScale.bandwidth() / 2;
    const y = (yScale(bandKey(d.y, d.yIndex)) ?? 0) + yScale.bandwidth() / 2;
    return (
      <text
        key={i}
        id={String(i)}
        x={x}
        y={y}
        textAnchor =  {"middle"}
        dominantBaseline={"middle"}
        onClick={(e) => show_plot(e, d)}
        style={{cursor: "pointer", fill: getTextColor(colorScale(d.value), use_colors)}}>
          {num_formatter.format(d.value)}
          <title>Click to show plot</title>
      </text>
    );
  });

  const xLabels = allXGroups.map((group) => {
    const xPos = xScale(group.key) ?? 0;
    return (
      <text
        key={group.key}
        x={xPos + xScale.bandwidth() / 2}
        y={boundsHeight + 10}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
      >
        {group.label}
      </text>
    );
  });

  const yLabels = allYGroups.map((group) => {
    const xPos = -8;
    const yPos = (yScale(group.key) ?? 0) + yScale.bandwidth() / 2;
    return (
      <text
        key={group.key}
        x={xPos}
        y={yPos}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        transform={`rotate(-90, ${xPos}, ${yPos})`}
      >
        {group.label}
      </text>
    );
  });

  return (
    <div>
      <svg width={width} height={height}>
        <g
          width={boundsWidth}
          height={boundsHeight}
          transform={`translate(${[MARGIN.left, MARGIN.top].join(",")})`}
        >
          {allRects}
          {use_numbers ? allNums : null}
          {xLabels}
          {yLabels}
        </g>
      </svg>
    </div>
  );
};

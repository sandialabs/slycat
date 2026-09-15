// modified from https://www.react-graph-gallery.com/heatmap
// Presentational only: D3 for scales/color, React for rendering rects.
// Fetching and data shaping belong in PSUQSAPanel / Redux — not here.

import React, { useMemo } from "react";
import * as d3 from "d3v7";

const MARGIN = { top: 10, right: 10, bottom: 30, left: 24 };

const num_formatter = new Intl.NumberFormat('en-US', {
  maximumSignificantDigits: 4,
  maximumFractionDigits: 2,
});

type HeatmapProps = {
  width: number;
  height: number;
  data: { x: string; y: string; value: number | null }[];
  use_colors: boolean;
  use_numbers: boolean;
  show_plot: () => void;
};

export const Heatmap = ({ width, height, data, use_colors, use_numbers, show_plot }: HeatmapProps) => {

  // bounds = area inside the axis
  const boundsWidth = width - MARGIN.right - MARGIN.left;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;

  // groups
  const allYGroups = useMemo(() => [...new Set(data.map((d) => d.y))], [data]);
  const allXGroups = useMemo(() => [...new Set(data.map((d) => d.x))], [data]);

  // x and y scales
  const xScale = useMemo(() => {
    return d3.scaleBand().range([0, boundsWidth]).domain(allXGroups).padding(0.01);
  }, [allXGroups, boundsWidth]);

  const yScale = useMemo(() => {
    return d3.scaleBand().range([boundsHeight, 0]).domain(allYGroups).padding(0.01);
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
  function getTextColor(bgColorString, use_colors) {

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
    return (
      <rect
        key={i}
        id={i}
        x={xScale(d.x)}
        y={yScale(d.y)}
        width={xScale.bandwidth()}
        height={yScale.bandwidth()}
        opacity={1}
        fill={use_colors ? colorScale(d.value) : "white"}
        rx={5}
        stroke={"black"}
        onClick={show_plot}
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
    return (
      <text
        key={i}
        id={i}
        x={xScale(d.x) + xScale.bandwidth() / 2}
        y={yScale(d.y) + yScale.bandwidth() / 2}
        textAnchor =  {"middle"}
        dominantBaseline={"middle"}
        onClick={show_plot}
        style={{cursor: "pointer", fill: getTextColor(colorScale(d.value), use_colors)}}>
          {num_formatter.format(d.value)}
          <title>Click to show plot</title>
      </text>
    );
  });

  const xLabels = allXGroups.map((name, i) => {
    const xPos = xScale(name) ?? 0;
    return (
      <text
        key={i}
        x={xPos + xScale.bandwidth() / 2}
        y={boundsHeight + 10}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
      >
        {name}
      </text>
    );
  });

  const yLabels = allYGroups.map((name, i) => {
    const xPos = -8;
    const yPos = (yScale(name) ?? 0) + yScale.bandwidth() / 2;
    return (
      <text
        key={i}
        x={xPos}
        y={yPos}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        transform={`rotate(-90, ${xPos}, ${yPos})`}
      >
        {name}
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

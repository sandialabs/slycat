// modified from https://www.react-graph-gallery.com/heatmap
// Presentational only: D3 for scales/color, React for rendering rects.
// Fetching and data shaping belong in PSUQSAPanel / Redux — not here.

import React, { useMemo } from "react";
import * as d3 from "d3v7";

const MARGIN = { top: 10, right: 10, bottom: 30, left: 24 };

type HeatmapProps = {
  width: number;
  height: number;
  data: { x: string; y: string; value: number | null }[];
};

export const Heatmap = ({ width, height, data }: HeatmapProps) => {
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
  const colorScale = d3.scaleSequential().interpolator(d3.interpolateInferno).domain([min, max]);

  // Build the rectangles (skip null values)
  const allRects = data.map((d, i) => {
    if (d.value === null) {
      return null;
    }
    return (
      <rect
        key={i}
        x={xScale(d.x)}
        y={yScale(d.y)}
        width={xScale.bandwidth()}
        height={yScale.bandwidth()}
        opacity={1}
        fill={colorScale(d.value)}
        rx={5}
        stroke={"white"}
      />
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
          {xLabels}
          {yLabels}
        </g>
      </svg>
    </div>
  );
};

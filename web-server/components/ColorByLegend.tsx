/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC.
Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
retains certain rights in this software. */

import React, { useEffect, useId, useRef } from "react";
import * as d3 from "d3v7";

import type {
  ColorByLegendGradientStop,
  ColorByLegendModel,
  ColorByLegendScaleKind,
} from "js/slycat-color-maps-methods";
import { createHybridNumericTickFormat } from "js/slycat-axis-tick-format";
import type { HybridTickFormatScale } from "js/slycat-axis-tick-format";
import { truncateSvgAxisTickLabels } from "js/slycat-svg-text";

/** Legacy PS legend axis tick max width (pixels). */
const DEFAULT_TICK_LABEL_MAX_WIDTH = 140;

export type ColorByLegendProps = {
  label: string;
  /** Color bar height in pixels. */
  height: number;
  /** Color bar width in pixels. Default 10. */
  barWidth?: number;

  /**
   * Legend geometry from buildColorByLegendModel (gradient, ticks, scale kind).
   * Hosts own Redux/data selection; this component only renders.
   */
  model: ColorByLegendModel;

  /** Numeric domain (used when scaleKind is linear or log). Top of legend is max. */
  min?: number;
  max?: number;

  fontSize?: number | string;
  fontFamily?: string;

  /** Initial translate of the legend group. */
  position?: { x: number; y: number };

  /**
   * Root element. Use "svg" for a standalone legend pane (Timeseries).
   * Use "g" when embedding inside a host SVG (CCA / Parameter Space).
   */
  as?: "svg" | "g";
  svgWidth?: number | string;
  svgHeight?: number | string;

  draggable?: boolean;
  /** Pointer must stay inside these bounds while dragging (host canvas size). */
  dragBounds?: { width: number; height: number };
  onMoved?: (pos: { x: number; y: number }) => void;

  /** When true, hide the legend (e.g. PS crowded categorical + hide-labels). */
  hidden?: boolean;

  /**
   * Max pixel width for band/string tick labels before middle-ellipsis truncation.
   * Default 140 (legacy PS legend). Continuous ticks use hybrid numeric format.
   */
  tickLabelMaxWidth?: number;

  /** Override gradient id when multiple legends can appear on one page. */
  gradientId?: string;

  className?: string;
  style?: React.CSSProperties;
};

function stopColor(color: ColorByLegendGradientStop["color"]): string {
  return String(color);
}

function createLegendScale(
  scaleKind: ColorByLegendScaleKind,
  height: number,
  min: number | undefined,
  max: number | undefined,
  tickValues: (number | string)[] | undefined,
): d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number> | d3.ScaleBand<string> {
  const range: [number, number] = [0, height];

  if (scaleKind === "band") {
    return d3
      .scaleBand<string>()
      .paddingInner(0)
      .paddingOuter(0)
      .domain((tickValues ?? []).map((value) => String(value)))
      .range(range);
  }

  const lo = min ?? 0;
  const hi = max ?? 1;
  // Top of vertical legend is max (matches existing PS/CCA/Timeseries legends).
  if (scaleKind === "log") {
    return d3.scaleLog().domain([hi, lo]).range(range);
  }
  return d3.scaleLinear().domain([hi, lo]).range(range);
}

/**
 * Shared color-by legend: vertical gradient bar, right axis, rotated label,
 * optional drag. No Redux — hosts pass a ColorByLegendModel plus layout props.
 */
export const ColorByLegend: React.FC<ColorByLegendProps> = (props) => {
  const {
    label,
    height,
    barWidth = 10,
    model,
    min,
    max,
    fontSize,
    fontFamily,
    position = { x: 0, y: 0 },
    as = "svg",
    svgWidth = "100%",
    svgHeight = "100%",
    draggable = false,
    dragBounds,
    onMoved,
    hidden = false,
    tickLabelMaxWidth = DEFAULT_TICK_LABEL_MAX_WIDTH,
    className,
    style,
  } = props;

  const reactId = useId();
  const gradientId =
    props.gradientId ?? `color-gradient-${reactId.replace(/:/g, "")}`;

  const legendLayerRef = useRef<SVGGElement | null>(null);
  const legendAxisRef = useRef<SVGGElement | null>(null);
  const colorRectRef = useRef<SVGRectElement | null>(null);
  const movedRef = useRef(false);
  const positionRef = useRef({ x: position.x, y: position.y });
  const onMovedRef = useRef(onMoved);
  onMovedRef.current = onMoved;

  // Sync translate from props until the user has dragged.
  useEffect(() => {
    if (movedRef.current) {
      return;
    }
    positionRef.current = { x: position.x, y: position.y };
    const layer = legendLayerRef.current;
    if (layer) {
      layer.setAttribute("data-transx", String(position.x));
      layer.setAttribute("data-transy", String(position.y));
      layer.setAttribute("transform", `translate(${position.x}, ${position.y})`);
    }
  }, [position.x, position.y]);

  // Axis
  useEffect(() => {
    const axisNode = legendAxisRef.current;
    if (!axisNode || height <= 0) {
      return;
    }

    const scale = createLegendScale(
      model.scaleKind,
      height,
      min,
      max,
      model.tickValues,
    );

    const axis = d3.axisRight(scale as d3.AxisScale<d3.AxisDomain>);
    const tickCount = height / 50;

    if (model.scaleKind !== "band") {
      if (model.tickValues && model.tickValues.length > 0) {
        axis.tickValues(model.tickValues as number[]);
      } else {
        axis.ticks(tickCount);
      }
      axis.tickFormat(
        createHybridNumericTickFormat(scale as HybridTickFormatScale, tickCount) as (
          domainValue: d3.AxisDomain,
          index: number,
        ) => string,
      );
    }

    const axisSelection = d3
      .select(axisNode)
      .attr("transform", `translate(${barWidth},0)`)
      .call(axis as any);
    // d3v7 sets font attrs that fight host CSS / explicit styles.
    axisSelection.attr("font-size", null).attr("font-family", null);

    if (fontSize !== undefined) {
      axisSelection.style(
        "font-size",
        typeof fontSize === "number" ? `${fontSize}px` : fontSize,
      );
    }
    if (fontFamily !== undefined) {
      axisSelection.style("font-family", fontFamily);
    }

    if (model.scaleKind === "band") {
      truncateSvgAxisTickLabels(axisNode, tickLabelMaxWidth);
    }

    // Firefox: re-bind gradient fill after URI/id changes (bookmarking).
    // https://bugzilla.mozilla.org/show_bug.cgi?id=652991
    if (colorRectRef.current) {
      colorRectRef.current.style.fill = `url(#${gradientId})`;
    }
  }, [
    model.scaleKind,
    model.tickValues,
    model.gradientStops,
    min,
    max,
    height,
    barWidth,
    fontSize,
    fontFamily,
    tickLabelMaxWidth,
    gradientId,
  ]);

  // Optional drag (d3v7), matching CCA/PS clamp + data-status="moved".
  useEffect(() => {
    const layer = legendLayerRef.current;
    if (!layer || !draggable) {
      return;
    }

    const selection = d3.select(layer);
    const drag = d3
      .drag<SVGGElement, unknown>()
      .on("start", (event) => {
        event.sourceEvent?.stopPropagation();
      })
      .on("drag", (event) => {
        if (dragBounds) {
          if (
            event.y < 0 ||
            event.y > dragBounds.height ||
            event.x < 0 ||
            event.x > dragBounds.width
          ) {
            return;
          }
        }
        const next = {
          x: positionRef.current.x + event.dx,
          y: positionRef.current.y + event.dy,
        };
        positionRef.current = next;
        selection
          .attr("data-transx", next.x)
          .attr("data-transy", next.y)
          .attr("transform", `translate(${next.x}, ${next.y})`);
      })
      .on("end", () => {
        movedRef.current = true;
        selection.attr("data-status", "moved");
        onMovedRef.current?.(positionRef.current);
      });

    selection.call(drag);
    return () => {
      selection.on(".drag", null);
    };
  }, [draggable, dragBounds?.width, dragBounds?.height]);

  const labelX = -15;
  const labelY = height / 2;

  const labelStyle: React.CSSProperties = {
    textAnchor: "middle",
    fontWeight: "bold",
    ...(fontSize !== undefined
      ? { fontSize: typeof fontSize === "number" ? `${fontSize}px` : fontSize }
      : {}),
    ...(fontFamily !== undefined ? { fontFamily } : {}),
  };

  const legendGroup = (
    <g
      className={className ? `legend ${className}` : "legend"}
      ref={legendLayerRef}
      transform={`translate(${positionRef.current.x}, ${positionRef.current.y})`}
      data-transx={positionRef.current.x}
      data-transy={positionRef.current.y}
      // When the host SVG uses pointer-events:none (PS overlay), re-enable hits
      // on the legend so drag works without blocking scatterplot selection.
      onMouseDown={
        draggable
          ? (event) => {
              event.stopPropagation();
            }
          : undefined
      }
      style={{
        display: hidden ? "none" : undefined,
        cursor: draggable ? "move" : undefined,
        pointerEvents: draggable ? "all" : undefined,
        ...style,
      }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          {model.gradientStops.map((stop, index) => (
            <stop
              key={index}
              offset={`${stop.offset}%`}
              stopColor={stopColor(stop.color)}
            />
          ))}
        </linearGradient>
      </defs>
      <rect
        ref={colorRectRef}
        className="color"
        width={barWidth}
        height={height}
        x={0}
        y={0}
        style={{ fill: `url(#${gradientId})` }}
      />
      <g className="legend-axis" ref={legendAxisRef} />
      <text
        className="label"
        x={labelX}
        y={labelY}
        transform={`rotate(-90,${labelX},${labelY})`}
        style={labelStyle}
      >
        {label}
      </text>
    </g>
  );

  if (as === "g") {
    return legendGroup;
  }

  return (
    <svg width={svgWidth} height={svgHeight} className="color-by-legend">
      {legendGroup}
    </svg>
  );
};

export default ColorByLegend;

/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC.
Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
retains certain rights in this software. */

/**
 * Shared numeric axis tick formatting.
 *
 * Hybrid policy: adaptive grouped fixed notation (`,~f`) for human-scale
 * magnitudes; compact `.2g` for very large or very small values. Pure
 * formatters have no React/DOM/PS assumptions so other UIs can reuse them.
 */

import * as d3 from "d3v7";

/** d3 format specifier for human-scale continuous ticks. */
export const HYBRID_AXIS_TICK_NORMAL_SPECIFIER = ",~f";

/** Magnitudes at or above this use compact `.2g`. */
export const HYBRID_AXIS_TICK_COMPACT_ABOVE = 1e7;

/** Positive magnitudes below this use compact `.2g`. */
export const HYBRID_AXIS_TICK_COMPACT_BELOW = 1e-4;

/** Compact format for out-of-band magnitudes. */
export const HYBRID_AXIS_TICK_COMPACT_FORMAT = d3.format(".2g");

/** Continuous scale that exposes d3's `tickFormat(count, specifier)`. */
export type HybridTickFormatScale = {
  tickFormat: (
    count?: number,
    specifier?: string,
  ) => (d: d3.NumberValue) => string;
};

export type ApplyNumericAxisTickFormatOptions = {
  /** Skip hybrid when column is string (PS categorical / string axes). */
  columnType?: string;
  /** Skip hybrid for Date & Time axes (keep d3's default). */
  scaleType?: string;
};

/**
 * Build a hybrid tick formatter from a continuous scale.
 * Human-scale values use `scale.tickFormat(tickCount, ",~f")`; very large or
 * very small magnitudes use compact `.2g`.
 */
export function createHybridNumericTickFormat(
  scale: HybridTickFormatScale,
  tickCount: number,
): (d: d3.NumberValue) => string {
  const normalFormat = scale.tickFormat(
    tickCount,
    HYBRID_AXIS_TICK_NORMAL_SPECIFIER,
  );
  const compactFormat = HYBRID_AXIS_TICK_COMPACT_FORMAT;
  return (d: d3.NumberValue) => {
    const abs = Math.abs(+d);
    if (
      abs >= HYBRID_AXIS_TICK_COMPACT_ABOVE ||
      (abs > 0 && abs < HYBRID_AXIS_TICK_COMPACT_BELOW)
    ) {
      return compactFormat(d);
    }
    return normalFormat(d);
  };
}

/**
 * Apply hybrid numeric tick formatting to a d3 axis when the scale supports
 * `tickFormat` and optional PS-style guards pass.
 */
export function applyNumericAxisTickFormat<AxisT extends { tickFormat: (fn: (d: any) => string) => AxisT }>(
  axis: AxisT,
  scale: { tickFormat?: HybridTickFormatScale["tickFormat"] },
  tickCount: number,
  options: ApplyNumericAxisTickFormatOptions = {},
): AxisT {
  const { columnType, scaleType } = options;
  if (
    columnType === "string" ||
    scaleType === "Date & Time" ||
    typeof scale.tickFormat !== "function"
  ) {
    return axis;
  }
  return axis.tickFormat(
    createHybridNumericTickFormat(
      scale as HybridTickFormatScale,
      tickCount,
    ),
  );
}

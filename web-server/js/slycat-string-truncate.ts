/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC.
Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
retains certain rights in this software. */

/**
 * General-purpose string truncation utility.
 *
 * Shortens a string so it fits within a character-count or measured-size
 * budget, inserting an ellipsis at the chosen position. For pixel-width budgets, 
 * callers supply a measure function so
 * this module stays free of any rendering-context assumptions (SVG, Canvas,
 * HTML, etc.)
 */

export type TruncatePosition = "end" | "middle";

/** Returns the rendered size (typically pixel width) of a candidate string. */
export type Measurer = (text: string) => number;

export interface TruncateOptions {
  /**
   * Maximum number of characters allowed in the result (including the
   * ellipsis). Used when `maxWidth` is not provided.
   */
  maxChars?: number;

  /**
   * Maximum allowed measured size (typically pixel width). Requires a
   * `measure` callback. Takes precedence over `maxChars` when both are set,
   * since measured sizing is more specific than character counting.
   */
  maxWidth?: number;

  /** Required when `maxWidth` is set. Returns the rendered size of a string. */
  measure?: Measurer;

  /** Where the ellipsis appears within the truncated result. Defaults to "end". */
  position?: TruncatePosition;

  /** Ellipsis character(s). Defaults to "…" (U+2026). */
  ellipsis?: string;
}

const DEFAULT_ELLIPSIS = "\u2026";

/**
 * Shorten `text` to fit a budget, inserting an ellipsis at `position`.
 *
 * Returns `text` unchanged when:
 *   - it already fits the budget
 *   - neither `maxChars` nor `maxWidth` is provided
 *   - `text` is empty
 *
 * Precedence: when both `maxChars` and `maxWidth` are provided, `maxWidth`
 * wins.
 *
 * @throws When `maxWidth` is set without a `measure` callback.
 */
export function truncateString(text: string, options: TruncateOptions): string {
  const position = options.position ?? "end";
  const ellipsis = options.ellipsis ?? DEFAULT_ELLIPSIS;

  if (text.length === 0) return text;

  if (options.maxWidth !== undefined) {
    if (options.measure === undefined) {
      throw new Error(
        "truncateString: `maxWidth` requires a `measure` callback.",
      );
    }
    return truncateByWidth(
      text,
      options.maxWidth,
      options.measure,
      position,
      ellipsis,
    );
  }

  if (options.maxChars !== undefined) {
    return truncateByChars(text, options.maxChars, position, ellipsis);
  }

  return text;
}

function truncateByChars(
  text: string,
  maxChars: number,
  position: TruncatePosition,
  ellipsis: string,
): string {
  if (text.length <= maxChars) return text;
  if (maxChars <= 0) return "";
  if (maxChars <= ellipsis.length) return ellipsis.slice(0, maxChars);

  const keep = maxChars - ellipsis.length;
  return assemble(text, keep, position, ellipsis);
}

function truncateByWidth(
  text: string,
  maxWidth: number,
  measure: Measurer,
  position: TruncatePosition,
  ellipsis: string,
): string {
  if (measure(text) <= maxWidth) return text;
  if (measure(ellipsis) > maxWidth) return ellipsis;

  // Adding more characters never makes the result narrower, so binary search
  // can find the most characters that still fit with the ellipsis.
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    const candidate = assemble(text, mid, position, ellipsis);
    if (measure(candidate) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }

  return assemble(text, lo, position, ellipsis);
}

/**
 * Build a truncated string that keeps `keep` characters of `text`, splitting
 * them around the ellipsis according to `position`.
 */
function assemble(
  text: string,
  keep: number,
  position: TruncatePosition,
  ellipsis: string,
): string {
  if (keep <= 0) return ellipsis;
  if (position === "end") {
    return text.slice(0, keep) + ellipsis;
  }
  const left = Math.ceil(keep / 2);
  const right = keep - left;
  const head = text.slice(0, left);
  const tail = right > 0 ? text.slice(text.length - right) : "";
  return head + ellipsis + tail;
}

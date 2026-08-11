/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC.
Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
retains certain rights in this software. */

/**
 * Helpers for measuring and truncating SVG `<text>` content. Lives in its own
 * module so that purely string-level utilities (ex: slycat-string-truncate)
 * can stay rendering-context-agnostic and consumers wire up the appropriate
 * measurer at the call site.
 */

import { truncateString } from "./slycat-string-truncate";
import type { Measurer } from "./slycat-string-truncate";

/**
 * Build a `Measurer` that reports the rendered pixel width of any candidate
 * string when displayed in the given SVG `<text>` element's font and styles.
 *
 * The element's `textContent` is mutated during measurement and restored
 * before the returned function returns, so the node's visible content is
 * unchanged from the caller's perspective.
 */
export function measureSvgText(node: SVGTextElement): Measurer {
  return (text: string): number => {
    const original = node.textContent;
    node.textContent = text;
    const width = node.getComputedTextLength();
    node.textContent = original;
    return width;
  };
}

/**
 * Append an SVG `<title>` child so hovering reveals `text` via the browser's
 * native tooltip. Caller should set `textContent` first (wipes prior children).
 */
export function appendSvgTitle(node: Element, text: string): void {
  const title = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "title",
  );
  title.textContent = text;
  node.appendChild(title);
}

/**
 * Truncate every `.tick text` inside an axis layer to at most `maxWidth`
 * pixels using a middle ellipsis. Truncated nodes get an SVG `<title>` with
 * the full original text. Call after the axis has rendered so each tick's
 * `textContent` is the fresh untruncated label.
 */
export function truncateSvgAxisTickLabels(
  axisLayerNode: Element,
  maxWidth: number,
): void {
  axisLayerNode.querySelectorAll(".tick text").forEach((node) => {
    const textNode = node as SVGTextElement;
    const original = textNode.textContent;
    if (!original) return;
    const truncated = truncateString(original, {
      maxWidth,
      measure: measureSvgText(textNode),
      position: "middle",
    });
    if (truncated !== original) {
      textNode.textContent = truncated;
      appendSvgTitle(textNode, original);
    }
  });
}

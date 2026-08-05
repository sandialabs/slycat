/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC.
Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
retains certain rights in this software. */

/**
 * Helpers for measuring SVG `<text>` content. Lives in its own
 * module so that purely string-level utilities (ex: slycat-string-truncate)
 * can stay rendering-context-agnostic and consumers wire up the appropriate
 * measurer at the call site.
 */

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

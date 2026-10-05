/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC.
Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
retains certain rights in this software. */

/**
 * Helpers for measuring HTML text. Lives in its own module so that
 * purely string-level utilities (ex: slycat-string-truncate) can stay
 * rendering-context-agnostic and consumers wire up the appropriate
 * measurer at the call site.
 */

import type { Measurer } from "./slycat-string-truncate";

let measureCanvas: HTMLCanvasElement | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") {
    return null;
  }
  if (!measureCanvas) {
    measureCanvas = document.createElement("canvas");
  }
  return measureCanvas.getContext("2d");
}

/**
 * Build a `Measurer` that reports the rendered pixel width of any candidate
 * string when drawn with the given computed CSS font.
 */
export function measureCssText(style: CSSStyleDeclaration): Measurer {
  const ctx = getMeasureContext();
  const font =
    style.font && style.font.trim().length > 0
      ? style.font
      : `${style.fontSize} ${style.fontFamily}`;

  return (text: string): number => {
    if (!ctx) return 0;
    ctx.font = font;
    return ctx.measureText(text).width;
  };
}

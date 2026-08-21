/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC.
Under the terms of Contract DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
retains certain rights in this software. */

import _ from "lodash";

/**
 * Structural missing values are omitted from categorical domains and drawn with
 * null_color. Literal strings "null" / "undefined" are real categories.
 */
export function isStructuralMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "number" && Number.isNaN(value)) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

/**
 * Shared unique-value domain for categorical color scales and legend axes.
 * Keeps colorscale bands, ordinal domains, and tick labels aligned.
 */
export function getUniqueCategoryValues(
  values: Iterable<unknown> | ArrayLike<unknown> | null | undefined,
  options: { numeric?: boolean } = {},
): (number | string)[] {
  const list = Array.from((values ?? []) as Iterable<unknown>).filter(
    (value) => !isStructuralMissingValue(value),
  );

  if (options.numeric) {
    return _.uniq(list).sort((a, b) => (a as number) - (b as number)) as number[];
  }

  return _.uniq(list)
    .map((value) => String(value))
    .sort((a, b) => a.localeCompare(b));
}

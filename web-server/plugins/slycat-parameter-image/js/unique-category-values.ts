/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC.
Under the terms of Contract DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
retains certain rights in this software. */

import _ from "lodash";

/**
 * Shared unique-value domain for categorical color scales and legend axes.
 * Keeps colorscale bands, ordinal domains, and tick labels aligned.
 */
export function getUniqueCategoryValues(
  values: Iterable<unknown> | ArrayLike<unknown> | null | undefined,
  options: { numeric?: boolean } = {},
): (number | string)[] {
  const list = Array.from((values ?? []) as Iterable<unknown>);

  if (options.numeric) {
    return _.uniq(list)
      .filter(
        (value) =>
          value !== null && value !== undefined && !(typeof value === "number" && Number.isNaN(value)),
      )
      .sort((a, b) => (a as number) - (b as number)) as number[];
  }

  // Drop nullish so we don't invent a "null"/"undefined" category (null_color handles those).
  return _.uniq(list)
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value))
    .sort((a, b) => a.localeCompare(b));
}

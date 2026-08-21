import type { RootState, ThreeDVariableDataRange } from "./store";

export type ThreeDDataRange = [number, number];

type RangeState = Pick<
  RootState,
  "three_d_variable_data_ranges" | "three_d_variable_user_ranges"
>;

/**
 * Resolve the effective [min, max] for a 3D color-by key.
 * Prefers user overrides when set; otherwise uses aggregated data ranges.
 * Returns null when no data range is available yet (never throws).
 */
export function getThreeDDataRange(
  state: RangeState,
  colorBy: string,
): ThreeDDataRange | null {
  if (colorBy === ":") {
    return [0, 1];
  }

  const dataRange: ThreeDVariableDataRange | undefined =
    state.three_d_variable_data_ranges[colorBy];
  if (!dataRange) {
    return null;
  }

  const userRange = state.three_d_variable_user_ranges[colorBy];
  const min =
    userRange && userRange.min !== undefined ? userRange.min : dataRange.min;
  const max =
    userRange && userRange.max !== undefined ? userRange.max : dataRange.max;

  return [min, max];
}

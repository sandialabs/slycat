export const x_scale_range = (
  margin_left: number,
  margin_right: number,
  width: number,
  xoffset: number
): number[] => [0 + margin_left, width - margin_right - xoffset];

export const y_scale_range = (
  margin_top: number,
  margin_bottom: number,
  height: number
): number[] => [height - margin_bottom - 40, 0 + margin_top];

export const x_range_canvas = (
  margin_left: number,
  margin_right: number,
  width: number,
  xoffset: number
): number[] => [0, width - margin_left - margin_right - xoffset];

export const y_range_canvas = (
  margin_top: number,
  margin_bottom: number,
  height: number
): number[] => [height - margin_top - margin_bottom - 40, 0];

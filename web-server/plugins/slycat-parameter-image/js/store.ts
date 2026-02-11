import { DEFAULT_FONT_SIZE, DEFAULT_FONT_FAMILY } from "./Components/ControlsButtonVarOptions";
import {
  DEFAULT_UNSELECTED_POINT_SIZE,
  DEFAULT_UNSELECTED_BORDER_SIZE,
  DEFAULT_SELECTED_POINT_SIZE,
  DEFAULT_SELECTED_BORDER_SIZE,
  DEFAULT_SCATTERPLOT_MARGIN_TOP,
  DEFAULT_SCATTERPLOT_MARGIN_RIGHT,
  DEFAULT_SCATTERPLOT_MARGIN_BOTTOM,
  DEFAULT_SCATTERPLOT_MARGIN_LEFT,
} from "components/ScatterplotOptions/ScatterplotOptions";
import slycat_threeD_color_maps from "js/slycat-threeD-color-maps";
import {
  SLICE_NAME as SCATTERPLOT_SLICE_NAME,
  initialState as scatterplotInitialState,
  ScatterplotState,
} from "./scatterplotSlice";
import {
  SLICE_NAME as DATA_SLICE_NAME,
  initialState as dataInitialState,
  DataState,
} from "./dataSlice";
import { TableMetadataType } from "types/slycat";

export type AxisType = "Linear" | "Log" | "Date & Time";

export type AxesVariablesType = {
  [key: number]: AxisType;
};

export type VariableRangesType = {
  [key: string]: {
    min: number;
    max: number;
  };
};

export type VariableAliasesType = {
  [key: string]: string;
};

export type TableStatisticsType = {
  min: number | string;
  max: number | string;
}[];

export type ValuesType =
  | Array<string>
  | Array<number | undefined>
  | Array<Date | undefined>
  | Float64Array;

export type XYPairsType = {
  x: number;
  y: number;
  label: string;
}[];

export type DerivedStateType = {
  xValues: ValuesType;
  yValues: ValuesType;
  vValues: ValuesType;
  table_metadata: TableMetadataType;
  table_statistics: TableStatisticsType;
  variableAliases: VariableAliasesType;
  mediaValues: string[];
  media_columns: number[];
  rating_variables: number[];
  xy_pairs: XYPairsType;
  // ToDo: Add more specific types for these
  three_d_colorby_range: {};
  three_d_colorby_legends: {};
};

export type OpenMediaType = {
  index: number;
  media_index: number;
  uri: string;
  uid: string;
  x: number;
  y: number;
  relx: number;
  rely: number;
  width: number;
  height: number;
  current_frame: boolean;
  ratio: string;
  video?: boolean;
  playing?: boolean;
  threeD?: boolean;
}[];

// Currently we are not storing any details of the filters
// We are just using an empty objects for the type to
// determine how many active filters are there.
// In the future we need to expand this when we convert
// the filter manager to React.
export type ActiveFiltersType = {}[];

export type RootState = {
  fontSize: number;
  fontFamily: string;
  axesVariables: AxesVariablesType;
  threeD_sync: boolean;
  colormap: string;
  threeDColormap: string;
  threeD_background_color: [number, number, number];
  unselected_point_size: number;
  unselected_border_size: number;
  selected_point_size: number;
  selected_border_size: number;
  scatterplot_margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  variableRanges: VariableRangesType;
  three_d_cameras: Record<string, any>;
  three_d_colorvars: Record<string, string>;
  three_d_variable_data_ranges: Record<string, [number, number]>;
  three_d_variable_user_ranges: Record<string, [number, number]>;
  open_media: OpenMediaType;
  closed_media: any[];
  currentFrame: Record<string, any>;
  active_filters: ActiveFiltersType;
  sync_scaling: boolean;
  sync_threeD_colorvar: boolean;
  x_index: number;
  y_index: number;
  v_index: number;
  video_sync: boolean;
  video_sync_time: number;
  [SCATTERPLOT_SLICE_NAME]: ScatterplotState;
  [DATA_SLICE_NAME]: DataState;
  derived: DerivedStateType;
  media_index: number;
};

export const initialState: RootState = {
  fontSize: DEFAULT_FONT_SIZE,
  fontFamily: DEFAULT_FONT_FAMILY,
  axesVariables: {},
  threeD_sync: false,
  colormap: "night",
  // First colormap is default
  threeDColormap: Object.keys(slycat_threeD_color_maps.color_maps)[0],
  threeD_background_color: [0.7 * 255, 0.7 * 255, 0.7 * 255],
  unselected_point_size: DEFAULT_UNSELECTED_POINT_SIZE,
  unselected_border_size: DEFAULT_UNSELECTED_BORDER_SIZE,
  selected_point_size: DEFAULT_SELECTED_POINT_SIZE,
  selected_border_size: DEFAULT_SELECTED_BORDER_SIZE,
  scatterplot_margin: {
    top: DEFAULT_SCATTERPLOT_MARGIN_TOP,
    right: DEFAULT_SCATTERPLOT_MARGIN_RIGHT,
    bottom: DEFAULT_SCATTERPLOT_MARGIN_BOTTOM,
    left: DEFAULT_SCATTERPLOT_MARGIN_LEFT,
  },
  variableRanges: {},
  three_d_cameras: {},
  three_d_colorvars: {},
  three_d_variable_data_ranges: {},
  three_d_variable_user_ranges: {},
  open_media: [],
  closed_media: [],
  currentFrame: {},
  active_filters: [],
  sync_scaling: true,
  sync_threeD_colorvar: true,
  x_index: 0,
  y_index: 1,
  v_index: 1,
  video_sync: false,
  video_sync_time: 0,
  media_index: -1,
  [SCATTERPLOT_SLICE_NAME]: { ...scatterplotInitialState },
  [DATA_SLICE_NAME]: { ...dataInitialState },
  derived: {
    variableAliases: {},
    xValues: [],
    yValues: [],
    vValues: [],
    mediaValues: [],
    three_d_colorby_range: {},
    three_d_colorby_legends: {},
    media_columns: [],
    rating_variables: [],
    xy_pairs: [],
    table_metadata: {
      "row-count": 0,
      "column-count": 0,
      "column-names": [],
      "column-types": [],
    },
    table_statistics: [],
  },
};

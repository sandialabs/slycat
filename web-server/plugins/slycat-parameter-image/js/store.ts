export type AxisType = "Linear" | "Log" | "Date & Time";

export type AxesVariablesType = {
  [key: number]: AxisType;
};

export type VariableRangesType = {
  [key: number]: {
    min: number;
    max: number;
  };
};

export type TableStatisticsType = {
  min: number | string;
  max: number | string;
}[];

export type ValuesType = (number | string)[];

export type DerivedStateType = {
  xValues: ValuesType;
  yValues: ValuesType;
  vValues: ValuesType;
  table_metadata: TableMetadataType;
  table_statistics: TableStatisticsType;
  variableAliases: string[];
};

export type ColumnTypesType = "string" | "float64" | "int64";

export type TableMetadataType = {
  "row-count": number;
  "column-count": number;
  "column-names": string[];
  "column-types": ColumnTypesType[];
};

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
  open_media: any[];
  closed_media: any[];
  currentFrame: Record<string, any>;
  active_filters: any[];
  hidden_simulations: number[];
  manually_hidden_simulations: any[];
  sync_scaling: boolean;
  sync_threeD_colorvar: boolean;
  selected_simulations: any[];
  x_index: number;
  y_index: number;
  v_index: number;
  video_sync_time: number;
  derived: DerivedStateType;
};

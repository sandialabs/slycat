export type ColumnTypesType = "string" | "float64" | "int64";

export type TableMetadataType = {
  "row-count": number;
  "column-count": number;
  "column-names": string[];
  "column-types": ColumnTypesType[];
}; 
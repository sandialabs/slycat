# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import copy
import math
import numpy
import sys

class data_accumulator:
  """Used to generate table data without reading the entire table into memory
  at once."""
  def __init__(self, row_count, column_names, nan_row_filtering=False):
    self.row_count = row_count
    self.column_names = column_names
    self.nan_row_filtering = nan_row_filtering

    self.column_count = len(column_names)
    self.column_types = ["string" for name in column_names]
    self.column_min = [None for name in column_names]
    self.column_max = [None for name in column_names]
    self.column_min_number = [None for name in column_names]
    self.column_max_number = [None for name in column_names]
    self.numeric_columns = range(len(column_names))
    self.columns = [[] for name in column_names]

    self.row_index = 0
    self.extracted_row_count = 0

  def add_fields(self, fields):
    if self.row_index == self.row_count:
      raise Exception("Row count mismatch.")

    if len(fields) != self.column_count:
      raise Exception("Column count mismatch.")

    skip_row = False

    # Strip whitespace
    fields = [field.strip() for field in fields]

    # Extract string-based per-column min and max ...
    self.column_min = [fields[i] if self.column_min[i] is None else min(self.column_min[i], fields[i]) for i in range(len(fields))]
    self.column_max = [fields[i] if self.column_max[i] is None else max(self.column_max[i], fields[i]) for i in range(len(fields))]

    # Identify numeric columns ...
    for i in copy.deepcopy(self.numeric_columns):
      try:
        value = float(fields[i])

        self.column_min_number[i] = value if self.column_min_number[i] is None else min(self.column_min_number[i], value)
        self.column_max_number[i] = value if self.column_max_number[i] is None else max(self.column_max_number[i], value)

        # Optionally skip rows containing NaN ...
        if self.nan_row_filtering:
          if math.isnan(value):
            skip_row = True

      except:
        self.numeric_columns.remove(i)

    # Store column values ...
    if not skip_row:
      self.extracted_row_count += 1
      for i in range(len(fields)):
        self.columns[i].append(fields[i])

    self.row_index += 1

    # Finalize the table ...
    if self.row_index == self.row_count:
      for i in self.numeric_columns:
        self.column_types[i] = "double"
        self.column_min[i] = self.column_min_number[i]
        self.column_max[i] = self.column_max_number[i]

      for i in self.numeric_columns:
        self.columns[i] = [float(value) for value in self.columns[i]]

  def data(self):
    if self.row_index != self.row_count:
      raise Exception("Row count mismatch.")

    data = {
      "type" : "table",
      "row-count" : self.extracted_row_count,
      "column-count" : self.column_count,
      "column-names" : self.column_names,
      "column-types" : self.column_types,
      "column-min" : self.column_min,
      "column-max" : self.column_max,
      "columns" : self.columns
      }

    return data


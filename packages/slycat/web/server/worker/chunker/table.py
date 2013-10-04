# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import slycat.web.server.database.couchdb
import slycat.web.server.database.scidb
import slycat.web.server.worker

import cherrypy
import json
import numpy
import random
import threading
import time

class prototype(slycat.web.server.worker.prototype):
  """Worker that serves up rectangular table "chunks", for interactive browsing
  of giant tables."""
  def __init__(self, security, name):
    slycat.web.server.worker.prototype.__init__(self, security, name)

  def get_table_chunker_metadata(self, arguments):
    """Called to retrieve metadata describing the underlying table."""
    response = self.get_metadata()
    if isinstance(response, cherrypy.HTTPError):
      raise response
    return response

  def get_table_chunker_search(self, arguments):
    """Called to search for a column value."""
    try:
      search = [spec.split(":") for spec in arguments["query"].split(",")]
      search = [(int(column), float(value)) for column, value in search]
    except:
      raise cherrypy.HTTPError("400 Malformed search argument must match <column>:<value>,...")

    search = [(column, value) for column, value in search if column >= 0]

    response = self.get_search(search)
    if isinstance(response, cherrypy.HTTPError):
      raise response
    return response

  def get_table_chunker_chunk(self, arguments):
    """Called to retrieve the given chunk.  Note that the returned chunk may
    contain a subset of the requested data, or no data at all."""
    try:
      rows = [spec.split("-") for spec in arguments["rows"].split(",")]
      rows = [(int(spec[0]), int(spec[1]) if len(spec) == 2 else int(spec[0]) + 1) for spec in rows]
      rows = numpy.concatenate([numpy.arange(begin, end) for begin, end in rows])
    except:
      raise cherrypy.HTTPError("400 Malformed rows argument must be a comma separated collection of row indices or half-open index ranges.")

    try:
      columns = [spec.split("-") for spec in arguments["columns"].split(",")]
      columns = [(int(spec[0]), int(spec[1]) if len(spec) == 2 else int(spec[0]) + 1) for spec in columns]
      columns = numpy.concatenate([numpy.arange(begin, end) for begin, end in columns])
    except:
      raise cherrypy.HTTPError("400 Malformed columns argument must be a comma separated collection of column indices or half-open index ranges.")

    rows = rows[rows >= 0]
    columns = columns[columns >= 0]

    response = self.get_chunk(rows, columns)
    if isinstance(response, cherrypy.HTTPError):
      raise response
    return response

  def put_table_chunker_sort(self, arguments):
    """Called to sort the underlying table.  The sorted results will be returned
    by subsequent calls to search() and chunk()."""
    try:
      sort = [(int(column), order) for column, order in arguments["order"]]
    except:
      raise cherrypy.HTTPError("400 Malformed order argument must match [[column, order],[column, order],...]")

    for column, order in sort:
      if order != "ascending" and order != "descending":
        raise cherrypy.HTTPError("400 Sort-order must be 'ascending' or 'descending'.")

    sort = [(column, order) for column, order in sort if column >= 0]

    response = self.put_sort(sort)
    if isinstance(response, cherrypy.HTTPError):
      raise response
    return response

  def work(self):
    self.preload()
    while not self.stopped:
      time.sleep(1.0)

  def preload(self):
    """Implement this in derivatives to do any pre-loading of data before entering the main chunk-retrieval loop."""
    raise NotImplementedError()

  def get_metadata(self):
    """Implement this in derivatives to return metadata describing the underlying data."""
    raise NotImplementedError()

  def get_search(self, search):
    """Implement this in derivatives to search the underlying data."""
    raise NotImplementedError()

  def get_chunk(self, rows, columns):
    """Implement this in derivatives to fetch the given chunk."""
    raise NotImplementedError()

  def put_sort(self, sort):
    """Implement this in derivatives to sort the underlying data."""
    raise NotImplementedError()

class test(prototype):
  """Table chunker that creates an arbitrary-size table containing random data for testing."""
  def __init__(self, security, row_count, generate_index):
    prototype.__init__(self, security, "chunker.table.test")
    self.row_count = row_count
    self.generate_index = generate_index
    self.types = ["int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64", "float32", "float64", "string"]
    self.ready = threading.Event()

  def preload(self):
    self.column_names = [type for type in self.types]
    self.column_types = [type for type in self.types]
    self.columns = [numpy.arange(self.row_count).astype(type) for type in self.types]

    if self.generate_index is not None:
      self.column_names.append(self.generate_index)
      self.column_types.append("int64")
      self.columns.append(numpy.arange(self.row_count).astype("int64"))

    self.sort_index = range(self.row_count)
    self.sort_indices = {() : self.sort_index}
    self.set_message("Using %s x %s test data." % (self.row_count, len(self.column_names)))
    self.ready.set()

  def get_metadata(self):
    self.ready.wait()

    response = {
      "row-count" : self.row_count,
      "column-count" : len(self.column_names),
      "column-names" : self.column_names,
      "column-types" : self.column_types,
      "column-min" : [numpy.asscalar(min(column)) for column in self.columns],
      "column-max" : [numpy.asscalar(max(column)) for column in self.columns]
      }
    return response

  def get_search(self, search):
    self.ready.wait()

    search = [(column, value) for column, value in search if column < self.column_count]

    response = {
      "search" : search,
      "matches" : [[row for row in range(self.row_count) if self.columns[column][self.sort_index[row]] == value] for column, value in search]
      }

    return response

  def get_chunk(self, rows, columns):
    self.ready.wait()

    # Constrain end <= count along both dimensions
    rows = [row for row in rows if row < self.row_count]
    columns = [column for column in columns if column < len(self.column_names)]

    response = {
      "rows" : rows,
      "columns" : columns,
      "column-names" : ["column-%s" % column for column in columns],
      "data" : [[numpy.asscalar(self.columns[column][self.sort_index[row]]) for row in rows] for column in columns],
      }
    return response

  def put_sort(self, sort):
    self.ready.wait()

    sort = [(column, order) for column, order in sort if column < self.column_count]
    sort_index_key = tuple(sort)

    if sort_index_key not in self.sort_indices:
      index = range(self.row_count)
      for column, order in reversed(sort):
        index = sorted(index, key=lambda x: self.columns[column][x], reverse = (False if order == "ascending" else True))
      self.sort_indices[sort_index_key] = index
    self.sort_index = self.sort_indices[sort_index_key]

    response = {
      "sort" : sort
      }
    return response

class artifact(prototype):
  """Table chunker that returns data from a database "file" (typically, a model artifact)."""
  def __init__(self, security, model, artifact, generate_index):
    prototype.__init__(self, security, "chunker.table.artifact")
    self.model = model
    self.artifact_name = artifact
    self.artifact = model["artifact:%s" % artifact]
    self.generate_index = generate_index
    self.metadata_ready = threading.Event()

  def preload(self):
    database = slycat.web.server.database.scidb.connect()

    columns = self.artifact["columns"]
    column_names = self.artifact["column-names"]

    with database.query("aql", "select name from %s" % column_names) as results:
      self.column_names = [value.getString() for attribute in results for value in attribute]
      self.column_count = len(self.column_names)

    with database.query("aql", "select type_id from attributes(%s)" % columns) as results:
      self.column_types = [value.getString() for attribute in results for value in attribute]

    low = database.query_value("aql", "select low from dimensions(%s)" % columns).getInt64()
    high = database.query_value("aql", "select high from dimensions(%s)" % columns).getInt64()
    self.row_count = high + 1 if high >= low else 0

    def extract_value(value, type):
      if type == "double":
        return value.getDouble()
      elif type == "string":
        return value.getString()

    with database.query("aql", "select {} from {}".format(",".join(["min(c{})".format(index) for index in range(self.column_count)]), columns)) as results:
      self.column_min = []
      index = 0
      for attribute in results:
        for value in attribute:
          if self.column_types[index] == "double":
            self.column_min.append(value.getDouble())
          elif self.column_types[index] == "string":
            self.column_min.append(value.getString())
          index += 1
    with database.query("aql", "select {} from {}".format(",".join(["max(c{})".format(index) for index in range(self.column_count)]), columns)) as results:
      self.column_max = []
      index = 0
      for attribute in results:
        for value in attribute:
          if self.column_types[index] == "double":
            self.column_max.append(value.getDouble())
          elif self.column_types[index] == "string":
            self.column_max.append(value.getString())
          index += 1

    if self.generate_index is not None:
      self.column_count += 1
      self.column_names.append(self.generate_index)
      self.column_types.append("int64")
      self.column_min.append(0)
      self.column_max.append(self.row_count - 1)

    self.sort = None
    self.set_message("Loaded %s x %s file." % (self.row_count, self.column_count))

    self.metadata_ready.set()

  def get_metadata(self):
    self.metadata_ready.wait()
    response = {
      "row-count" : self.row_count,
      "column-count" : self.column_count,
      "column-names" : self.column_names,
      "column-types" : self.column_types,
      "column-min" : self.column_min,
      "column-max" : self.column_max
      }
    return response

  def get_search(self, search):
    self.metadata_ready.wait()

    search = [(column, value) for column, value in search if column < self.column_count]

    matches = []
    database = slycat.web.server.database.scidb.connect()
    for search_column, search_value in search:
      # Generate a database query
      query = "{array}".format(array = self.artifact["columns"])
      if self.generate_index is not None:
        query = "apply({array}, c{column}, row)".format(array=query, column=self.column_count - 1)
      if self.sort is not None:
        sort = ",".join(["c{column} {order}".format(column=sort_column, order="asc" if sort_order == "ascending" else "desc") for sort_column, sort_order in self.sort])
        query = "sort({array}, {sort})".format(array=query, sort=sort)
      query = "select c{column} from {array} where c{column} = {value}".format(array=query, column=search_column, value=search_value)
      with database.query("aql", query) as results:
        for chunk in results.chunks():
          for attribute in chunk.attributes():
            rows = [coordinate[0] for coordinate in attribute.coordinates()]
      matches.append(rows)

    response = {
      "search" : search,
      "matches" : matches
      }

    return response

  def get_chunk(self, rows, columns):
    self.metadata_ready.wait()

    # Constrain end <= count along both dimensions
    rows = rows[rows < self.row_count]
    columns = columns[columns < self.column_count]

    # Generate a database query
    query = "{array}".format(array = self.artifact["columns"])
    if self.generate_index is not None:
      query = "apply({array}, c{column}, row)".format(array=query, column=self.column_count - 1)
    if self.sort is not None:
      sort = ",".join(["c{column} {order}".format(column=column, order="asc" if order == "ascending" else "desc") for column, order in self.sort])
      query = "sort({array}, {sort})".format(array=query, sort=sort)
    query = "between({array}, {begin}, {end})".format(array=query, begin=rows.min(), end=rows.max())
    query = "select * from {array}".format(array=query)

    # Retrieve the data from the database ...
    data = [[] for column in self.column_names]
    database = slycat.web.server.database.scidb.connect()
    with database.query("aql", query) as results:
      for chunk in results.chunks():
        for column, attribute in enumerate(chunk.attributes()):
          column_type = self.column_types[column]
          if column_type == "string":
            values = [value.getString() for value in attribute]
          elif column_type == "int64":
            values = [value.getInt64() for value in attribute]
          elif column_type == "double":
            values = [value.getDouble() for value in attribute]
            values = [None if numpy.isnan(value) else value for value in values]
          else:
            raise Exception("Unsupported attribute type: {}".format(column_type))
          data[column] += values

    response = {
      "rows" : rows.tolist(),
      "columns" : columns.tolist(),
      "column-names" : [self.column_names[column] for column in columns],
      "data" : [[data[column][row] for row in range(rows.shape[0])] for column in columns]
      }

    return response

  def put_sort(self, sort):
    self.metadata_ready.wait()

    self.sort = [(column, order) for column, order in sort if column < self.column_count]

    response = {
      "sort" : self.sort
      }
    return response


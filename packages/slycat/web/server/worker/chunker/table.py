# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import slycat.web.server.database.couchdb
import slycat.web.server.database.scidb
import slycat.web.server.worker

import cherrypy
import json
import random
import Queue

class prototype(slycat.web.server.worker.prototype):
  """Worker that serves up rectangular table "chunks", for interactive browsing
  of giant tables."""
  def __init__(self, security, name):
    slycat.web.server.worker.prototype.__init__(self, security, name)
    self.request = Queue.Queue()
    self.response = Queue.Queue()

  def get_table_chunker_metadata(self, arguments):
    """Called to retrieve metadata describing the underlying table."""
    self.request.put(("metadata", None))
    return self.response.get()

  def get_table_chunker_search(self, arguments):
    """Called to search for a column value."""
    try:
      search = [spec.split(":") for spec in arguments["query"].split(",")]
      search = [(int(column), float(value)) for column, value in search]
    except:
      raise cherrypy.HTTPError("400 Malformed search argument must match <column>:<value>,...")

    self.request.put(("search", search))
    return self.response.get()

  def get_table_chunker_chunk(self, arguments):
    """Called to retrieve the given chunk.  Note that the returned chunk may
    contain a subset of the requested data, or no data at all."""
    try:
      rows = [spec.split("-") for spec in arguments["rows"].split(",")]
      rows = [(int(spec[0]), int(spec[1]) if len(spec) == 2 else int(spec[0]) + 1) for spec in rows]
      rows = [row for begin, end in rows for row in range(begin, end)]
    except:
      raise cherrypy.HTTPError("400 Malformed rows argument must be a comma separated collection of row indices or half-open index ranges.")

    try:
      columns = [spec.split("-") for spec in arguments["columns"].split(",")]
      columns = [(int(spec[0]), int(spec[1]) if len(spec) == 2 else int(spec[0]) + 1) for spec in columns]
      columns = [column for begin, end in columns for column in range(begin, end)]
    except:
      raise cherrypy.HTTPError("400 Malformed columns argument must be a comma separated collection of column indices or half-open index ranges.")

    self.request.put(("chunk", (rows, columns)))
    return self.response.get()

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

    self.request.put(("sort", sort))
    return self.response.get()

  def work(self):
    self.preload()

    while not self.stopped:
      try:
        # Process the next request ...
        request, parameters = self.request.get(timeout=1)
        if request == "chunk":
          rows, columns = parameters

          # Constrain the request to 0 <= index along both dimensions
          rows = [row for row in rows if row >= 0]
          columns = [column for column in columns if column >= 0]
          response = self.get_chunk(rows, columns)

        elif request == "metadata":
          response = self.get_metadata()

        elif request == "search":
          search = [(column, value) for column, value in parameters if column >= 0]
          response = self.get_search(search)

        elif request == "sort":
          sort = [(column, order) for column, order in parameters if column >= 0]
          response = self.put_sort(sort)

        self.response.put(response)

      except Queue.Empty:
        pass

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
  def __init__(self, security, row_count, column_count, generate_index, seed=12345):
    prototype.__init__(self, security, "chunker.table.test")
    self.row_count = row_count
    self.column_count = column_count
    self.seed = seed
    self.generate_index = generate_index

  def preload(self):
    generator = random.Random()
    generator.seed(self.seed)
    self.column_names = ["column-%s" % column for column in range(self.column_count)]
    self.column_types = ["double" for column in range(self.column_count)]
    self.columns = [[generator.randint(0, self.row_count / 10) for row in range(self.row_count)] for column in range(self.column_count)]

    if self.generate_index is not None:
      self.column_count += 1
      self.column_names.append(self.generate_index)
      self.column_types.append("int64")
      self.columns.append(range(self.row_count))

    self.sort_index = range(self.row_count)
    self.sort_indices = {() : self.sort_index}
    self.set_message("Using %s x %s test data." % (self.row_count, self.column_count))

  def get_metadata(self):
    response = {
      "row-count" : self.row_count,
      "column-count" : self.column_count,
      "column-names" : self.column_names,
      "column-types" : self.column_types,
      "column-min" : [min(column) if len(column) else None for column in self.columns],
      "column-max" : [max(column) if len(column) else None for column in self.columns]
      }
    return response

  def get_search(self, search):
    search = [(column, value) for column, value in search if column < self.column_count]

    response = {
      "search" : search,
      "matches" : [[row for row in range(self.row_count) if self.columns[column][self.sort_index[row]] == value] for column, value in search]
      }

    return response

  def get_chunk(self, rows, columns):
    # Constrain end <= count along both dimensions
    rows = [row for row in rows if row < self.row_count]
    columns = [column for column in columns if column < self.column_count]

    response = {
      "rows" : rows,
      "columns" : columns,
      "column-names" : ["column-%s" % column for column in columns],
      "data" : [[self.columns[column][self.sort_index[row]] for row in rows] for column in columns],
      }
    return response

  def put_sort(self, sort):
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
    self.artifact = model["artifact:%s" % artifact]
    self.generate_index = generate_index

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

    self.columns = []
    with database.query("aql", "select * from %s" % columns) as results:
      attributes = iter(results)
      for column_type in self.column_types:
        if column_type == "string":
          self.columns.append([value.getString() for value in attributes.next()])
        elif column_type == "double":
          self.columns.append([value.getDouble() for value in attributes.next()])
        else:
          self.columns.append([None] * self.row_count)

    if self.generate_index is not None:
      self.column_count += 1
      self.column_names.append(self.generate_index)
      self.column_types.append("int64")
      self.columns.append(range(self.row_count))

    self.sort_index = range(self.row_count)
    self.sort_indices = {() : self.sort_index}
    self.set_message("Loaded %s x %s file." % (self.row_count, self.column_count))

  def get_metadata(self):
    response = {
      "row-count" : self.row_count,
      "column-count" : self.column_count,
      "column-names" : self.column_names,
      "column-types" : self.column_types,
      "column-min" : [min(column) if len(column) else None for column in self.columns],
      "column-max" : [max(column) if len(column) else None for column in self.columns]
      }
    return response

  def get_search(self, search):
    search = [(column, value) for column, value in search if column < self.column_count]

    response = {
      "search" : search,
      "matches" : [[row for row in range(self.row_count) if self.columns[column][self.sort_index[row]] == value] for column, value in search]
      }

    return response

  def get_chunk(self, rows, columns):
    # Constrain end <= count along both dimensions
    rows = [row for row in rows if row < self.row_count]
    columns = [column for column in columns if column < self.column_count]

    response = {
      "rows" : rows,
      "columns" : columns,
      "column-names" : [self.column_names[column] for column in columns],
      "data" : [[self.columns[column][self.sort_index[row]] for row in rows] for column in columns]
      }

    return response

  def put_sort(self, sort):
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


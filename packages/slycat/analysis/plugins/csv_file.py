# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_client_plugin(context):
  import slycat.analysis.plugin.client
  import StringIO

  def csv_file(connection, path, format=None, delimiter=",", chunk_size=None):
    """Load an array from a single CSV file.

    Signature: csv_file(path, format=None, delimiter=",", chunk_size=None

    Loads data from a single CSV file, partitioned in round-robin order among
    workers.  Use the "delimiter" parameter to specify the field delimiter,
    which defaults to ",".  If the "format" parameter is None (the default),
    every attribute in the output array will be of type "string".  Pass a list
    of types to "format" to specify alternate attribute types in the output
    array.  Use the "chunk_size" parameter to specify the maximum chunk size of
    the output array.  Otherwise, the file will be evenly split into N chunks,
    one on each of N workers."""
    if chunk_size is not None:
      chunk_size = slycat.analysis.plugin.client.require_chunk_size(chunk_size)
    return connection.create_remote_file_array("csv_file", [], path, format, delimiter, chunk_size)

  schema_doc = "\n".join([line.strip() for line in StringIO.StringIO(csv_file.__doc__).readlines()][4:])
  context.register_plugin_function("csv_file", csv_file, metadata={"load-schema":"csv-file", "load-schema-doc":schema_doc})

def register_worker_plugin(context):
  import numpy
  import os

  import slycat.analysis.plugin.worker

  def csv_file(factory, worker_index, path, format, delimiter, chunk_size):
    return factory.pyro_register(csv_file_array(worker_index, path, format, delimiter, chunk_size))

  class csv_file_array(slycat.analysis.plugin.worker.array):
    def __init__(self, worker_index, path, format, delimiter, chunk_size):
      slycat.analysis.plugin.worker.array.__init__(self, worker_index)
      self.path = path
      self.delimiter = delimiter
      self.chunk_size = chunk_size
      self.record_count = None
      if format is None:
        with open(path, "r") as stream:
          line = stream.next()
          self._attributes = [{"name":name.strip(), "type":"string"} for name in line.split(self.delimiter)]
        self.format = ["string" for attribute in self._attributes]
      else:
        with open(self.path, "r") as stream:
          line = stream.next()
          self._attributes = [{"name":name.strip(), "type":type} for name, type in zip(line.split(self.delimiter), format)]
        self.format = [type for attribute, type in zip(self._attributes, format)]

    def update_metrics(self):
      # Count the number of lines in the file.
      if self.record_count is None:
        with open(self.path, "r") as stream:
          self.record_count = 0
          for line in stream:
            self.record_count += 1
          self.record_count -= 1 # Skip the header

      # If the caller didn't specify a chunk size, split the file evenly among workers.
      if self.chunk_size is None:
        self.chunk_size = int(numpy.ceil(self.record_count / self.worker_count))

    def dimensions(self):
      self.update_metrics()
      return [{"name":"i", "type":"int64", "begin":0, "end":self.record_count, "chunk-size":self.chunk_size}]
    def attributes(self):
      return self._attributes
    def iterator(self):
      self.update_metrics()
      return self.pyro_register(csv_file_array_iterator(self))
    def file_path(self):
      return self.path
    def file_size(self):
      return os.stat(self.path).st_size

  class csv_file_array_iterator(slycat.analysis.plugin.worker.array_iterator):
    def __init__(self, owner):
      slycat.analysis.plugin.worker.array_iterator.__init__(self, owner)
      self.stream = open(owner.path, "r")
      self.stream.next() # Skip the header
      self.chunk_count = 0
    def next(self):
      while self.chunk_count % self.owner.worker_count != self.owner.worker_index:
        for index, line in enumerate(self.stream):
          if index + 1 == self.owner.chunk_size:
            self.chunk_count += 1
            break
        else:
          raise StopIteration()

      self.lines = []
      for index, line in enumerate(self.stream):
        self.lines.append(line.split(self.owner.delimiter))
        if index + 1 == self.owner.chunk_size:
          break

      self.chunk_count += 1

      if not len(self.lines):
        raise StopIteration()
    def coordinates(self):
      return numpy.array([(self.chunk_count - 1) * self.owner.chunk_size], dtype="int64")
    def shape(self):
      return numpy.array([len(self.lines)], dtype="int64")
    def values(self, attribute):
      return numpy.ma.array([line[attribute].strip() for line in self.lines], dtype=self.owner.format[attribute])
  context.register_plugin_function("csv_file", csv_file)

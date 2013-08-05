# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from __future__ import division

def register_coordinator_plugin(context):
  def csv_file(factory, path, **keywords):
    format = keywords.get("format", None)
    delimiter = keywords.get("delimiter", ",")
    chunk_size = keywords.get("chunk_size", None)
    if chunk_size is not None:
      if not isinstance(chunk_size, int):
        raise InvalidArgument("chunk_size must be an integer.")
    array_workers = []
    for worker_index, worker in enumerate(factory.workers()):
      array_workers.append(worker.csv_file(worker_index, path, format, delimiter, chunk_size))
    return factory.pyro_register(factory.file_array(array_workers, []))
  context.add_operator("csv_file", csv_file)

def register_worker_plugin(context):
  import numpy
  import os

  from slycat.analysis.worker.api import log, array, array_iterator

  def csv_file(factory, worker_index, path, format, delimiter, chunk_size):
    return factory.pyro_register(csv_file_array(worker_index, path, format, delimiter, chunk_size))

  class csv_file_array(array):
    def __init__(self, worker_index, path, format, delimiter, chunk_size):
      array.__init__(self, worker_index)
      self.path = path
      self.delimiter = delimiter
      self.chunk_size = chunk_size
      self.line_count = None
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
      if self.line_count is None:
        with open(self.path, "r") as stream:
          self.line_count = 0
          for line in stream:
            self.line_count += 1
          self.line_count -= 1 # Skip the header
      # If the caller didn't specify a chunk size, split the file evenly among workers.
      if self.chunk_size is None:
        self.chunk_size = int(numpy.ceil(self.line_count / self.worker_count))

    def dimensions(self):
      self.update_metrics()
      return [{"name":"i", "type":"int64", "begin":0, "end":self.line_count, "chunk-size":self.chunk_size}]
    def attributes(self):
      return self._attributes
    def iterator(self):
      self.update_metrics()
      return self.pyro_register(csv_file_array_iterator(self))
    def file_path(self):
      return self.path
    def file_size(self):
      return os.stat(self.path).st_size

  class csv_file_array_iterator(array_iterator):
    def __init__(self, owner):
      array_iterator.__init__(self, owner)
      self.stream = open(owner.path, "r")
      self.stream.next() # Skip the header
      self.chunk_count = 0
    def next(self):
      while self.chunk_count % self.owner.worker_count != self.owner.worker_index:
        log.debug("worker %s skipping chunk %s", self.owner.worker_index, self.chunk_count)
        for index, line in enumerate(self.stream):
          if index + 1 == self.owner.chunk_size:
            self.chunk_count += 1
            break
        else:
          log.debug("worker %s stopping iteration while skipping", self.owner.worker_index)
          raise StopIteration()

      log.debug("worker %s loading chunk %s", self.owner.worker_index, self.chunk_count)
      self.lines = []
      for index, line in enumerate(self.stream):
        self.lines.append(line.split(self.owner.delimiter))
        if index + 1 == self.owner.chunk_size:
          break

      self.chunk_count += 1

      if not len(self.lines):
        log.debug("worker %s stopping iteration after loading", self.owner.worker_index)
        raise StopIteration()
    def coordinates(self):
      return numpy.array([(self.chunk_count - 1) * self.owner.chunk_size], dtype="int64")
    def shape(self):
      return numpy.array([len(self.lines)], dtype="int64")
    def values(self, attribute):
      return numpy.array([line[attribute].strip() for line in self.lines], dtype=self.owner.format[attribute])
  context.add_operator("csv_file", csv_file)

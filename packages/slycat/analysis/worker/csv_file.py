# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy
import os

from slycat.analysis.worker.api import log, array, array_iterator

class csv_file_array(array):
  def __init__(self, worker_index, path, chunk_size, format):
    array.__init__(self, worker_index)
    self.path = path
    self.delimiter = ","
    self.chunk_size = chunk_size
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
  def dimensions(self):
    with open(self.path, "r") as stream:
      end = 0
      for line in stream:
        end += 1
      end -= 1 # Skip the header
    return [{"name":"i", "type":"int64", "begin":0, "end":end, "chunk-size":self.chunk_size}]
  def attributes(self):
    return self._attributes
  def iterator(self):
    return self.pyro_register(csv_file_array_iterator(self, self.path, self.chunk_size, self.delimiter, self.format, self.worker_index, len(self.siblings)))
  def file_path(self):
    return self.path
  def file_size(self):
    return os.stat(self.path).st_size

class csv_file_array_iterator(array_iterator):
  def __init__(self, owner, path, chunk_size, delimiter, format, worker_index, worker_count):
    array_iterator.__init__(self, owner)
    self.stream = open(path, "r")
    self.stream.next() # Skip the header
    self.chunk_size = chunk_size
    self.delimiter = delimiter
    self.format = format
    self.worker_index = worker_index
    self.worker_count = worker_count
    self.chunk_count = 0
  def next(self):
    while self.chunk_count % self.worker_count != self.worker_index:
      log.debug("worker %s skipping chunk %s", self.worker_index, self.chunk_count)
      for index, line in enumerate(self.stream):
        if index + 1 == self.chunk_size:
          self.chunk_count += 1
          break
      else:
        log.debug("worker %s stopping iteration while skipping", self.worker_index)
        raise StopIteration()

    log.debug("worker %s loading chunk %s", self.worker_index, self.chunk_count)
    self.lines = []
    for index, line in enumerate(self.stream):
      self.lines.append(line.split(self.delimiter))
      if index + 1 == self.chunk_size:
        break

    self.chunk_count += 1

    if not len(self.lines):
      log.debug("worker %s stopping iteration after loading", self.worker_index)
      raise StopIteration()
  def coordinates(self):
    return numpy.array([(self.chunk_count - 1) * self.chunk_size], dtype="int64")
  def shape(self):
    return numpy.array([len(self.lines)], dtype="int64")
  def values(self, attribute):
    return numpy.array([line[attribute].strip() for line in self.lines], dtype=self.format[attribute])


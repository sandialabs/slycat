# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy
import os

from slycat.analysis.worker.api import log, array, array_iterator

class prn_file_array(array):
  def __init__(self, worker_index, path, chunk_size):
    array.__init__(self, worker_index)
    self.path = path
    self.chunk_size = chunk_size
  def dimensions(self):
    with open(self.path, "r") as stream:
      end = 0
      for line in stream:
        end += 1
      if line.strip() == "End of Xyce(TM) Simulation":
        end -= 1
      end -= 1 # Skip the header
    return [{"name":"i", "type":"int64", "begin":0, "end":end, "chunk-size":self.chunk_size}]
  def attributes(self):
    with open(self.path, "r") as stream:
      line = stream.next()
      return [{"name":name, "type":"int64" if name == "Index" else "float64"} for name in line.split()]
  def iterator(self):
    return self.pyro_register(prn_file_array_iterator(self, self.path, self.chunk_size, self.worker_index, len(self.siblings)))
  def file_path(self):
    return self.path
  def file_size(self):
    return os.stat(self.path).st_size

class prn_file_array_iterator(array_iterator):
  def __init__(self, owner, path, chunk_size, worker_index, worker_count):
    array_iterator.__init__(self, owner)
    self.stream = open(path, "r")
    self.stream.next() # Skip the header
    self.chunk_size = chunk_size
    self.worker_index = worker_index
    self.worker_count = worker_count
    self.chunk_id = -1
    self.lines = []
  def next(self):
    self.lines = []
    self.chunk_id += 1
    while self.chunk_id % self.worker_count != self.worker_index:
      try:
        for i in range(self.chunk_size):
          line = self.stream.next()
          if line.strip() == "End of Xyce(TM) Simulation":
            raise StopIteration()
      except StopIteration:
        raise StopIteration()
      self.chunk_id += 1
    try:
      for i in range(self.chunk_size):
        line = self.stream.next()
        if line.strip() == "End of Xyce(TM) Simulation":
          raise StopIteration()
        self.lines.append(line.split())
    except StopIteration:
      pass
    if not len(self.lines):
      raise StopIteration()
  def coordinates(self):
    return numpy.array([self.chunk_id * self.chunk_size], dtype="int64")
  def shape(self):
    return numpy.array([len(self.lines)], dtype="int64")
  def values(self, attribute):
    if attribute == 0: # Index
      return numpy.array([int(line[attribute]) for line in self.lines], dtype="int64")
    else:
      return numpy.array([float(line[attribute]) for line in self.lines], dtype="float64")


# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_coordinator_plugin(context):
  from slycat.analysis.client import require_chunk_size
  import slycat.analysis.coordinator

  def prn_file(factory, path, **keywords):
    chunk_size = keywords.get("chunk_size", None)
    if chunk_size is not None:
      chunk_size = require_chunk_size(chunk_size)
    array_workers = []
    for worker_index, worker in enumerate(factory.workers()):
      array_workers.append(worker.call_plugin_function("prn_file", worker_index, path, chunk_size))
    return factory.pyro_register(slycat.analysis.coordinator.file_array(array_workers, []))
  context.register_plugin_function("prn_file", prn_file)

def register_worker_plugin(context):
  import numpy
  import os

  import slycat.analysis.worker

  def prn_file(factory, worker_index, path, chunk_size):
    return factory.pyro_register(prn_file_array(worker_index, path, chunk_size))

  class prn_file_array(slycat.analysis.worker.array):
    def __init__(self, worker_index, path, chunk_size):
      slycat.analysis.worker.array.__init__(self, worker_index)
      self.path = path
      self.chunk_size = chunk_size
      self.line_count = None
    def update_metrics(self):
      # Count the number of lines in the file.
      if self.line_count is None:
        with open(self.path, "r") as stream:
          self.line_count = 0
          for line in stream:
            self.line_count += 1
          if line.strip() == "End of Xyce(TM) Simulation":
            self.line_count -= 1
          self.line_count -= 1 # Skip the header
      # If the caller didn't specify a chunk size, split the file evenly among workers.
      if self.chunk_size is None:
        self.chunk_size = int(numpy.ceil(self.line_count / self.worker_count))

    def dimensions(self):
      self.update_metrics()
      return [{"name":"i", "type":"int64", "begin":0, "end":self.line_count, "chunk-size":self.chunk_size}]
    def attributes(self):
      with open(self.path, "r") as stream:
        line = stream.next()
        return [{"name":name, "type":"int64" if name == "Index" else "float64"} for name in line.split()]
    def iterator(self):
      self.update_metrics()
      return self.pyro_register(prn_file_array_iterator(self))
    def file_path(self):
      return self.path
    def file_size(self):
      return os.stat(self.path).st_size

  class prn_file_array_iterator(slycat.analysis.worker.array_iterator):
    def __init__(self, owner):
      slycat.analysis.worker.array_iterator.__init__(self, owner)
      self.stream = open(owner.path, "r")
      self.stream.next() # Skip the header
      self.chunk_id = -1
      self.lines = []
    def next(self):
      self.lines = []
      self.chunk_id += 1
      while self.chunk_id % self.owner.worker_count != self.owner.worker_index:
        try:
          for i in range(self.owner.chunk_size):
            line = self.stream.next()
            if line.strip() == "End of Xyce(TM) Simulation":
              raise StopIteration()
        except StopIteration:
          raise StopIteration()
        self.chunk_id += 1
      try:
        for i in range(self.owner.chunk_size):
          line = self.stream.next()
          if line.strip() == "End of Xyce(TM) Simulation":
            raise StopIteration()
          self.lines.append(line.split())
      except StopIteration:
        pass
      if not len(self.lines):
        raise StopIteration()
    def coordinates(self):
      return numpy.array([self.chunk_id * self.owner.chunk_size], dtype="int64")
    def shape(self):
      return numpy.array([len(self.lines)], dtype="int64")
    def values(self, attribute):
      if attribute == 0: # Index
        return numpy.ma.array([int(line[attribute]) for line in self.lines], dtype="int64")
      else:
        return numpy.ma.array([float(line[attribute]) for line in self.lines], dtype="float64")
  context.register_plugin_function("prn_file", prn_file)

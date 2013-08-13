# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_client_plugin(context):
  import slycat.analysis.plugin.client
  import StringIO

  def prn_file(connection, path, chunk_size=None):
    """Load an array from a PRN file.

    Signature: prn_file(path, chunk_size=None)

    Loads data from a single PRN file, partitioned in round-robin order
    among workers.  Use the "chunk_size" parameter to specify the maximum chunk
    size of the output array.  Otherwise, the file will be evenly split into N
    chunks, one on each of N workers."""
    if chunk_size is not None:
      chunk_size = slycat.analysis.plugin.client.require_chunk_size(chunk_size)
    return connection.create_remote_file_array("prn_file", [], path, chunk_size)

  schema_doc = "\n".join([line.strip() for line in StringIO.StringIO(prn_file.__doc__).readlines()][4:])
  context.register_plugin_function("prn_file", prn_file, metadata={"load-schema":"prn-file", "load-schema-doc":schema_doc})

def register_worker_plugin(context):
  import numpy
  import os
  import re
  import slycat.analysis.plugin.worker

  def prn_file(factory, worker_index, path, chunk_size):
    return factory.pyro_register(prn_file_array(worker_index, path, chunk_size))

  class prn_file_array(slycat.analysis.plugin.worker.array):
    def __init__(self, worker_index, path, chunk_size):
      slycat.analysis.plugin.worker.array.__init__(self, worker_index)
      self.path = path
      self.record_count = None
      self.chunk_size = chunk_size
    def update_metrics(self):
      # Count the number of lines in the file.
      if self.record_count is None:
        with open(self.path, "r") as stream:
          self.record_count = 0
          for line in stream:
            self.record_count += 1
          if re.search("End\sof\sXyce(TM)\sSimulation", line) is not None:
            self.record_count -= 1
          self.record_count -= 1 # Skip the header
      # If the caller didn't specify a chunk size, split the file evenly among workers.
      if self.chunk_size is None:
        self.chunk_size = int(numpy.ceil(self.record_count / self.worker_count))

    def dimensions(self):
      self.update_metrics()
      return [{"name":"i", "type":"int64", "begin":0, "end":self.record_count, "chunk-size":self.chunk_size}]
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

  class prn_file_array_iterator(slycat.analysis.plugin.worker.array_iterator):
    def __init__(self, owner):
      slycat.analysis.plugin.worker.array_iterator.__init__(self, owner)
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

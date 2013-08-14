# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_client_plugin(context):
  import slycat.analysis.plugin.client
  import StringIO

  def prn_files(connection, path, chunk_size=None):
    """Load an array from multiple PRN files.

    Signature: prn_files(path, chunk_size=None)

    Loads data from multiple PRN files, partitioned in round-robin order among
    workers.  Pass the files to be loaded as a sequence of strings to the
    "path" parameter.The output array attributes will contain the intersection
    of the variables in the PRN files, plus a "file_id" attribute.  Specify the
    files to be loaded as a sequence of strings to the "path" parameter.  Use
    the "chunk_size" parameter to specify the maximum chunk size of the output
    array.  Otherwise, the chunk size will default to ____."""
    if isinstance(path, basestring):
      path = [path]
    if chunk_size is not None:
      chunk_size = slycat.analysis.plugin.client.require_chunk_size(chunk_size)
    return connection.create_remote_file_array("prn_files", [], path, chunk_size)

  schema_doc = "\n".join([line.strip() for line in StringIO.StringIO(prn_files.__doc__).readlines()][4:])
  context.register_plugin_function("prn_files", prn_files, metadata={"load-schema":"prn-files", "load-schema-doc":schema_doc})

def register_worker_plugin(context):
  import numpy
  import os
  import Pyro4
  import re

  import slycat.analysis.plugin.worker

  def prn_files(factory, worker_index, paths, chunk_size):
    return factory.pyro_register(prn_files_array(worker_index, paths, chunk_size))

  class prn_files_array(slycat.analysis.plugin.worker.array):
    def __init__(self, worker_index, paths, chunk_size):
      slycat.analysis.plugin.worker.array.__init__(self, worker_index)
      self.paths = paths
      self.chunk_size = chunk_size
      self.record_count = None
      self.output_attributes = None

    def local_record_count(self):
      record_count = 0
      for index, path in enumerate(self.paths):
        if (index % self.worker_count) != self.worker_index:
          continue
        with open(path, "r") as stream:
          for line in stream:
            record_count += 1
          if re.search("End\sof\sXyce(TM)\sSimulation", line) is not None:
            record_count -= 1
          record_count -= 1 # Skip the header
      return record_count

    def update_dimensions(self):
      # Count the number of lines in the file.
      if self.record_count is None:
        local_record_counts = [Pyro4.async(sibling).local_record_count() for sibling in self.siblings]
        local_record_counts = [local_record_count.value for local_record_count in local_record_counts]
        self.record_count = sum(local_record_counts)

      # If the caller didn't specify a chunk size, split the file evenly among workers.
      if self.chunk_size is None:
        self.chunk_size = int(numpy.ceil(self.record_count / self.worker_count))

    def local_attributes(self):
      unique_attributes = set()
      attributes = []
      for index, path in enumerate(self.paths):
        if (index % self.worker_count) != self.worker_index:
          continue
        with open(path, "r") as stream:
          line = stream.next()
          for name in line.split():
            if name not in unique_attributes:
              unique_attributes.add(name)
              attributes.append(name)
      return attributes

    def update_attributes(self):
      if self.output_attributes is None:
        local_attributes_list = [Pyro4.async(sibling).local_attributes() for sibling in self.siblings]
        local_attributes_list = [local_attributes.value for local_attributes in local_attributes_list]
        unique_global_attributes = set()
        global_attributes = []
        for local_attributes in local_attributes_list:
          for name in local_attributes:
            if name not in unique_global_attributes:
              unique_global_attributes.add(name)
              global_attributes.append(name)
        self.output_attributes = [{"name":name, "type":"int64" if name == "Index" else "float64"} for name in global_attributes]

    def dimensions(self):
      self.update_dimensions()
      return [{"name":"i", "type":"int64", "begin":0, "end":self.record_count, "chunk-size":self.chunk_size}]

    def attributes(self):
      self.update_attributes()
      return self.output_attributes

    def iterator(self):
      self.update_dimensions()
      self.update_attributes()
      return self.pyro_register(prn_files_array_iterator(self))

    def file_path(self):
      return self.paths

    def local_file_size(self):
      return sum([os.stat(path).st_size for index, path in enumerate(self.paths) if index % self.worker_count == self.worker_index])

    def file_size(self):
      local_file_sizes = [Pyro4.async(sibling).local_file_size() for sibling in self.siblings]
      local_file_sizes = [local_file_size.value for local_file_size in local_file_sizes]
      return sum(local_file_sizes)

  class prn_files_array_iterator(slycat.analysis.plugin.worker.array_iterator):
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

  context.register_plugin_function("prn_files", prn_files)

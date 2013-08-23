# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from __future__ import division

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
  import collections
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
      self.slices = None
      self.record_count = None
      self.output_attributes = None

    def local_slices(self):
      slices = []
      for index, path in enumerate(self.paths):
        if (index % self.worker_count) == self.worker_index:
          with open(path, "r") as stream:
            begin = 1 # Skip the header
            end = 0
            for line in stream:
              end += 1
            if re.search("End\sof\sXyce\(TM\)\sSimulation", line) is not None:
              end -= 1
            slices.append((index, (begin, end)))
      return slices

    def set_slices(self, slices):
      self.slices = slices
      self.record_count = sum([end - begin for begin, end in slices])

      # If the caller didn't specify a chunk size, pick a reasonable default.
      if self.chunk_size is None:
        self.chunk_size = int(numpy.ceil(self.record_count / len(self.paths)))

    def update_dimensions(self):
      if self.record_count is None:
        local_slice_lists = [Pyro4.async(sibling).local_slices() for sibling in self.siblings]
        local_slice_lists = [local_slices.value for local_slices in local_slice_lists]
        slices = sorted([slice for local_slices in local_slice_lists for slice in local_slices])
        slices = [slice[1] for slice in slices]
        for sibling in self.siblings:
          sibling.set_slices(slices)

    def local_names(self):
      common_names = None
      for index, path in enumerate(self.paths):
        if (index % self.worker_count) == self.worker_index:
          with open(path, "r") as stream:
            names = collections.OrderedDict([(name, None) for name in stream.next().split()])
            if common_names is None:
              common_names = names
            else:
              common_names = collections.OrderedDict([(name, None) for name in common_names if name in names])
      return common_names

    def update_attributes(self):
      if self.output_attributes is None:
        local_names_list = [Pyro4.async(sibling).local_names() for sibling in self.siblings]
        local_names_list = [local_names.value for local_names in local_names_list]
        common_names = None
        for names in local_names_list:
          if common_names is None:
            common_names = names
          elif names is not None:
            common_names = collections.OrderedDict([(name, None) for name in common_names if name in names])

        self.output_attributes = [{"name":"file", "type":"int64"}] + [{"name":name, "type":"int64" if name == "Index" else "float64"} for name in common_names]

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
      return numpy.array([os.stat(path).st_size for index, path in enumerate(self.paths) if index % self.worker_count == self.worker_index], dtype="int64")

    def file_size(self):
      local_file_sizes = [Pyro4.async(sibling).local_file_size() for sibling in self.siblings]
      local_file_sizes = [local_file_size.value for local_file_size in local_file_sizes]
      return numpy.concatenate(local_file_sizes)

  class prn_files_array_iterator(slycat.analysis.plugin.worker.array_iterator):
    def __init__(self, owner):
      slycat.analysis.plugin.worker.array_iterator.__init__(self, owner)
      self.iterator = slycat.analysis.plugin.worker.partition_files(self.owner.paths, self.owner.slices, self.owner.worker_index, self.owner.worker_count, self.owner.chunk_size)

    def next(self):
      self.lines = []
      for file_index, record, chunk_start, chunk_end, line in self.iterator:
        if chunk_start:
          self.file_index = file_index
          self.record = record
        self.lines.append(line.split())
        if chunk_end:
          break
      if not self.lines:
        raise StopIteration()

    def coordinates(self):
      return numpy.array([self.record], dtype="int64")

    def shape(self):
      return numpy.array([len(self.lines)], dtype="int64")

    def values(self, attribute):
      if attribute == 0: # file
        result = numpy.ma.empty(len(self.lines), dtype="int64")
        result.fill(self.file_index)
        return result
      if attribute == 1: # Index
        return numpy.ma.array([int(line[attribute-1]) for line in self.lines], dtype="int64")
      else:
        return numpy.ma.array([float(line[attribute-1]) for line in self.lines], dtype="float64")

  context.register_plugin_function("prn_files", prn_files)

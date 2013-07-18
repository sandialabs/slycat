# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import ast
import math
import numpy
import os
import Pyro4
import sys

from slycat.analysis.worker.api import log, pyro_object, array, array_iterator, null_array_iterator, chunk_iterator, chunk_range, chunk_count
import slycat.analysis.worker.aggregate
import slycat.analysis.worker.apply
import slycat.analysis.worker.chunk_map
import slycat.analysis.worker.csv_file
import slycat.analysis.worker.redimension

class factory(pyro_object):
  """Top-level factory for worker objects."""
  def __init__(self):
    pyro_object.__init__(self)
  def shutdown(self):
    log.info("Client requested shutdown.")
    self._pyroDaemon.shutdown()
  def require_object(self, uri):
    """Lookup a Pyro URI, returning the corresponding Python object."""
    return self._pyroDaemon.objectsById[uri.asString().split(":")[1].split("@")[0]]
  def aggregate(self, worker_index, source, expressions):
    return self.pyro_register(slycat.analysis.worker.aggregate.aggregate_array(worker_index, self.require_object(source), expressions))
  def apply(self, worker_index, source, attribute, expression):
    return self.pyro_register(slycat.analysis.worker.apply.apply_array(worker_index, self.require_object(source), attribute, expression))
  def array(self, worker_index, initializer, type):
    return self.pyro_register(array_array(worker_index, initializer, type))
  def attributes(self, worker_index, source):
    return self.pyro_register(attributes_array(worker_index, self.require_object(source)))
  def attribute_rename(self, worker_index, source, attributes):
    return self.pyro_register(attribute_rename_array(worker_index, self.require_object(source), attributes))
  def chunk_map(self, worker_index, source):
    return self.pyro_register(slycat.analysis.worker.chunk_map.chunk_map_array(worker_index, self.require_object(source)))
  def csv_file(self, worker_index, path, chunk_size, format):
    return self.pyro_register(slycat.analysis.worker.csv_file.csv_file_array(worker_index, path, chunk_size, format))
  def dimensions(self, worker_index, source):
    return self.pyro_register(dimensions_array(worker_index, self.require_object(source)))
  def prn_file(self, worker_index, path, chunk_size):
    return self.pyro_register(prn_file_array(worker_index, path, chunk_size))
  def project(self, worker_index, source, attributes):
    return self.pyro_register(project_array(worker_index, self.require_object(source), attributes))
  def random(self, worker_index, shape, chunk_sizes, seed):
    return self.pyro_register(random_array(worker_index, shape, chunk_sizes, seed))
  def redimension(self, worker_index, source, dimensions, attributes):
    return self.pyro_register(slycat.analysis.worker.redimension.redimension_array(worker_index, self.require_object(source), dimensions, attributes))
  def zeros(self, worker_index, shape, chunk_sizes):
    return self.pyro_register(zeros_array(worker_index, shape, chunk_sizes))

class array_array(array):
  def __init__(self, worker_index, initializer, type):
    array.__init__(self, worker_index)
    self.chunk = numpy.array(initializer, dtype=type)
    self.type = type
  def dimensions(self):
    return [{"name":"d%s" % index, "type":"int64", "begin":0, "end":size, "chunk-size":size} for index, size in enumerate(self.chunk.shape)]
  def attributes(self):
    return [{"name":"val", "type":self.type}]
  def iterator(self):
    if 0 == self.worker_index:
      return self.pyro_register(array_array_iterator(self))
    else:
      return self.pyro_register(null_array_iterator(self))

class array_array_iterator(array_iterator):
  def __init__(self, owner):
    array_iterator.__init__(self, owner)
    self.iterations = 0
  def next(self):
    if self.iterations:
      raise StopIteration()
    self.iterations += 1
  def coordinates(self):
    return numpy.array([0], dtype="int64")
  def shape(self):
    return self.owner.chunk.shape
  def values(self, attribute):
    return self.owner.chunk

class attributes_array(array):
  def __init__(self, worker_index, source):
    array.__init__(self, worker_index)
    self.source_attributes = source.attributes()
  def dimensions(self):
    return [{"name":"i", "type":"int64", "begin":0, "end":len(self.source_attributes), "chunk-size":len(self.source_attributes)}]
  def attributes(self):
    return [{"name":"name", "type":"string"}, {"name":"type", "type":"string"}]
  def iterator(self):
    if 0 == self.worker_index:
      return self.pyro_register(attributes_array_iterator(self))
    else:
      return self.pyro_register(null_array_iterator(self))

class attributes_array_iterator(array_iterator):
  def __init__(self, owner):
    array_iterator.__init__(self, owner)
    self.iterations = 0
  def next(self):
    if self.iterations:
      raise StopIteration()
    self.iterations += 1
  def coordinates(self):
    return numpy.array([0], dtype="int64")
  def shape(self):
    return numpy.array([len(self.owner.source_attributes)], dtype="int64")
  def values(self, attribute):
    if attribute == 0:
      return numpy.array([attribute["name"] for attribute in self.owner.source_attributes], dtype="string")
    elif attribute == 1:
      return numpy.array([attribute["type"] for attribute in self.owner.source_attributes], dtype="string")

class attribute_rename_array(array):
  def __init__(self, worker_index, source, attributes):
    array.__init__(self, worker_index)
    self.source = source
    self.name_map = {attribute["name"]:attribute["name"] for attribute in self.source.attributes()}
    for old_name, new_name in attributes:
      self.name_map[old_name] = new_name
  def dimensions(self):
    return self.source.dimensions()
  def attributes(self):
    return [{"name":self.name_map[attribute["name"]], "type":attribute["type"]} for attribute in self.source.attributes()]
  def iterator(self):
    return self.source.iterator()

class dimensions_array(array):
  def __init__(self, worker_index, source):
    array.__init__(self, worker_index)
    self.source_dimensions = source.dimensions()
  def dimensions(self):
    return [{"name":"i", "type":"int64", "begin":0, "end":len(self.source_dimensions), "chunk-size":len(self.source_dimensions)}]
  def attributes(self):
    return [{"name":"name", "type":"string"}, {"name":"type", "type":"string"}, {"name":"begin", "type":"int64"}, {"name":"end", "type":"int64"}, {"name":"chunk-size", "type":"int64"}]
  def iterator(self):
    if self.worker_index == 0:
      return self.pyro_register(dimensions_array_iterator(self))
    else:
      return self.pyro_register(null_array_iterator(self))

class dimensions_array_iterator(array_iterator):
  def __init__(self, owner):
    array_iterator.__init__(self, owner)
    self.iterations = 0
  def next(self):
    if self.iterations:
      raise StopIteration()
    self.iterations += 1
  def coordinates(self):
    return numpy.array([0], dtype="int64")
  def shape(self):
    return numpy.array([len(self.owner.source_dimensions)], dtype="int64")
  def values(self, attribute):
    if attribute == 0:
      return numpy.array([dimension["name"] for dimension in self.owner.source_dimensions], dtype="string")
    elif attribute == 1:
      return numpy.array([dimension["type"] for dimension in self.owner.source_dimensions], dtype="string")
    elif attribute == 2:
      return numpy.array([dimension["begin"] for dimension in self.owner.source_dimensions], dtype="int64")
    elif attribute == 3:
      return numpy.array([dimension["end"] for dimension in self.owner.source_dimensions], dtype="int64")
    elif attribute == 4:
      return numpy.array([dimension["chunk-size"] for dimension in self.owner.source_dimensions], dtype="int64")

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
      return [{"name":name, "type":"int64" if name == "Index" else "double"} for name in line.split()]
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
      return numpy.array([float(line[attribute]) for line in self.lines], dtype="double")

class project_array(array):
  def __init__(self, worker_index, source, attributes):
    array.__init__(self, worker_index)
    self.source = source
    source_attributes = self.source.attributes()
    source_map = dict([(i, i) for i in range(len(source_attributes))] + [(attribute["name"], index) for index, attribute in enumerate(source_attributes)])
    self.indices = [source_map[attribute] for attribute in attributes if attribute in source_map]
  def dimensions(self):
    return self.source.dimensions()
  def attributes(self):
    source_attributes = self.source.attributes()
    return [source_attributes[index] for index in self.indices]
  def iterator(self):
    return self.pyro_register(project_array_iterator(self, self.source, self.indices))

class project_array_iterator(array_iterator):
  def __init__(self, owner, source, indices):
    array_iterator.__init__(self, owner)
    self.iterator = source.iterator()
    self.indices = indices
  def __del__(self):
    self.iterator.release()
  def next(self):
    self.iterator.next()
  def coordinates(self):
    return self.iterator.coordinates()
  def shape(self):
    return self.iterator.shape()
  def values(self, attribute):
    return self.iterator.values(self.indices[attribute])

class random_array(array):
  def __init__(self, worker_index, shape, chunk_sizes, seed):
    array.__init__(self, worker_index)
    self.shape = shape
    self.chunk_sizes = chunk_sizes
    self.seed = seed
  def dimensions(self):
    return [{"name":"d%s" % index, "type":"int64", "begin":0, "end":dimension, "chunk-size":chunk_size} for index, (dimension, chunk_size) in enumerate(zip(self.shape, self.chunk_sizes))]
  def attributes(self):
    return [{"name":"val", "type":"float64"}]
  def iterator(self):
    return self.pyro_register(random_array_iterator(self, self.shape, self.chunk_sizes, self.seed, self.worker_index, len(self.siblings)))

class random_array_iterator(array_iterator):
  def __init__(self, owner, shape, chunk_sizes, seed, worker_index, worker_count):
    array_iterator.__init__(self, owner)
    self.seed = seed
    self.iterator = chunk_iterator(shape, chunk_sizes, chunk_range(chunk_count(shape, chunk_sizes), worker_index, worker_count))
  def next(self):
    self.chunk_id, self.begin, self.end = self.iterator.next()
  def coordinates(self):
    return self.begin
  def shape(self):
    return self.end - self.begin
  def values(self, index):
    generator = numpy.random.RandomState()
    generator.seed(self.seed + self.chunk_id)
    return generator.random_sample(self.end - self.begin)

class zeros_array(array):
  def __init__(self, worker_index, shape, chunk_sizes):
    array.__init__(self, worker_index)
    self.shape = shape
    self.chunk_sizes = chunk_sizes
  def dimensions(self):
    return [{"name":"d%s" % index, "type":"int64", "begin":0, "end":dimension, "chunk-size":chunk_size} for index, (dimension, chunk_size) in enumerate(zip(self.shape, self.chunk_sizes))]
  def attributes(self):
    return [{"name":"val", "type":"float64"}]
  def iterator(self):
    return self.pyro_register(zeros_array_iterator(self, self.shape, self.chunk_sizes, self.worker_index, len(self.siblings)))

class zeros_array_iterator(array_iterator):
  def __init__(self, owner, shape, chunk_sizes, worker_index, worker_count):
    array_iterator.__init__(self, owner)
    self.iterator = chunk_iterator(shape, chunk_sizes, chunk_range(chunk_count(shape, chunk_sizes), worker_index, worker_count))
  def next(self):
    chunk_id, self.begin, self.end = self.iterator.next()
  def coordinates(self):
    return self.begin
  def shape(self):
    return self.end - self.begin
  def values(self, index):
    return numpy.zeros(self.end - self.begin)


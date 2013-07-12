# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import ast
import math
import numpy
import os
import Pyro4
import sys

import slycat.analysis.worker.accumulator
import slycat.analysis.worker.redimension
from slycat.analysis.worker.api import log, pyro_object, array, array_iterator, null_array_iterator, chunk_iterator, chunk_range, chunk_count

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
    return self.pyro_register(aggregate_array(worker_index, self.require_object(source), expressions))
  def apply(self, worker_index, source, attribute, expression):
    return self.pyro_register(apply_array(worker_index, self.require_object(source), attribute, expression))
  def array(self, worker_index, initializer, type):
    return self.pyro_register(array_array(worker_index, initializer, type))
  def attributes(self, worker_index, source):
    return self.pyro_register(attributes_array(worker_index, self.require_object(source)))
  def attribute_rename(self, worker_index, source, attributes):
    return self.pyro_register(attribute_rename_array(worker_index, self.require_object(source), attributes))
  def chunk_map(self, worker_index, source):
    return self.pyro_register(chunk_map_array(worker_index, self.require_object(source)))
  def csv_file(self, worker_index, path, chunk_size, format):
    return self.pyro_register(csv_file_array(worker_index, path, chunk_size, format))
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

class aggregate_array(array):
  def __init__(self, worker_index, source, expressions):
    array.__init__(self, worker_index)
    self.source = source
    source_attributes = source.attributes()
    attribute_map = {attribute["name"] : index for index, attribute in enumerate(source_attributes)}
    self.expressions = [(operator, operand, attribute_map[operand], source_attributes[attribute_map[operand]]["type"]) for operator, operand in expressions if operand in attribute_map]
  def dimensions(self):
    return [{"name":"i", "type":"int64", "begin":0, "end":1, "chunk-size":1}]
  def attributes(self):
    return [{"name":"%s_%s" % (operand, operator), "type":type} for operator, operand, index, type in self.expressions]
  def iterator(self):
    if self.worker_index == 0:
      return self.pyro_register(aggregate_array_iterator(self))
    else:
      return self.pyro_register(null_array_iterator(self))
  def calculate_local(self):
    accumulators = [slycat.analysis.worker.accumulator.create(operator) for operator, operand, index, type in self.expressions]
    with self.source.iterator() as source_iterator:
      for ignored in source_iterator:
        for accumulator, (operator, operand, index, type) in zip(accumulators, self.expressions):
          accumulator.accumulate(source_iterator.values(index))
    return accumulators
  def calculate_global(self):
    accumulators = [Pyro4.async(sibling).calculate_local() for sibling in self.siblings]
    accumulators = [accumulator.value for accumulator in accumulators]
    accumulators = zip(*accumulators)
    global_accumulators = [slycat.analysis.worker.accumulator.create(operator) for operator, operand, index, type in self.expressions]
    for local_accumulator, remote_accumulators in zip(global_accumulators, accumulators):
      for remote_accumulator in remote_accumulators:
        local_accumulator.reduce(remote_accumulator)
    return global_accumulators

class aggregate_array_iterator(array_iterator):
  def __init__(self, owner):
    array_iterator.__init__(self, owner)
    self.iterations = 0
  def next(self):
    if self.iterations:
      raise StopIteration()
    self.iterations += 1
    self.accumulators = self.owner.calculate_global()
  def coordinates(self):
    return numpy.array([0], dtype="int64")
  def shape(self):
    return numpy.array([1], dtype="int64")
  def values(self, attribute):
    return numpy.array([self.accumulators[attribute].result()])

class apply_array(array):
  def __init__(self, worker_index, source, attribute, expression):
    array.__init__(self, worker_index)
    self.source = source
    self.attribute = attribute
    self.expression = expression
  def dimensions(self):
    return self.source.dimensions()
  def attributes(self):
    return self.source.attributes() + [self.attribute]
  def iterator(self):
    return self.pyro_register(apply_array_iterator(self, self.source, self.attribute, self.expression))

class apply_array_iterator(array_iterator):
  def __init__(self, owner, source, attribute, expression):
    array_iterator.__init__(self, owner)
    self.iterator = source.iterator()
    self.attribute = attribute
    self.expression = expression
    self.attributes = source.attributes()
    self.dimensions = source.dimensions()
  def __del__(self):
    self.iterator.release()
  def next(self):
    self.iterator.next()
  def coordinates(self):
    return self.iterator.coordinates()
  def shape(self):
    return self.iterator.shape()
  def values(self, attribute):
    if attribute != len(self.attributes):
      return self.iterator.values(attribute)

    class expression_visitor(ast.NodeVisitor):
      def __init__(self, attributes, dimensions, iterator):
        self.iterator = iterator
        self.stack = []
        self.attribute_map = {}
        for attribute in attributes:
          self.attribute_map[attribute["name"]] = len(self.attribute_map)
        self.dimension_map = {}
        for dimension in dimensions:
          self.dimension_map[dimension["name"]] = len(self.dimension_map)
      def visit_UnaryOp(self, object):
        self.stack.append(("unary-operation", object.op))
        ast.NodeVisitor.generic_visit(self, object)
      def visit_BinOp(self, object):
        self.stack.append(("binary-operation", object.op))
        ast.NodeVisitor.generic_visit(self, object)
      def visit_Name(self, object):
        self.stack.append(("name", object.id))
      def visit_Num(self, object):
        self.stack.append(("number", object.n))
      def evaluate(self):
        type, value = self.stack.pop(0)
        if type == "unary-operation":
          expr = self.evaluate()
          if isinstance(value, ast.USub):
            return -expr
          elif isinstance(value, ast.Not):
            return numpy.logical_not(expr)
          else:
            raise Exception("Unknown unary operator type: %s" % (value))
        elif type == "binary-operation":
          lhs = self.evaluate()
          rhs = self.evaluate()
          if isinstance(value, ast.Add):
            return lhs + rhs
          elif isinstance(value, ast.Sub):
            return lhs - rhs
          elif isinstance(value, ast.Mult):
            return lhs * rhs
          elif isinstance(value, ast.Div):
            return lhs / rhs
          elif isinstance(value, ast.Mod):
            return lhs % rhs
          elif isinstance(value, ast.Pow):
            return lhs ** rhs
          else:
            raise Exception("Unknown binary operator type: %s" % (value))
        elif type == "name":
          if value in self.attribute_map:
            return self.iterator.values(self.attribute_map[value])
          if value in self.dimension_map:
            dimension_index = self.dimension_map[value]
            offset = self.iterator.coordinates()[dimension_index]
            shape = self.iterator.shape()
            return offset + numpy.array([coords[dimension_index] for coords in numpy.ndindex(shape)])
          else:
            raise Exception("Unknown name '%s' must be an existing attribute or dimension.")
        elif type == "number":
          return value
        else:
          raise Exception("Unknown operand: %s %s" % (type, value))

    log.debug("Evaluating %s." % ast.dump(self.expression))
    v = expression_visitor(self.attributes, self.dimensions, self.iterator)
    v.visit(self.expression)
    result = v.evaluate()
    return result.astype(self.attribute["type"])

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

class chunk_map_array(array):
  def __init__(self, worker_index, source):
    array.__init__(self, worker_index)
    self.source = source
    self.source_dimensions = source.dimensions()
    self.chunk_map = None
  def local_chunk_map(self):
    results = []
    with self.source.iterator() as iterator:
      for index, ignored in enumerate(iterator):
        results.append((self.worker_index, index, iterator.coordinates(), iterator.shape()))
    return results
  def gather_global_chunk_map(self):
    if self.chunk_map is not None:
      return
    results = [Pyro4.async(sibling).local_chunk_map() for sibling in self.siblings]
    results = [result.value for result in results]
    results = [chunk for result in results for chunk in result]
    self.chunk_map = results
  def dimensions(self):
    self.gather_global_chunk_map()
    chunk_count = len(self.chunk_map)
    return [{"name":"i", "type":"int64", "begin":0, "end":chunk_count, "chunk-size":chunk_count}]
  def attributes(self):
    return [{"name":"worker", "type":"int64"}, {"name":"index", "type":"int64"}] + [{"name":"c%s" % index, "type":dimension["type"]} for index, dimension in enumerate(self.source_dimensions)] + [{"name":"s%s" % index, "type":"int64"} for index, dimension in enumerate(self.source_dimensions)]
  def iterator(self):
    if 0 == self.worker_index:
      return self.pyro_register(chunk_map_iterator(self))
    else:
      return self.pyro_register(null_array_iterator(self))

class chunk_map_iterator(array_iterator):
  def __init__(self, owner):
    array_iterator.__init__(self, owner)
    self.iterations = 0
  def next(self):
    if self.iterations:
      raise StopIteration()
    self.iterations += 1
    self.owner.gather_global_chunk_map()
  def coordinates(self):
    return numpy.array([0], dtype="int64")
  def shape(self):
    return numpy.array([len(self.owner.chunk_map)], dtype="int64")
  def values(self, attribute):
    if attribute == 0: # worker
      return numpy.array([chunk[0] for chunk in self.owner.chunk_map], dtype="int64")
    elif attribute == 1: # index
      return numpy.array([chunk[1] for chunk in self.owner.chunk_map], dtype="int64")
    elif attribute >= 2 and attribute < 2 + len(self.owner.source_dimensions): # coordinates
      return numpy.array([chunk[2][attribute - 2] for chunk in self.owner.chunk_map], dtype="int64")
    else:
      return numpy.array([chunk[3][attribute - 2 - len(self.owner.source_dimensions)] for chunk in self.owner.chunk_map], dtype="int64")

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


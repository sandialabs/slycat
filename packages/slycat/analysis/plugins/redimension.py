# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_client_plugin(context):
  import slycat.analysis.client
  def redimension(connection, source, dimensions, attributes):
    source = slycat.analysis.client.require_array(source)
    dimensions = slycat.analysis.client.require_dimension_names(dimensions)
    attributes = slycat.analysis.client.require_attribute_names(attributes)
    return connection.remote_array(connection.proxy.redimension(connection.require_object(source), dimensions, attributes))
  context.add_operator("redimension", redimension)

def register_coordinator_plugin(context):
  import slycat.analysis.coordinator

  def redimension(factory, source, dimensions, attributes):
    source = factory.require_object(source)
    array_workers = []
    for worker_index, (source_proxy, worker) in enumerate(zip(source.workers, factory.workers())):
      array_workers.append(worker.redimension(worker_index, source_proxy._pyroUri, dimensions, attributes))
    return factory.pyro_register(slycat.analysis.coordinator.array(array_workers, [source]))
  context.add_operator("redimension", redimension)

def register_worker_plugin(context):
  import slycat.analysis.worker
  from slycat.analysis.worker.accumulator import distinct
  import numpy
  import Pyro4

  def redimension(factory, worker_index, source, dimensions, attributes):
    return factory.pyro_register(redimension_array(worker_index, factory.require_object(source), dimensions, attributes))

  class redimension_array(slycat.analysis.worker.array):
    def __init__(self, worker_index, source, dimensions, attributes):
      slycat.analysis.worker.array.__init__(self, worker_index)
      self.source = source
      self.chunks = None
      source_dimensions = source.dimensions()
      source_attributes = source.attributes()
      dimension_map = {dimension["name"]:index for index, dimension in enumerate(source_dimensions)}
      attribute_map = {attribute["name"]:index for index, attribute in enumerate(source_attributes)}

      # Compute the dimensions for the output array ...
      self.target_dimensions = []
      self.target_dimension_sources = []
      for dimension_name in dimensions:
        if dimension_name in attribute_map:
          attribute_index = attribute_map[dimension_name]
          attribute = source_attributes[attribute_index]
          self.target_dimensions.append({"name":attribute["name"], "type":attribute["type"], "begin":0, "end":None, "chunk-size":None}) # Note: we figure-out the actual dimension bounds later.
          self.target_dimension_sources.append(("attribute", attribute_index))
        elif dimension_name in dimension_map:
          dimension_index = dimension_map[dimension_name]
          dimension = source_dimensions[dimension_index]
          self.target_dimensions.append(dimension)
          self.target_dimension_sources.append(("dimension", dimension_index))

      # Compute the attributes for the output array ...
      self.target_attributes = []
      self.target_attribute_sources = []
      for attribute_name in attributes:
        if attribute_name in attribute_map:
          attribute_index = attribute_map[attribute_name]
          attribute = source_attributes[attribute_index]
          self.target_attributes.append(attribute)
          self.target_attribute_sources.append(("attribute", attribute_index))
        elif attribute_name in dimension_map:
          dimension_index = dimension_map[attribute_name]
          dimension = source_dimensions[dimension_index]
          self.target_attributes.append({"name":dimension["name"], "type":dimension["type"]})
          self.target_attribute_sources.append(("dimension", dimension_index))

    def local_attribute_distinct_count(self, attribute):
      accumulator = distinct()
      with self.source.iterator() as source_iterator:
        for ignored in source_iterator:
          accumulator.accumulate(source_iterator.values(attribute))
      return accumulator

    def attribute_distinct_count(self, attribute):
      accumulators = [Pyro4.async(sibling).local_attribute_distinct_count(attribute) for sibling in self.siblings]
      accumulators = [accumulator.value for accumulator in accumulators]
      global_accumulator = distinct()
      for accumulator in accumulators:
        global_accumulator.reduce(accumulator)
      return global_accumulator.result()

    def compute_dimensions(self):
      """Ensures that all dimension bounds are up-to-date."""
      for dimension, (source, index) in zip(self.target_dimensions, self.target_dimension_sources):
        if dimension["end"] is None:
          count = self.attribute_distinct_count(index)
          dimension["end"] = count
          dimension["chunk-size"] = count

    def dimensions(self):
      self.compute_dimensions()
      return self.target_dimensions
    def attributes(self):
      return self.target_attributes
    def iterator(self):
      return self.pyro_register(redimension_array_iterator(self))

    def create_chunks(self):
      if self.chunks is not None:
        return
      self.compute_dimensions()
      shape = [dimension["end"] - dimension["begin"] for dimension in self.target_dimensions]
      chunk_sizes = [dimension["chunk-size"] for dimension in self.target_dimensions]
      all_chunks = list(slycat.analysis.worker.worker_chunks(shape, chunk_sizes, len(self.siblings)))
      if self.worker_index == 0:
        context.log.info("dimensions: %s", self.target_dimension_sources)
        context.log.info("attributes: %s", self.target_attribute_sources)
      self.chunks = [redimension_array_chunk(begin, end - begin, self.target_attributes) for chunk_index, worker_index, begin, end in all_chunks if worker_index == self.worker_index]
      with self.source.iterator() as iterator:
        for ignored in iterator:
          for source_coordinates, target_coordinates in remap(iterator, self.target_dimension_sources):
            context.log.info("%s %s %s", self.worker_index, source_coordinates, target_coordinates)

  class redimension_array_iterator(slycat.analysis.worker.array_iterator):
    def __init__(self, owner):
      slycat.analysis.worker.array_iterator.__init__(self, owner)
      self.index = -1
    def next(self):
      self.owner.create_chunks()
      self.index += 1
      if self.index >= len(self.owner.chunks):
        raise StopIteration()
      self.current_chunk = self.owner.chunks[self.index]
    def coordinates(self):
      return self.current_chunk.coordinates()
    def shape(self):
      return self.current_chunk.shape()
    def values(self, index):
      return self.current_chunk.values(index)

  class redimension_array_chunk:
    def __init__(self, coordinates, shape, attributes):
      self._coordinates = coordinates
      self._shape = shape
      self._values = [numpy.empty(shape, dtype=attribute["type"]) for attribute in attributes]
    def coordinates(self):
      return self._coordinates
    def shape(self):
      return self._shape
    def values(self, index):
      return self._values[index]

  def remap(iterator, dimension_sources):
    begin = iterator.coordinates()
    shape = iterator.shape()
    values_cache = {}
    for coordinates in numpy.ndindex(*shape):
      source_coordinates = begin + coordinates
      target_coordinates = []
      for type, index in dimension_sources:
        if type == "dimension":
          target_coordinates.append(source_coordinates[index])
        elif type == "attribute":
          if index not in values_cache:
            values_cache[index] = iterator.values(index)
          target_coordinates.append(values_cache[index][coordinates])
      yield source_coordinates, target_coordinates
  context.add_operator("redimension", redimension)

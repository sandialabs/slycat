# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_client_plugin(context):
  import slycat.analysis.client

  def chunk_map(connection, source):
    """Return an array that describes how another array's data chunks are distributed.

    Creates a 1D array containing a cell for each chunk in the source array.
    Useful to understand how data is load balanced and to look for hot spots in
    workers.  A "worker" attribute contains the zero-based index of the worker
    where the chunk resides.  Since a worker is generally responsible for many
    chanks, the "index" array contains a zero-based index that identifies the
    chunk within its worker.  Note that the combination of "worker" and
    "index" can be used as a unique global identifier for a chunk.  There will be
    attributes "c[0, N)" - where N is the number of dimensions in the source
    array - storing the lowest-numbered coordinates of the chunk along each
    dimension.  Similarly, attributes "s[0, N]" store the shape of each chunk,
    i.e. its size along each dimension.

      >>> scan(chunk_map(random((100, 100), (40, 40))))
        {i} worker, index, c0, c1, s0, s1
      * {0} 0, 0, 0, 0, 40, 40
        {1} 0, 1, 0, 40, 40, 40
        {2} 0, 2, 0, 80, 40, 20
        {3} 1, 0, 40, 0, 40, 40
        {4} 1, 1, 40, 40, 40, 40
        {5} 2, 0, 40, 80, 40, 20
        {6} 2, 1, 80, 0, 20, 40
        {7} 3, 0, 80, 40, 20, 40
        {8} 3, 1, 80, 80, 20, 20
    """
    source = slycat.analysis.client.require_array(source)
    return connection.create_remote_array("chunk_map", [source])
  context.register_plugin_function("chunk_map", chunk_map)

def register_worker_plugin(context):
  import numpy
  import Pyro4
  import slycat.analysis.worker

  def chunk_map(factory, worker_index, source):
    return factory.pyro_register(chunk_map_array(worker_index, factory.require_object(source)))

  class chunk_map_array(slycat.analysis.worker.array):
    def __init__(self, worker_index, source):
      slycat.analysis.worker.array.__init__(self, worker_index)
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
        return self.pyro_register(slycat.analysis.worker.null_array_iterator(self))

  class chunk_map_iterator(slycat.analysis.worker.array_iterator):
    def __init__(self, owner):
      slycat.analysis.worker.array_iterator.__init__(self, owner)
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
  context.register_plugin_function("chunk_map", chunk_map)

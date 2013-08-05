# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_client_plugin(context):
  from slycat.analysis.client import InvalidArgument

  def rename(connection, source, attributes=[], dimensions=[]):
    """Copy a source array, with renamed attributes and dimensions.

    The caller specifies attributes and dimensions to be renamed by their
    string name or integer index.

    When specifying a single attribute or dimension to rename, pass a
    (name-or-index, new-name) tuple to the appropriate parameter.  To rename
    multiple attributes or dimensions, pass a list of (name-or-index, new-name)
    tuples or a dictionary containing {name-or-index:new-name, ...} items.  You
    may freely mix-and-match specifications to rename attributes and dimensions
    simultaneously, if you wish.

    Note that it is possible (though somewhat undesirable) for an array to
    contain attributes or dimensions with identical names.  In this case, you
    will want to use integer indices for renaming.

    Also note that it is not an error condition if none of the attributes or
    dimensions in the source array match the caller's specifications.  In this
    case, the new array simply contains all the same attributes and dimensions
    as the original.

      >>> a = random((5, 5), attributes=["a", "b", "c"])
      >>> a
      <5x5 remote array with dimensions: d0, d1 and attributes: a, b, c>

      >>> rename(a, dimensions=("d0", "i"), attributes=("c", "d"))
      <5x5 remote array with dimensions: i, d1 and attributes: a, b, d>

      >>> rename(a, dimensions={0:"i",1:"j"}, attributes={0:"d","c":"e"})
      <5x5 remote array with dimensions: i, j and attributes: d, b, e>
    """
    source = connection.require_object(source)
    if isinstance(attributes, tuple):
      attributes = {attributes[0]: attributes[1]}
    elif isinstance(attributes, list):
      attributes = {old : new for old, new in attributes}
    elif isinstance(attributes, dict):
      pass
    else:
      raise connection.InvalidArgument("Attributes to be renamed should be a tuple, list of tuples, or dict.")

    if isinstance(dimensions, tuple):
      dimensions = {dimensions[0]: dimensions[1]}
    elif isinstance(dimensions, list):
      dimensions = {old : new for old, new in dimensions}
    elif isinstance(dimensions, dict):
      pass
    else:
      raise connection.InvalidArgument("Attributes to be renamed should be a tuple, list of tuples, or dict.")
    return connection.remote_array(connection.proxy.rename(source, attributes, dimensions))
  context.add_operator("rename", rename)

def register_coordinator_plugin(context):
  def rename(factory, source, attributes, dimensions):
    source = factory.require_object(source)
    array_workers = []
    for worker_index, (source_proxy, worker) in enumerate(zip(source.workers, factory.workers())):
      array_workers.append(worker.rename(worker_index, source_proxy._pyroUri, attributes, dimensions))
    return factory.pyro_register(factory.array(array_workers, [source]))
  context.add_operator("rename", rename)

def register_worker_plugin(context):
  import numpy

  def rename(factory, worker_index, source, attributes, dimensions):
    return factory.pyro_register(rename_array(worker_index, factory.require_object(source), attributes, dimensions))

  class rename_array(context.array):
    def __init__(self, worker_index, source, attribute_map, dimension_map):
      context.array.__init__(self, worker_index)
      self.source = source
      self.attribute_map = attribute_map
      self.dimension_map = dimension_map
    def dimensions(self):
      results = []
      for index, dimension in enumerate(self.source.dimensions()):
        name = dimension["name"]
        type = dimension["type"]
        begin = dimension["begin"]
        end = dimension["end"]
        chunk_size = dimension["chunk-size"]
        if index in self.dimension_map:
          name = self.dimension_map[index]
        elif name in self.dimension_map:
          name = self.dimension_map[name]
        results.append({"name":name, "type":type, "begin":begin, "end":end, "chunk-size":chunk_size})
      return results
    def attributes(self):
      results = []
      for index, attribute in enumerate(self.source.attributes()):
        name = attribute["name"]
        type = attribute["type"]
        if index in self.attribute_map:
          name = self.attribute_map[index]
        elif name in self.attribute_map:
          name = self.attribute_map[name]
        results.append({"name":name, "type":type})
      return results
    def iterator(self):
      return self.source.iterator()
  context.add_operator("rename", rename)


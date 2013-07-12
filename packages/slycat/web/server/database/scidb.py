# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cherrypy
import scidbapi

class dimension_wrapper:
  def __init__(self, d):
    self.d = d

  def name(self):
    return self.d.getBaseName()

  def begin(self):
    return self.d.getStartMin()

  def end(self):
    return self.d.getEndMax() + 1

  def chunk_size(self):
    return self.d.getChunkInterval()

  def overlap(self):
    return self.d.getChunkOverlap()

class attribute_wrapper:
  def __init__(self, q, a):
    self.q = q
    self.a = a

  def name(self):
    return self.a.getName()

  def type(self):
    return self.a.getType()

  def __iter__(self):
    chunk_iterator = self.q.array.getConstIterator(self.a.getId())
    while not chunk_iterator.end():
      value_iterator = chunk_iterator.getChunk().getConstIterator((scidbapi.swig.ConstChunkIterator.IGNORE_OVERLAPS) | (scidbapi.swig.ConstChunkIterator.IGNORE_EMPTY_CELLS))
      while not value_iterator.end():
        yield value_iterator.getItem()
        value_iterator.increment_to_next()
      chunk_iterator.increment_to_next()

class value_wrapper:
  def __init__(self, a, i):
    self.a = a
    self.i = i

  def name(self):
    return self.a.getName()

  def type(self):
    return self.a.getType()

  def __iter__(self):
    return self.values()

  def values(self):
    while not self.i.end():
      yield self.i.getItem()
      self.i.increment_to_next()

  def coordinates_values(self):
    while not self.i.end():
      yield self.i.getPosition(), self.i.getItem()
      self.i.increment_to_next()

class chunk_wrapper:
  def __init__(self, a, ai):
    self.a = a
    self.ai = ai

  def __iter__(self):
    return self.attributes()

  def attributes(self):
    for attribute, attribute_iterator in zip(self.a, self.ai):
      yield value_wrapper(attribute, attribute_iterator.getChunk().getConstIterator(scidbapi.swig.ConstChunkIterator.IGNORE_OVERLAPS | scidbapi.swig.ConstChunkIterator.IGNORE_EMPTY_CELLS))

class query_wrapper:
  """Wrapper class for a SciDB query result."""
  def __init__(self, d, q):
    self.d = d
    self.q = q

  def __iter__(self):
    return self.attributes()

  def dimensions(self):
    """Return an iterator over the dimensions in the query results."""
    dimensions = self.q.array.getArrayDesc().getDimensions()
    for i in range(dimensions.size()):
      yield dimension_wrapper(dimensions[i])

  def attributes(self):
    """Return an iterator over the attributes in the query results."""
    attributes = self.q.array.getArrayDesc().getAttributes()
    for i in range(attributes.size()):
      if attributes[i].getName() == "EmptyTag":
        continue
      yield attribute_wrapper(self.q, attributes[i])

  def chunks(self):
    """Return an iterator over the chunks in the query results.  Currently, this is the only way to retrieve results from a query that returns more than one chunk."""
    attributes = self.q.array.getArrayDesc().getAttributes()
    attributes = [attributes[i] for i in range(attributes.size()) if attributes[i].getName() != "EmptyTag"]
    attribute_iterators = [self.q.array.getConstIterator(attribute.getId()) for attribute in attributes]
    while not attribute_iterators[0].end():
      yield chunk_wrapper(attributes, attribute_iterators)
      for attribute_iterator in attribute_iterators:
        attribute_iterator.increment_to_next()

  def complete(self):
    self.d.completeQuery(self.q.queryID)

  def __enter__(self):
    return self

  def __exit__(self, exception_type, exception_value, exception_traceback):
    self.complete()

class database_wrapper:
  """Wrapper class for a SciDB database that adds Slycat-specific functionality."""
  def __init__(self, d):
    self.d = d

  def query(self, language, query):
    """Execute a query that will return results."""
    cherrypy.log.error("%s: %s" % (language, query))
    return query_wrapper(self.d, self.d.executeQuery(str(query), str(language)))

  def query_value(self, language, query):
    """Execute a query that will return a single value."""
    cherrypy.log.error("%s: %s" % (language, query))
    with query_wrapper(self.d, self.d.executeQuery(str(query), str(language))) as results:
      for attribute in results:
        for value in attribute:
          return value

  def execute(self, language, query, ignore_errors=False):
    """Execute a query that that doesn't return results."""
    try:
      cherrypy.log.error("%s: %s" % (language, query))
      with query_wrapper(self.d, self.d.executeQuery(str(query), str(language))):
        return
    except:
      if not ignore_errors:
        raise

def connect(host=None, port=None):
  """Helper function that connects to SciDB, returning a new database object."""
  if host is None:
    host = "localhost"
  if port is None:
    port = 1239
  return database_wrapper(scidbapi.connect(hostname=host, port=port))


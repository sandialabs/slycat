# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from __future__ import division

def register_client_plugin(context):
  try:
    import pymongo
    def mongodb(connection, database, collection, host="localhost", port=27017):
      return connection.create_remote_array("mongodb", [], host, port, database, collection)
    context.register_plugin_function("mongodb", mongodb)
  except:
    pass

def register_worker_plugin(context):
  try:
    import numpy
    import os
    import pymongo
    import slycat.analysis.worker

    def mongodb(factory, worker_index, host, port, database, collection, samples=(0, 1000)):
      return factory.pyro_register(mongodb_array(worker_index, host, port, database, collection, samples))

    class mongodb_array(slycat.analysis.worker.array):
      def __init__(self, worker_index, host, port, database, collection, samples):
        slycat.analysis.worker.array.__init__(self, worker_index)
        self.host = host
        self.port = port
        self.database = database
        self.collection = collection
        self.samples = samples

        self.record_count = None
        self.chunk_size = None
        self._attributes = None

      def update_dimensions(self):
        if self.record_count is None:
          self.record_count = pymongo.MongoClient(self.host, self.port)[self.database][self.collection].count()

        if self.chunk_size is None:
          self.chunk_size = int(numpy.ceil(self.record_count / self.worker_count))

      def update_attributes(self):
        if self._attributes is None:
          cursor = pymongo.MongoClient(self.host, self.port)[self.database][self.collection].find()
          self._attributes = sorted(set(["_id"] + [key for document in cursor for key in document]))

      def dimensions(self):
        self.update_dimensions()
        return [{"name":"i", "type":"int64", "begin":0, "end":self.record_count, "chunk-size":self.chunk_size}]
      def attributes(self):
        self.update_attributes()
        return [{"name":key, "type":"string"} for key in self._attributes]
      def iterator(self):
        self.update_attributes()
        self.update_dimensions()
        if self.worker_index == 0:
          return self.pyro_register(mongodb_array_iterator(self))
        else:
          return self.pyro_register(slycat.analysis.worker.null_array_iterator(self))

    class mongodb_array_iterator(slycat.analysis.worker.array_iterator):
      def __init__(self, owner):
        slycat.analysis.worker.array_iterator.__init__(self, owner)
        self.chunk_count = 0
        self.cursor = pymongo.MongoClient(self.owner.host, self.owner.port)[self.owner.database][self.owner.collection].find()
      def next(self):
        if self.chunk_count:
          raise StopIteration()

        self._values = [[] for attribute in self.owner._attributes]
        for document in self.cursor:
          for index, attribute in enumerate(self.owner._attributes):
            self._values[index].append(document.get(attribute, ""))

        self.chunk_count += 1

      def coordinates(self):
        return numpy.array([(self.chunk_count - 1) * self.owner.chunk_size], dtype="int64")
      def shape(self):
        return numpy.array([len(self._values[0])], dtype="int64")
      def values(self, attribute):
        return numpy.ma.array(self._values[attribute])
    context.register_plugin_function("mongodb", mongodb)
  except:
    pass

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

    def mongodb(factory, worker_index, host, port, database, collection):
      return factory.pyro_register(mongodb_array(worker_index, host, port, database, collection))

    class mongodb_array(slycat.analysis.worker.array):
      def __init__(self, worker_index, host, port, database, collection):
        slycat.analysis.worker.array.__init__(self, worker_index)
        self.host = host
        self.port = port
        self.database = database
        self.collection = collection

        self.record_count = None
        self.chunk_size = None

      def update_metrics(self):
        if self.record_count is None:
          connection = pymongo.MongoClient(self.host, self.port)
          database = connection[self.database]
          collection = database[self.collection]
          self.record_count = collection.find().count()

        # If the caller didn't specify a chunk size, split the file evenly among workers.
        if self.chunk_size is None:
          self.chunk_size = int(numpy.ceil(self.record_count / self.worker_count))

      def dimensions(self):
        self.update_metrics()
        return [{"name":"i", "type":"int64", "begin":0, "end":self.record_count, "chunk-size":self.chunk_size}]
      def attributes(self):
        self.update_metrics()
        return [{"name":"_id", "type":"string"}]
      def iterator(self):
        self.update_metrics()
        if self.worker_index == 0:
          return self.pyro_register(mongodb_array_iterator(self))
        else:
          return self.pyro_register(slycat.analysis.worker.null_array_iterator(self))

    class mongodb_array_iterator(slycat.analysis.worker.array_iterator):
      def __init__(self, owner):
        slycat.analysis.worker.array_iterator.__init__(self, owner)
        self.chunk_count = 0
        connection = pymongo.MongoClient(self.owner.host, self.owner.port)
        database = connection[self.owner.database]
        collection = database[self.owner.collection]
        self.cursor = collection.find()
      def next(self):
        if self.chunk_count:
          raise StopIteration()

        self._values = [[]]
        for document in self.cursor:
          self._values[0].append(document["_id"])

        self.chunk_count += 1

      def coordinates(self):
        return numpy.array([(self.chunk_count - 1) * self.owner.chunk_size], dtype="int64")
      def shape(self):
        return numpy.array([len(self._values[0])], dtype="int64")
      def values(self, attribute):
        return self._values[attribute]
    context.register_plugin_function("mongodb", mongodb)
  except:
    pass

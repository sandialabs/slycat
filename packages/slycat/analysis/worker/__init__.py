# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy

from slycat.analysis.worker.api import log, pyro_object
import slycat.analysis.worker.aggregate
import slycat.analysis.worker.apply
import slycat.analysis.worker.attributes
import slycat.analysis.worker.build
import slycat.analysis.worker.chunk_map
import slycat.analysis.worker.client_array
import slycat.analysis.worker.csv_file
import slycat.analysis.worker.dimensions
import slycat.analysis.worker.join
import slycat.analysis.worker.materialize
import slycat.analysis.worker.project
import slycat.analysis.worker.prn_file
import slycat.analysis.worker.random
import slycat.analysis.worker.redimension
import slycat.analysis.worker.rename
import slycat.analysis.worker.zeros

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
  def apply(self, worker_index, source, attributes):
    return self.pyro_register(slycat.analysis.worker.apply.apply_array(worker_index, self.require_object(source), attributes))
  def array(self, worker_index, initializer, attribute):
    return self.pyro_register(slycat.analysis.worker.client_array.array_array(worker_index, initializer, attribute))
  def attributes(self, worker_index, source):
    return self.pyro_register(slycat.analysis.worker.attributes.attributes_array(worker_index, self.require_object(source)))
  def build(self, worker_index, shape, chunk_sizes, attributes):
    return self.pyro_register(slycat.analysis.worker.build.build_array(worker_index, shape, chunk_sizes, attributes))
  def chunk_map(self, worker_index, source):
    return self.pyro_register(slycat.analysis.worker.chunk_map.chunk_map_array(worker_index, self.require_object(source)))
  def csv_file(self, worker_index, path, format, delimiter, chunk_size):
    return self.pyro_register(slycat.analysis.worker.csv_file.csv_file_array(worker_index, path, format, delimiter, chunk_size))
  def dimensions(self, worker_index, source):
    return self.pyro_register(slycat.analysis.worker.dimensions.dimensions_array(worker_index, self.require_object(source)))
  def join(self, worker_index, array1, array2):
    return self.pyro_register(slycat.analysis.worker.join.join_array(worker_index, self.require_object(array1), self.require_object(array2)))
  def materialize(self, worker_index, source):
    return self.pyro_register(slycat.analysis.worker.materialize.materialize_array(worker_index, self.require_object(source)))
  def prn_file(self, worker_index, path, chunk_size):
    return self.pyro_register(slycat.analysis.worker.prn_file.prn_file_array(worker_index, path, chunk_size))
  def project(self, worker_index, source, attributes):
    return self.pyro_register(slycat.analysis.worker.project.project_array(worker_index, self.require_object(source), attributes))
  def random(self, worker_index, shape, chunk_sizes, seed, attributes):
    return self.pyro_register(slycat.analysis.worker.random.random_array(worker_index, shape, chunk_sizes, seed, attributes))
  def rename(self, worker_index, source, attributes, dimensions):
    return self.pyro_register(slycat.analysis.worker.rename.rename_array(worker_index, self.require_object(source), attributes, dimensions))
  def redimension(self, worker_index, source, dimensions, attributes):
    return self.pyro_register(slycat.analysis.worker.redimension.redimension_array(worker_index, self.require_object(source), dimensions, attributes))
  def zeros(self, worker_index, shape, chunk_sizes, attributes):
    return self.pyro_register(slycat.analysis.worker.zeros.zeros_array(worker_index, shape, chunk_sizes, attributes))


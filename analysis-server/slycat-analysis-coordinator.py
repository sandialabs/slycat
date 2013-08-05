# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

slycat_analysis_disable_client_plugins = True

import ast
import logging
import numpy
import os
import Pyro4
from slycat.analysis import __file__ as plugin_root
from slycat.analysis.api import InvalidArgument

handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))

log = logging.getLogger("slycat.analysis.coordinator")
log.setLevel(logging.DEBUG)
log.addHandler(handler)

class pyro_object(object):
  """Provides some standardized functionality for objects that are exported via Pyro4."""
  def __init__(self):
    self.refcount = 1
  def __del__(self):
    if self.refcount != 0:
      log.error("Deleting object with nonzero reference count: %s", self)
    #log.debug("Deleted %s", self)
  def register(self):
    self.refcount += 1
  def release(self):
    self.refcount = max(0, self.refcount - 1)
    if self.refcount == 0:
      log.debug("Releasing %s %s", self._pyroId, self)
      self._pyroDaemon.unregister(self)
  def pyro_register(self, thing):
    """Register a Python object to be shared via Pyro."""
    self._pyroDaemon.register(thing)
    log.debug("Registered %s %s", thing._pyroId, thing)
    return thing

class factory(pyro_object):
  """Top-level factory for coordinator objects."""
  def __init__(self, nameserver):
    pyro_object.__init__(self)
    self.nameserver = nameserver
  def shutdown(self):
    log.info("Client requested shutdown.")
    self._pyroDaemon.shutdown()

  def workers(self):
    """Returns the set of available slycat analysis workers."""
    return [Pyro4.Proxy(self.nameserver.lookup(worker)) for worker in self.nameserver.list(prefix="slycat.worker").keys()]

  def require_attribute_name(self, name):
    if not isinstance(name, basestring):
      raise InvalidArgument("Attribute name must be a string.")
    return name
  def require_attribute_type(self, type):
    allowed_types = ["int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64", "float32", "float64", "string"]
    if type not in allowed_types:
      raise InvalidArgument("Attribute type must be one of %s" % ",".join(allowed_types))
    return type
  def require_attribute(self, attribute):
    if isinstance(attribute, basestring):
      attribute = {"name":attribute, "type":"float64"}
    elif isinstance(attribute, tuple):
      if len(attribute) != 2:
        raise InvalidArgument("Attribute must have a name and a type.")
      attribute = {"name":attribute[0], "type":attribute[1]}
    elif isinstance(attribute, dict):
      if "name" not in attribute:
        raise InvalidArgument("Attribute must have a name.")
      if "type" not in attribute:
        raise InvalidArgument("Attribute must have a type.")
    self.require_attribute_name(attribute["name"])
    self.require_attribute_type(attribute["type"])
    return attribute
  def require_attributes(self, attributes):
    if isinstance(attributes, basestring):
      attributes = [self.require_attribute(attributes)]
    elif isinstance(attributes, tuple):
      attributes = [self.require_attribute(attributes)]
    elif isinstance(attributes, dict):
      attributes = [self.require_attribute(attributes)]
    else:
      attributes = [self.require_attribute(attribute) for attribute in attributes]
    return attributes
  def require_attribute_names(self, names):
    if isinstance(names, basestring):
      return [self.require_attribute_name(names)]
    return [self.require_attribute_name(name) for name in names]
  def require_chunk_sizes(self, shape, chunk_sizes):
    """Return array chunk sizes (tuple of dimension lengths), treating a single integer as a 1-tuple and sanity-checking the results against an array shape."""
    if chunk_sizes is None:
      chunk_sizes = shape
    elif isinstance(chunk_sizes, int):
      chunk_sizes = tuple([chunk_sizes])
    else:
      chunk_sizes = tuple(chunk_sizes)
    if len(shape) != len(chunk_sizes):
      raise InvalidArgument("Array shape and chunk sizes must contain the same number of dimensions.")
    return chunk_sizes
  def require_dimension_name(self, name):
    if not isinstance(name, basestring):
      raise InvalidArgument("Dimension name must be a string.")
    return name
  def require_dimension_names(self, names):
    if isinstance(names, basestring):
      return [self.require_dimension_name(names)]
    return [self.require_dimension_name(name) for name in names]
  def require_expression(self, expression):
    if isinstance(expression, basestring):
      expression = ast.parse(expression)
    else:
      raise InvalidArgument("Expression must be a string.")
    return expression
  def require_object(self, uri):
    """Lookup a Pyro URI, returning the corresponding Python object."""
    return self._pyroDaemon.objectsById[uri.asString().split(":")[1].split("@")[0]]
  def require_shape(self, shape):
    """Return an array shape (tuple of dimension lengths), treating a single integer as a 1-tuple."""
    if isinstance(shape, int):
      shape = tuple([shape])
    else:
      shape = tuple(shape)
    if not len(shape):
      raise InvalidArgument("Array shape must have at least one dimension.")
    return shape

  def aggregate(self, source, expressions):
    source = self.require_object(source)
    if isinstance(expressions, basestring):
      expressions = [(expressions, None)]
    elif isinstance(expressions, tuple):
      expressions = [expressions]
    elif isinstance(expressions, list):
      expressions = [(expression, None) if isinstance(expression, basestring) else expression for expression in expressions]
    array_workers = []
    for worker_index, (source_proxy, worker) in enumerate(zip(source.workers, self.workers())):
      array_workers.append(worker.aggregate(worker_index, source_proxy._pyroUri, expressions))
    return self.pyro_register(array(array_workers, [source]))
  def apply(self, source, attributes):
    source = self.require_object(source)
    if isinstance(attributes, tuple):
      attributes = [attributes]
    if len(attributes) < 1:
      raise InvalidArgument("You must specify at least one attribute.")
    attributes = [(self.require_attribute(attribute), self.require_expression(expression)) for attribute, expression in attributes]
    array_workers = []
    for worker_index, (source_proxy, worker) in enumerate(zip(source.workers, self.workers())):
      array_workers.append(worker.apply(worker_index, source_proxy._pyroUri, attributes))
    return self.pyro_register(array(array_workers, [source]))
  def attributes(self, source):
    source = self.require_object(source)
    array_workers = []
    for worker_index, (source_proxy, worker) in enumerate(zip(source.workers, self.workers())):
      array_workers.append(worker.attributes(worker_index, source_proxy._pyroUri))
    return self.pyro_register(array(array_workers, [source]))
  def build(self, shape, chunks, attributes):
    array_workers = []
    shape = self.require_shape(shape)
    chunks = self.require_chunk_sizes(shape, chunks)
    if isinstance(attributes, tuple):
      attributes = [attributes]
    if len(attributes) < 1:
      raise InvalidArgument("You must specify at least one attribute.")
    attributes = [(self.require_attribute(attribute), self.require_expression(expression)) for attribute, expression in attributes]
    for worker_index, worker in enumerate(self.workers()):
      array_workers.append(worker.build(worker_index, shape, chunks, attributes))
    return self.pyro_register(array(array_workers, []))
  def load(self, path, schema, **keywords):
    if schema == "csv-file":
      format = keywords.get("format", None)
      delimiter = keywords.get("delimiter", ",")
      chunk_size = keywords.get("chunk_size", None)
      if chunk_size is not None:
        if not isinstance(chunk_size, int):
          raise InvalidArgument("chunk_size must be an integer.")
      array_workers = []
      for worker_index, worker in enumerate(self.workers()):
        array_workers.append(worker.csv_file(worker_index, path, format, delimiter, chunk_size))
      return self.pyro_register(file_array(array_workers, []))
    elif schema == "prn-file":
      chunk_size = keywords.get("chunk_size", None)
      if chunk_size is not None:
        if not isinstance(chunk_size, int):
          raise InvalidArgument("chunk_size must be an integer.")
      array_workers = []
      for worker_index, worker in enumerate(self.workers()):
        array_workers.append(worker.prn_file(worker_index, path, chunk_size))
      return self.pyro_register(file_array(array_workers, []))
    else:
      raise InvalidArgument("Unknown load schema: %s" % schema)

class array(pyro_object):
  """Abstract interface for a remote, multi-attribute, multi-dimensional array."""
  def __init__(self, workers, sources):
    pyro_object.__init__(self)
    self.workers = workers
    self.sources = sources
    for worker in workers:
      worker.set_siblings(workers)
    for source in sources:
      source.register()
  def __del__(self):
    for source in self.sources:
      source.release()
    for proxy in self.workers:
      proxy.release()
    pyro_object.__del__(self)
  def dimensions(self):
    return self.workers[0].dimensions()
  def attributes(self):
    return self.workers[0].attributes()
  def iterator(self):
    return self.pyro_register(parallel_remote_array_iterator(self.workers))

class file_array(array):
  """Abstract interface for an array backed by a filesystem file."""
  def __init__(self, workers, sources):
    array.__init__(self, workers, sources)
  def file_path(self):
    return self.workers[0].file_path()
  def file_size(self):
    return self.workers[0].file_size()

factory.array = array
factory.file_array = file_array

class array_iterator(pyro_object):
  """Abstract interface for iterating over an array one chunk (hypercube) at a time."""
  def __init__(self):
    pyro_object.__init__(self)
  def next(self):
    """Advances the iterator to the next chunk.  Raises StopIteration if there are no more chunks."""
    raise NotImplementedError()
  def coordinates(self):
    """Returns the lowest-numbered coordinates along each dimension of the current chunk."""
    raise NotImplementedError()
  def shape(self):
    """Returns the shape (size along each dimension) of the current chunk."""
    raise NotImplementedError()
  def values(self, attribute):
    """Returns the array values for the given attribute index as a dense NumPy array."""
    raise NotImplementedError()

class serial_remote_array_iterator(array_iterator):
  """Concrete array_iterator implementation that retrieves data from remote workers in a naive, serialized order."""
  def __init__(self, workers):
    array_iterator.__init__(self)
    self.iterators = [proxy.iterator() for proxy in workers]
    self.index = 0
  def __del__(self):
    for proxy in self.iterators:
      proxy.release()
    array_iterator.__del__(self)
  def next(self):
    while self.index != len(self.iterators):
      try:
        self.iterator = self.iterators[self.index]
        self.iterator.next()
        return
      except StopIteration:
        self.index += 1
    raise StopIteration()
  def coordinates(self):
    return self.iterator.coordinates()
  def shape(self):
    return self.iterator.shape()
  def values(self, attribute):
    log.debug("Retrieving chunk from remote iterator %s.", self.iterator._pyroUri)
    return self.iterator.values(attribute)

class parallel_remote_array_iterator(array_iterator):
  """Concrete array_iterator implementation that retrieves data from remote workers in parallel, asynchronous order."""
  def __init__(self, workers):
    array_iterator.__init__(self)
    self.iterators = [proxy.iterator() for proxy in workers]
    self.available = [iterator for iterator in self.iterators]
    self.running = []
    self.complete = []
    self.iterator = None
  def __del__(self):
    for proxy in self.iterators:
      proxy.release()
    array_iterator.__del__(self)
  def next(self):
    # Advance available iterators so they can start computing ...
    for iterator in self.available:
      self.running.append((iterator, Pyro4.async(iterator).next()))
    self.available = []

    # If we don't have any complete iterators, wait until we get some ...
    if not len(self.complete) and len(self.running):
      iterator, result = self.running.pop(0)
      try:
        ignored = result.value
        self.complete.append(iterator)
      except StopIteration:
        pass

    # If we don't have any complete iterators at this point, we're done ...
    if not len(self.complete):
      raise StopIteration()

    # Pick a complete iterator to use, and mark it as available next time we're called ...
    self.iterator = self.complete.pop(0)
    self.available.append(self.iterator)

  def coordinates(self):
    return self.iterator.coordinates()
  def shape(self):
    return self.iterator.shape()
  def values(self, attribute):
    log.debug("Retrieving chunk from remote iterator %s.", self.iterator._pyroUri)
    return self.iterator.values(attribute)

def load_plugins(root):
  import imp
  import os

  def make_connection_method(function):
    def implementation(self, *arguments, **keywords):
      return function(self, *arguments, **keywords)
    implementation.__name__ = function.__name__
    implementation.__doc__ = function.__doc__
    return implementation

  class plugin_context(object):
    def add_operator(self, name, function):
      setattr(factory, name, make_connection_method(function))
      log.info("Registered operator %s", name)

  context = plugin_context()

  plugin_dirs = [os.path.join(os.path.dirname(os.path.realpath(root)), "plugins")]
  for plugin_dir in plugin_dirs:
    try:
      log.info("Loading plugins from %s", plugin_dir)
      plugin_names = [x[:-3] for x in os.listdir(plugin_dir) if x.endswith(".py")]
      for plugin_name in plugin_names:
        try:
          module_fp, module_pathname, module_description = imp.find_module(plugin_name, [plugin_dir])
          plugin = imp.load_module(plugin_name, module_fp, module_pathname, module_description)
          if hasattr(plugin, "register_coordinator_plugin"):
            plugin.register_coordinator_plugin(context)
        except Exception as e:
          import traceback
          log.error(traceback.format_exc())
        finally:
          if module_fp:
            module_fp.close()
    except Exception as e:
      import traceback
      log.error(traceback.format_exc())

load_plugins(plugin_root)

import logging
import Pyro4
import subprocess
import threading

import optparse
parser = optparse.OptionParser()
parser.add_option("--hmac-key", default="slycat1", help="Unique communication key.  Default: %default")
parser.add_option("--host", default="127.0.0.1", help="Network interface to bind.  Default: %default")
parser.add_option("--local-workers", type="int", default=4, help="Number of local workers to start.  Default: %default")
parser.add_option("--log-level", default=None, help="Set the default log level to one of: debug, info, warning, error, critical")
parser.add_option("--nameserver-host", default="127.0.0.1", help="Nameserver host.  Default: %default")
parser.add_option("--nameserver-port", type="int", default=9090, help="Nameserver port.  Default: %default")
options, arguments = parser.parse_args()

Pyro4.config.HMAC_KEY = options.hmac_key
Pyro4.config.SERIALIZER = "pickle"

if options.log_level == "debug":
  log.setLevel(logging.DEBUG)
elif options.log_level == "info":
  log.setLevel(logging.INFO)
elif options.log_level == "warning":
  log.setLevel(logging.WARNING)
elif options.log_level == "error":
  log.setLevel(logging.ERROR)
elif options.log_level == "critical":
  log.setLevel(logging.CRITICAL)
elif options.log_level is None:
  pass
else:
  raise Exception("Unknown log level: {}".format(options.log_level))

class nameserver(threading.Thread):
  def __init__(self):
    threading.Thread.__init__(self)
    self.daemon = True
    self.started = threading.Event()

  def run(self):
    uri, daemon, server = Pyro4.naming.startNS(host=options.nameserver_host, port=options.nameserver_port, enableBroadcast=False)
    self.nameserver = daemon.nameserver
    self.started.set()
    daemon.requestLoop()

nameserver_thread = nameserver()
nameserver_thread.start()
nameserver_thread.started.wait()

command = ["python", "slycat-analysis-worker.py"]
command += ["--nameserver-host={}".format(options.nameserver_host)]
command += ["--nameserver-port={}".format(options.nameserver_port)]
command += ["--hmac-key={}".format(options.hmac_key)]
command += ["--host=127.0.0.1"]
if options.log_level is not None:
  command += ["--log-level={}".format(options.log_level)]

workers = [subprocess.Popen(command) for i in range(options.local_workers)]

daemon = Pyro4.Daemon(host=options.host)
nameserver_thread.nameserver.register("slycat.coordinator", daemon.register(factory(nameserver_thread.nameserver), "slycat.coordinator"))
log.info("Listening on %s, nameserver listening on %s:%s", options.host, options.nameserver_host, options.nameserver_port)
daemon.requestLoop()

for key, value in daemon.objectsById.items():
  if key not in ["slycat.coordinator", "Pyro.Daemon"]:
    log.debug("Leaked object %s: %s", key, value)

log.info("Shutdown complete.")

# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from slycat.analysis import __file__ as plugin_root
from slycat.analysis.worker.api import log, pyro_object, array, array_iterator, null_array_iterator, worker_chunks
import slycat.analysis.worker.aggregate
import slycat.analysis.worker.apply
import slycat.analysis.worker.attributes
import slycat.analysis.worker.build
import slycat.analysis.worker.chunk_map
import slycat.analysis.worker.client_array
import slycat.analysis.worker.csv_file
import slycat.analysis.worker.prn_file

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
  def prn_file(self, worker_index, path, chunk_size):
    return self.pyro_register(slycat.analysis.worker.prn_file.prn_file_array(worker_index, path, chunk_size))

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
  plugin_context.array = array
  plugin_context.array_iterator = array_iterator
  plugin_context.null_array_iterator = null_array_iterator
  plugin_context.worker_chunks = staticmethod(worker_chunks)

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
          if hasattr(plugin, "register_worker_plugin"):
            plugin.register_worker_plugin(context)
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
import optparse
import Pyro4
import uuid

parser = optparse.OptionParser()
parser.add_option("--hmac-key", default="slycat1", help="Unique communication key.  Default: %default")
parser.add_option("--host", default="127.0.0.1", help="Network interface to bind.  Default: %default")
parser.add_option("--log-level", default=None, help="Set the default log level to one of: debug, info, warning, error, critical")
parser.add_option("--nameserver-host", default="127.0.0.1", help="Nameserver hostname.  Default: %default")
parser.add_option("--nameserver-port", type="int", default=9090, help="Nameserver hostname.  Default: %default")
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

log.info("Locating nameserver at %s:%s", options.nameserver_host, options.nameserver_port)
nameserver = Pyro4.naming.locateNS(options.nameserver_host, options.nameserver_port)

daemon = Pyro4.Daemon(host=options.host)
nameserver.register("slycat.worker.%s" % uuid.uuid4().hex, daemon.register(factory(), "slycat.worker"))
log.info("Listening on %s", options.host)
daemon.requestLoop()

for key, value in daemon.objectsById.items():
  if key not in ["slycat.worker", "Pyro.Daemon"]:
    log.debug("Leaked object %s: %s", key, value)

log.info("Shutdown complete.")

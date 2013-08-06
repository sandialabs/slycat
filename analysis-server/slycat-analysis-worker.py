# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

slycat_analysis_disable_client_plugins = True # Prevent client plugins from being loaded when we import from slycat.analysis

from slycat.analysis import __file__ as plugin_root
import slycat.analysis.worker

class factory(slycat.analysis.worker.pyro_object):
  """Top-level factory for worker objects."""
  def __init__(self):
    slycat.analysis.worker.pyro_object.__init__(self)
  def shutdown(self):
    slycat.analysis.worker.log.info("Client requested shutdown.")
    self._pyroDaemon.shutdown()
  def require_object(self, uri):
    """Lookup a Pyro URI, returning the corresponding Python object."""
    return self._pyroDaemon.objectsById[uri.asString().split(":")[1].split("@")[0]]

def load_plugins(root):
  import imp
  import os

  operators = []

  def make_connection_method(function):
    def implementation(self, *arguments, **keywords):
      return function(self, *arguments, **keywords)
    implementation.__name__ = function.__name__
    implementation.__doc__ = function.__doc__
    return implementation

  class plugin_context(object):
    def add_operator(self, name, function):
      if name in operators:
        raise Exception("Cannot add operator with duplicate name: %s" % name)
      operators.append(name)
      setattr(factory, name, make_connection_method(function))
      slycat.analysis.worker.log.debug("Registered operator %s", name)

  context = plugin_context()

  plugin_dirs = [os.path.join(os.path.dirname(os.path.realpath(root)), "plugins")]
  for plugin_dir in plugin_dirs:
    try:
      slycat.analysis.worker.log.debug("Loading plugins from %s", plugin_dir)
      plugin_names = [x[:-3] for x in os.listdir(plugin_dir) if x.endswith(".py")]
      for plugin_name in plugin_names:
        try:
          module_fp, module_pathname, module_description = imp.find_module(plugin_name, [plugin_dir])
          plugin = imp.load_module(plugin_name, module_fp, module_pathname, module_description)
          if hasattr(plugin, "register_worker_plugin"):
            plugin.register_worker_plugin(context)
        except Exception as e:
          import traceback
          slycat.analysis.worker.log.error(traceback.format_exc())
        finally:
          if module_fp:
            module_fp.close()
    except Exception as e:
      import traceback
      slycat.analysis.worker.log.error(traceback.format_exc())

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
  slycat.analysis.worker.log.setLevel(logging.DEBUG)
elif options.log_level == "info":
  slycat.analysis.worker.log.setLevel(logging.INFO)
elif options.log_level == "warning":
  slycat.analysis.worker.log.setLevel(logging.WARNING)
elif options.log_level == "error":
  slycat.analysis.worker.log.setLevel(logging.ERROR)
elif options.log_level == "critical":
  slycat.analysis.worker.log.setLevel(logging.CRITICAL)
elif options.log_level is None:
  pass
else:
  raise Exception("Unknown log level: {}".format(options.log_level))

slycat.analysis.worker.log.info("Locating nameserver at %s:%s", options.nameserver_host, options.nameserver_port)
nameserver = Pyro4.naming.locateNS(options.nameserver_host, options.nameserver_port)

daemon = Pyro4.Daemon(host=options.host)
nameserver.register("slycat.worker.%s" % uuid.uuid4().hex, daemon.register(factory(), "slycat.worker"))
slycat.analysis.worker.log.info("Listening on %s", options.host)
daemon.requestLoop()

for key, value in daemon.objectsById.items():
  if key not in ["slycat.worker", "Pyro.Daemon"]:
    slycat.analysis.worker.log.debug("Leaked object %s: %s", key, value)

slycat.analysis.worker.log.info("Shutdown complete.")

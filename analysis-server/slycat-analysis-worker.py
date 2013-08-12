# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

slycat_analysis_disable_client_plugins = True # Prevent client plugins from being loaded when we import from slycat.analysis
import slycat.analysis

import imp
import logging
import optparse
import os
import Pyro4
import signal
import slycat.analysis.worker
import threading
import time
import uuid

######################################################################################################
## Handle command-line arguments.

parser = optparse.OptionParser()
parser.add_option("--hmac-key", default="slycat1", help="Unique communication key.  Default: %default")
parser.add_option("--host", default="127.0.0.1", help="Network interface to bind.  Default: %default")
parser.add_option("--log-level", default=None, help="Set the default log level to one of: debug, info, warning, error, critical")
parser.add_option("--nameserver-host", default="127.0.0.1", help="Nameserver hostname.  Default: %default")
parser.add_option("--nameserver-port", type="int", default=9090, help="Nameserver hostname.  Default: %default")
parser.add_option("--plugins", type="string", default=[], action="append", help="Add a directory to search for plugins.  You may use --plugins multiple time to add multiple locations.")
options, arguments = parser.parse_args()

Pyro4.config.HMAC_KEY = options.hmac_key
Pyro4.config.SERIALIZER = "pickle"
Pyro4.config.SOCK_REUSE = True

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

######################################################################################################
## Load worker plugins.

class worker_factory(slycat.analysis.worker.pyro_object):
  """Top-level factory for worker objects."""
  def __init__(self):
    slycat.analysis.worker.pyro_object.__init__(self)
    self.plugin_functions = {}
  def shutdown(self):
    slycat.analysis.worker.log.info("Client requested shutdown.")
    self._pyroDaemon.shutdown()
  def require_object(self, uri):
    """Lookup a Pyro URI, returning the corresponding Python object."""
    return self._pyroDaemon.objectsById[uri.asString().split(":")[1].split("@")[0]]
  def register_plugin_function(self, name, function):
    if name in self.plugin_functions:
      raise Exception("Cannot add plugin function with duplicate name: %s" % name)
    self.plugin_functions[name] = function
  def call_plugin_function(self, name, *arguments, **keywords):
    return self.plugin_functions[name](self, *arguments, **keywords)

factory = worker_factory()

class plugin_context(object):
  def __init__(self, factory):
    self.factory = factory

  def register_plugin_function(self, name, function):
    self.factory.register_plugin_function(name, function)
    slycat.analysis.worker.log.debug("Registered operator %s", name)
context = plugin_context(factory)

plugin_directories = options.plugins
plugin_directories += [path for path in os.environ.get("SLYCAT_ANALYSIS_EXTRA_PLUGINS", "").split(":") if path]
plugin_directories += [os.path.join(os.path.dirname(os.path.realpath(slycat.analysis.__file__)), "plugins")]
for plugin_directory in plugin_directories:
  try:
    slycat.analysis.worker.log.debug("Loading plugins from %s", plugin_directory)
    plugin_names = [x[:-3] for x in os.listdir(plugin_directory) if x.endswith(".py")]
    for plugin_name in plugin_names:
      try:
        module_fp, module_path, module_description = imp.find_module(plugin_name, [plugin_directory])
        plugin = imp.load_module(plugin_name, module_fp, module_path, module_description)
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

######################################################################################################
## Locate a nameserver to coordinate remote objects.

slycat.analysis.worker.log.info("Locating nameserver at %s:%s", options.nameserver_host, options.nameserver_port)
nameserver = Pyro4.naming.locateNS(options.nameserver_host, options.nameserver_port)

######################################################################################################
## Run the main event-handling loop.

daemon = Pyro4.Daemon(host=options.host)
nameserver.register("slycat.worker.%s" % uuid.uuid4().hex, daemon.register(factory, "slycat.worker"))
slycat.analysis.worker.log.info("Listening on %s", options.host)

def signal_handler(signal, frame):
  slycat.analysis.worker.log.info("Ctrl-C")
  threading.Thread(target=daemon.shutdown).start()
signal.signal(signal.SIGINT, signal_handler)

daemon.requestLoop()
daemon.close()
time.sleep(5)

######################################################################################################
## Cleanup.

for key, value in daemon.objectsById.items():
  if key not in ["slycat.worker", "Pyro.Daemon"]:
    slycat.analysis.worker.log.debug("Leaked object %s: %s", key, value)

slycat.analysis.worker.log.info("Shutdown complete.")

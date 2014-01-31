# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import imp
import logging
import optparse
import os
import Pyro4
import signal
import slycat.analysis.plugin
import slycat.analysis.plugin.worker
import threading
import time
import uuid

from slycat.analysis.plugin.worker import log

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
Pyro4.config.SERIALIZERS_ACCEPTED.add('pickle')
Pyro4.config.SOCK_REUSE = True

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

######################################################################################################
## Load worker plugins.

class worker_factory(slycat.analysis.plugin.worker.pyro_object):
  """Top-level factory for worker objects."""
  def __init__(self):
    slycat.analysis.plugin.worker.pyro_object.__init__(self)
    self.plugin_functions = {}
  def shutdown(self):
    log.info("Client requested shutdown.")
    self._pyroDaemon.shutdown()
  def require_object(self, uri):
    """Lookup a Pyro URI, returning the corresponding Python object."""
    return self._pyroDaemon.objectsById[uri.asString().split(":")[1].split("@")[0]]
  def call_plugin_function(self, name, *arguments, **keywords):
    """Call a worker plugin function by name."""
    return self.plugin_functions[name](self, *arguments, **keywords)

factory = worker_factory()

class plugin_context(object):
  def __init__(self, factory):
    self.factory = factory

  def register_plugin_function(self, name, function):
    self.factory.register_plugin_function(name, function)
    log.debug("Registered operator %s", name)
context = plugin_context(factory)

plugins = slycat.analysis.plugin.manager(log)
for path in options.plugins:
  plugins.load(path)
for path in os.environ.get("SLYCAT_ANALYSIS_EXTRA_PLUGINS", "").split(":"):
  if path:
    plugins.load(path)
plugins.load(os.path.join(os.path.dirname(os.path.realpath(slycat.analysis.__file__)), "plugins"))

for module in plugins.modules:
  if hasattr(module, "register_worker_plugin"):
    module.register_worker_plugin(plugins)

factory.plugin_functions = {name:function for name, (function, metadata) in plugins.functions.items()}

######################################################################################################
## Locate a nameserver to coordinate remote objects.

log.info("Locating nameserver at %s:%s", options.nameserver_host, options.nameserver_port)
nameserver = Pyro4.naming.locateNS(options.nameserver_host, options.nameserver_port)

######################################################################################################
## Run the main event-handling loop.

daemon = Pyro4.Daemon(host=options.host)
nameserver.register("slycat.worker.%s" % uuid.uuid4().hex, daemon.register(factory, "slycat.worker"))
log.info("Listening on %s", options.host)

def signal_handler(signal, frame):
  log.info("Ctrl-C")
  threading.Thread(target=daemon.shutdown).start()
signal.signal(signal.SIGINT, signal_handler)

daemon.requestLoop()
daemon.close()
time.sleep(5)

######################################################################################################
## Cleanup.

for key, value in daemon.objectsById.items():
  if key not in ["slycat.worker", "Pyro.Daemon"]:
    log.debug("Leaked object %s: %s", key, value)

log.info("Shutdown complete.")

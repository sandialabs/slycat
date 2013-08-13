# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import imp
import logging
import multiprocessing
import optparse
import os
import Pyro4
import signal
import slycat.analysis.plugin
import slycat.analysis.plugin.coordinator
import subprocess
import threading
import time

from slycat.analysis.plugin.coordinator import log

######################################################################################################
## Handle command-line arguments.

try:
  local_workers = multiprocessing.cpu_count()
except:
  local_workers = 4

parser = optparse.OptionParser()
parser.add_option("--hmac-key", default="slycat1", help="Unique communication key.  Default: %default")
parser.add_option("--host", default="127.0.0.1", help="Network interface to bind.  Default: %default")
parser.add_option("--local-workers", type="int", default=local_workers, help="Number of local workers to start.  Default: %default")
parser.add_option("--log-level", default=None, help="Set the default log level to one of: debug, info, warning, error, critical")
parser.add_option("--nameserver-host", default="127.0.0.1", help="Nameserver host.  Default: %default")
parser.add_option("--nameserver-port", type="int", default=9090, help="Nameserver port.  Default: %default")
parser.add_option("--plugins", type="string", default=[], action="append", help="Add a directory to search for plugins.  You may use --plugins multiple time to add multiple locations.")
options, arguments = parser.parse_args()

Pyro4.config.HMAC_KEY = options.hmac_key
Pyro4.config.SERIALIZER = "pickle"
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
## Start a nameserver to coordinate remote objects.

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

######################################################################################################
## Load coordinator plugins.

class coordinator_factory(slycat.analysis.plugin.coordinator.pyro_object):
  """Top-level factory for coordinator objects."""
  def __init__(self, nameserver):
    slycat.analysis.plugin.coordinator.pyro_object.__init__(self)
    self.nameserver = nameserver
    self.plugin_functions = {}
  def shutdown(self):
    """Perform a clean shutdown."""
    log.info("Client requested shutdown.")
    self._pyroDaemon.shutdown()
  def workers(self):
    """Returns the set of available slycat analysis workers."""
    return [Pyro4.Proxy(self.nameserver.lookup(worker)) for worker in self.nameserver.list(prefix="slycat.worker").keys()]
  def require_object(self, uri):
    """Lookup a Pyro URI, returning the corresponding Python object."""
    return self._pyroDaemon.objectsById[uri.asString().split(":")[1].split("@")[0]]
  def call_plugin_function(self, name, *arguments, **keywords):
    """Call a plugin function by name."""
    return self.plugin_functions[name](self, *arguments, **keywords)
  def create_remote_array(self, name, sources, *arguments, **keywords):
    """Creates a remote array using plugin functions on the workers."""
    sources = [self.require_object(source) for source in sources]
    array_workers = []
    for worker_index, worker in enumerate(self.workers()):
      source_workers = [source.workers[worker_index]._pyroUri for source in sources]
      if len(source_workers) > 1:
        array_workers.append(worker.call_plugin_function(name, worker_index, source_workers, *arguments, **keywords))
      elif len(source_workers) == 1:
        array_workers.append(worker.call_plugin_function(name, worker_index, source_workers[0], *arguments, **keywords))
      else:
        array_workers.append(worker.call_plugin_function(name, worker_index, *arguments, **keywords))
    return self.pyro_register(slycat.analysis.plugin.coordinator.array(array_workers, sources))

factory = coordinator_factory(nameserver_thread.nameserver)

plugins = slycat.analysis.plugin.manager(log)
for path in options.plugins:
  plugins.load(path)
for path in os.environ.get("SLYCAT_ANALYSIS_EXTRA_PLUGINS", "").split(":"):
  if path:
    plugins.load(path)
plugins.load(os.path.join(os.path.dirname(os.path.realpath(slycat.analysis.__file__)), "plugins"))

for module in plugins.modules:
  if hasattr(module, "register_coordinator_plugin"):
    module.register_coordinator_plugin(plugins)
factory.plugin_functions = {name:function for name, (function, metadata) in plugins.functions.items()}

######################################################################################################
## Optionally start local workers.

command = ["python", "slycat-analysis-worker.py"]
command += ["--nameserver-host={}".format(options.nameserver_host)]
command += ["--nameserver-port={}".format(options.nameserver_port)]
command += ["--hmac-key={}".format(options.hmac_key)]
command += ["--host=127.0.0.1"]
if options.log_level is not None:
  command += ["--log-level=%s" % options.log_level]
for plugin_directory in options.plugins:
  command += ["--plugins", plugin_directory]

workers = [subprocess.Popen(command) for i in range(options.local_workers)]

######################################################################################################
## Run the main event-handling loop.

daemon = Pyro4.Daemon(host=options.host)
nameserver_thread.nameserver.register("slycat.coordinator", daemon.register(factory, "slycat.coordinator"))
log.info("Listening on %s, nameserver listening on %s:%s", options.host, options.nameserver_host, options.nameserver_port)

def signal_handler(signal, frame):
  log.info("Ctrl-C")
  threading.Thread(target=daemon.shutdown).start()
signal.signal(signal.SIGINT, signal_handler)

daemon.requestLoop()
daemon.close()
time.sleep(5.0)

######################################################################################################
## Cleanup.

for key, value in daemon.objectsById.items():
  if key not in ["slycat.coordinator", "Pyro.Daemon"]:
    log.debug("Leaked object %s: %s", key, value)

log.info("Shutdown complete.")

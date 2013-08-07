# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

slycat_analysis_disable_client_plugins = True # Prevent client plugins from being loaded when we import from slycat.analysis
import slycat.analysis

import imp
import logging
import multiprocessing
import optparse
import os
import Pyro4
import slycat.analysis.coordinator
import subprocess
import threading

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

if options.log_level == "debug":
  slycat.analysis.coordinator.log.setLevel(logging.DEBUG)
elif options.log_level == "info":
  slycat.analysis.coordinator.log.setLevel(logging.INFO)
elif options.log_level == "warning":
  slycat.analysis.coordinator.log.setLevel(logging.WARNING)
elif options.log_level == "error":
  slycat.analysis.coordinator.log.setLevel(logging.ERROR)
elif options.log_level == "critical":
  slycat.analysis.coordinator.log.setLevel(logging.CRITICAL)
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

class coordinator_factory(slycat.analysis.coordinator.pyro_object):
  """Top-level factory for coordinator objects."""
  def __init__(self, nameserver):
    slycat.analysis.coordinator.pyro_object.__init__(self)
    self.nameserver = nameserver
    self.plugin_functions = {}
  def shutdown(self):
    """Perform a clean shutdown."""
    slycat.analysis.coordinator.log.info("Client requested shutdown.")
    self._pyroDaemon.shutdown()
  def workers(self):
    """Returns the set of available slycat analysis workers."""
    return [Pyro4.Proxy(self.nameserver.lookup(worker)) for worker in self.nameserver.list(prefix="slycat.worker").keys()]
  def require_object(self, uri):
    """Lookup a Pyro URI, returning the corresponding Python object."""
    return self._pyroDaemon.objectsById[uri.asString().split(":")[1].split("@")[0]]
  def register_plugin_function(self, name, function):
    """Register a plugin function that can be called from the client by name."""
    if name in self.plugin_functions:
      raise Exception("Cannot add plugin function with duplicate name: %s" % name)
    self.plugin_functions[name] = function
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
    return self.pyro_register(slycat.analysis.coordinator.array(array_workers, sources))

factory = coordinator_factory(nameserver_thread.nameserver)

class plugin_context(object):
  def __init__(self, factory):
    self.factory = factory
  def register_plugin_function(self, name, function):
    self.factory.register_plugin_function(name, function)
    slycat.analysis.coordinator.log.debug("Registered operator %s", name)
context = plugin_context(factory)

plugin_directories = [os.path.join(os.path.dirname(os.path.realpath(slycat.analysis.__file__)), "plugins")] + options.plugins
for plugin_directory in plugin_directories:
  try:
    slycat.analysis.coordinator.log.debug("Loading plugins from %s", plugin_directory)
    plugin_names = [x[:-3] for x in os.listdir(plugin_directory) if x.endswith(".py")]
    for plugin_name in plugin_names:
      try:
        module_fp, module_path, module_description = imp.find_module(plugin_name, [plugin_directory])
        plugin = imp.load_module(plugin_name, module_fp, module_path, module_description)
        if hasattr(plugin, "register_coordinator_plugin"):
          plugin.register_coordinator_plugin(context)
      except Exception as e:
        import traceback
        slycat.analysis.coordinator.log.error(traceback.format_exc())
      finally:
        if module_fp:
          module_fp.close()
  except Exception as e:
    import traceback
    slycat.analysis.coordinator.log.error(traceback.format_exc())

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
slycat.analysis.coordinator.log.info("Listening on %s, nameserver listening on %s:%s", options.host, options.nameserver_host, options.nameserver_port)
daemon.requestLoop()

######################################################################################################
## Cleanup.

for key, value in daemon.objectsById.items():
  if key not in ["slycat.coordinator", "Pyro.Daemon"]:
    slycat.analysis.coordinator.log.debug("Leaked object %s: %s", key, value)

slycat.analysis.coordinator.log.info("Shutdown complete.")

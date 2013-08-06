# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

slycat_analysis_disable_client_plugins = True

from slycat.analysis import __file__ as plugin_root
import logging
import os
import Pyro4
import slycat.analysis.coordinator
import subprocess
import threading

class factory(slycat.analysis.coordinator.pyro_object):
  """Top-level factory for coordinator objects."""
  def __init__(self, nameserver):
    slycat.analysis.coordinator.pyro_object.__init__(self)
    self.nameserver = nameserver
  def shutdown(self):
    slycat.analysis.coordinator.log.info("Client requested shutdown.")
    self._pyroDaemon.shutdown()

  def workers(self):
    """Returns the set of available slycat analysis workers."""
    return [Pyro4.Proxy(self.nameserver.lookup(worker)) for worker in self.nameserver.list(prefix="slycat.worker").keys()]

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
        raise Exception("Cannot load operator with duplicate name: %s" % name)
      operators.append(name)
      setattr(factory, name, make_connection_method(function))
      slycat.analysis.coordinator.log.debug("Registered operator %s", name)

  context = plugin_context()

  plugin_dirs = [os.path.join(os.path.dirname(os.path.realpath(root)), "plugins")]
  for plugin_dir in plugin_dirs:
    try:
      slycat.analysis.coordinator.log.debug("Loading plugins from %s", plugin_dir)
      plugin_names = [x[:-3] for x in os.listdir(plugin_dir) if x.endswith(".py")]
      for plugin_name in plugin_names:
        try:
          module_fp, module_pathname, module_description = imp.find_module(plugin_name, [plugin_dir])
          plugin = imp.load_module(plugin_name, module_fp, module_pathname, module_description)
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

load_plugins(plugin_root)

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
slycat.analysis.coordinator.log.info("Listening on %s, nameserver listening on %s:%s", options.host, options.nameserver_host, options.nameserver_port)
daemon.requestLoop()

for key, value in daemon.objectsById.items():
  if key not in ["slycat.coordinator", "Pyro.Daemon"]:
    slycat.analysis.coordinator.log.debug("Leaked object %s: %s", key, value)

slycat.analysis.coordinator.log.info("Shutdown complete.")

# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import logging
import Pyro4
import slycat.analysis.coordinator
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
  slycat.analysis.coordinator.log.setLevel(logging.DEBUG)
elif options.log_level == "info":
  slycat.analysis.coordinator.log.setLevel(logging.INFO)
elif options.log_level == "warning":
  slycat.analysis.coordinator.log.setLevel(logging.WARNING)
elif options.log_level == "error":
  slycat.analysis.coordinator.log.setLevel(logging.ERROR)
elif options.log_level == "critical":
  slycat.analysis.coordinator.log.setLevel(logging.CRITICAL)
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

workers = [subprocess.Popen(["python", "slycat-analysis-worker.py", "--nameserver-host={}".format(options.nameserver_host), "--nameserver-port={}".format(options.nameserver_port), "--hmac-key={}".format(options.hmac_key), "--host=127.0.0.1", "--log-level={}".format(options.log_level)]) for i in range(options.local_workers)]

daemon = Pyro4.Daemon(host=options.host)
nameserver_thread.nameserver.register("slycat.coordinator", daemon.register(slycat.analysis.coordinator.factory(nameserver_thread.nameserver), "slycat.coordinator"))
slycat.analysis.coordinator.log.info("Listening on %s, nameserver listening on %s:%s", options.host, options.nameserver_host, options.nameserver_port)
daemon.requestLoop()

for key, value in daemon.objectsById.items():
  if key not in ["slycat.coordinator", "Pyro.Daemon"]:
    slycat.analysis.coordinator.log.debug("Leaked object %s: %s", key, value)

slycat.analysis.coordinator.log.info("Shutdown complete.")

# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import logging
import optparse
import Pyro4
import slycat.analysis.worker
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
else:
  raise Exception("Unknown log level: {}".format(options.log_level))

slycat.analysis.worker.log.info("Locating nameserver at %s:%s", options.nameserver_host, options.nameserver_port)
nameserver = Pyro4.naming.locateNS(options.nameserver_host, options.nameserver_port)

daemon = Pyro4.Daemon(host=options.host)
nameserver.register("slycat.worker.%s" % uuid.uuid4().hex, daemon.register(slycat.analysis.worker.factory(), "slycat.worker"))
slycat.analysis.worker.log.info("Listening on %s", options.host)
daemon.requestLoop()

for key, value in daemon.objectsById.items():
  if key not in ["slycat.worker", "Pyro.Daemon"]:
    slycat.analysis.worker.log.debug("Leaked object %s: %s", key, value)

slycat.analysis.worker.log.info("Shutdown complete.")

# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

#!/usr/bin/env python

import os
import subprocess

enabled_plugins = "/etc/munin/plugins"
plugin_storage = "/usr/share/munin/plugins"
conf_storage = "/etc/munin/plugin-conf.d"
context = "system_u:object_r:munin_unconfined_plugin_exec_t:s0"

for plugin in ["couchdb-availability", "couchdb-request-times", "slycat-availability", "slycat-files", "slycat-memory", "slycat-threads", "slycat-requests"]:
  subprocess.check_call(["cp", plugin, plugin_storage])
  subprocess.check_call(["chown", "root:root", os.path.join(plugin_storage, plugin)])
  subprocess.check_call(["chmod", "755", os.path.join(plugin_storage, plugin)])
  subprocess.check_call(["chcon", context, os.path.join(plugin_storage, plugin)])
  subprocess.check_call(["ln", "-sf", os.path.join(plugin_storage, plugin), os.path.join(enabled_plugins, plugin)])

for conf in ["slycat.conf", "slycat-files.conf", "slycat-requests.conf"]:
  subprocess.check_call(["cp", conf, conf_storage])

subprocess.check_call(["/etc/init.d/munin-node", "restart"])

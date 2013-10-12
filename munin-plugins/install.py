#!/usr/bin/env python

import os
import subprocess

enabled_plugins = "/etc/munin/plugins"
plugin_storage = "/usr/share/munin/plugins"
context = "system_u:object_r:munin_unconfined_plugin_exec_t:s0"

for plugin in ["couchdb-availability", "couchdb-database", "couchdb-requests"]:
  subprocess.check_call(["cp", plugin, plugin_storage])
  subprocess.check_call(["chcon", context, os.path.join(plugin_storage, plugin)])
  subprocess.check_call(["ln", "-sf", os.path.join(plugin_storage, plugin), os.path.join(enabled_plugins, plugin)])

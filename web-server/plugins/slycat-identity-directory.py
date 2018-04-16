# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

configuration = {
  "domain" : None,
  "blacklist" : None,
}

def init(domain, blacklist=[]):
  global configuration
  configuration["domain"] = domain
  configuration["blacklist"] = blacklist

def user(uid):
  global configuration
  if uid in configuration["blacklist"]:
    return None
  return {
    "name": uid,
    "email": "%s@%s" % (uid, configuration["domain"])
    }

def register_slycat_plugin(context):
  context.register_directory("identity", init, user)


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


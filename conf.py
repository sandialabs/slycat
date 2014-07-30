import sys

class module_proxy(object):
  __all__ = []

  def __init__(self, *args, **kwargs):
    pass

  def __call__(self, *args, **kwargs):
    return module_proxy()

  @classmethod
  def __getattr__(cls, name):
    if name in ("__file__", "__path__"):
        return "/dev/null"
    elif name[0] == name[0].upper():
      proxy_type = type(name, (), {})
      proxy_type.__module__ = __name__
      return proxy_type
    else:
      return module_proxy()

for module_name in ["cherrypy", "couchdb", "h5py", "numpy", "paramiko", "pystache"]:
  sys.modules[mod_name] = module_proxy()

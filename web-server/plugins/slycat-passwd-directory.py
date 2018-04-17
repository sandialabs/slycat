# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.
#
# directory lookup function based on RHEL password file

import cherrypy
import datetime
import traceback

configuration = {
  "cache"    : {},
  "email"    : None,
  "timeout"  : None
}

def init(pFile="/etc/passwd", email="mail", timeout=datetime.timedelta(seconds=5)):
  global configuration
  configuration["passwdFile"] = pFile
  configuration["email"]      = email
  configuration["timeout"]    = timeout

def lookupUser(uname, pFile):
  with open(pFile) as fh:
    for line in fh:
      if uname == line.split(":")[0]:
        # verify this is a login account
        if line.split(":")[6].find("nologin")>=0:
          raise AssertionError, "Username %s is not a login account." % uname
        nameField = line.split(":")[4]
        return uname if nameField=="" else nameField
  return ""

def user(username):
  global configuration
  if username not in configuration["cache"]:
    try:
      # Lookup the given username in the password file
      result = lookupUser(username, configuration["passwdFile"])

      if result == "": raise AssertionError, "Username %s was not found ." % username
      #cherrypy.log.error("++ passwd dir approving lookup for %s" % username)
      # Cache the information we need for speedy lookup.
      configuration["cache"][username] = {
        "name" : result,
        "email" : configuration["email"]
        }
    except AssertionError as e:
      cherrypy.log.error( e.message )
      raise cherrypy.HTTPError(404)
    except:
      cherrypy.log.error(traceback.format_exc())
      raise cherrypy.HTTPError(500)
    
  return configuration["cache"][username]

def register_slycat_plugin(context):
  context.register_directory("passwd", init, user)


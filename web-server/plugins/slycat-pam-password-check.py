# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
  import cherrypy
  import datetime
  def check_password(realm, username, password, timeout=datetime.timedelta(seconds=5)):
    try:
      import pam
      
      groups = []
      pServer = pam.pam()
      returnCode = pServer.authenticate(username, password)
      if returnCode == True:
        return True, groups
      else:
        cherrypy.log.error("PAM password check failed to authenticate %s" % username )
        return False, groups
      
    except Exception as e:
      cherrypy.log.error("%s" % e)
      return False, groups

  context.register_password_check("slycat-pam-password-check", check_password)

# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def register_slycat_plugin(context):
  def check_password(realm, username, password):
    """Allow any user, so long as their username and password are the same.
    Obviously, this is suitable only for testing."""
    groups = []
    return username and password and username == password, groups

  context.register_password_check("slycat-identity-password-check", check_password)

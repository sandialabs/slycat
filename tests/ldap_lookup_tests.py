import slycat.web.server.directory as d
import nose

l = d.ldap('ldaps://sec-ldap-nm.sandia.gov/','ou=snl,dc=nnsa,dc=doe,dc=gov')

def test_uid_to_username_lookup():
  nose.tools.assert_equal("cjsnide", l.uid_to_username("31776"))
  nose.tools.assert_equal(None, l.uid_to_username("317FOOBAR76"))

def test_gid_to_username_lookup():
  nose.tools.assert_equal("cjsnide", l.gid_to_username("31776"))
  nose.tools.assert_equal(None, l.gid_to_username("317FOOBAR76"))

import slycat.web.server.directory as d
import nose
import ConfigParser

config = ConfigParser.ConfigParser()
config.read("test-config.ini")
l = d.ldap(config.get("slycat","ldap_query_server"), config.get("slycat","ldap_query_dn"))

def test_uid_to_username_lookup():
  nose.tools.assert_equal("cjsnide", l.uid_to_username("31776"))
  nose.tools.assert_equal(None, l.uid_to_username("317FOOBAR76"))

def test_gid_to_username_lookup():
  nose.tools.assert_equal("cjsnide", l.gid_to_username("31776"))
  nose.tools.assert_equal(None, l.gid_to_username("317FOOBAR76"))

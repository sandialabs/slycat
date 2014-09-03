import slycat.web.server.directory as d
import nose.tools
import mock
import cherrypy

cherrypy.log.screen = False

l = d.ldap("example.com", "example_dn")
l.ldap_query = mock.Mock(return_value={'DefaultShell': ['/bin/bash'], 'displayName': ['FooBar FooFoo'], 'uid': ['fooby']})

def test_uid_to_username_lookup():
  l.ldap_query = mock.Mock(return_value={'displayName': ['FooBar FooFoo'], 'uid': ['fooby']})
  nose.tools.assert_equal("fooby", l.uid_to_username("31776"))
  l.ldap_query = mock.Mock(return_value=None)
  nose.tools.assert_equal("317FOOBAR76", l.uid_to_username("317FOOBAR76"))

def test_gid_to_username_lookup():
  l.ldap_query = mock.Mock(return_value={'displayName': ['FooBar FooFoo'], 'uid': ['fooby']})
  nose.tools.assert_equal("fooby", l.gid_to_username("31776"))
  l.ldap_query = mock.Mock(return_value=None)
  nose.tools.assert_equal("317FOOBAR76", l.gid_to_username("317FOOBAR76"))

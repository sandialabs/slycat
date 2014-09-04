import slycat.web.server.directory as d
import nose.tools
import mock
import cherrypy

cherrypy.log.screen = False

l = d.ldap("example.com", "example_dn")

def test_uid_to_username_lookup():
  ret_val={'displayName': ['FooBar FooFoo'], 'uid': ['fooby']}
  with mock.patch.object(l, '_ldap__ldap_query', return_value=ret_val) as method:
    nose.tools.assert_equal("fooby", l.uid_to_username("31776"))
  with mock.patch.object(l, '_ldap__ldap_query', return_value=None) as method:
    nose.tools.assert_equal("317FOOBAR76", l.uid_to_username("317FOOBAR76"))

def test_gid_to_username_lookup():
  ret_val={'displayName': ['FooBar FooFoo'], 'uid': ['fooby']}
  with mock.patch.object(l, '_ldap__ldap_query', return_value=ret_val) as method:
    nose.tools.assert_equal("fooby", l.gid_to_username("31776"))
  with mock.patch.object(l, '_ldap__ldap_query', return_value=None) as method:
    nose.tools.assert_equal("317FOOBAR76", l.gid_to_username("317FOOBAR76"))

def test_user_query_lookup():
  ret_val={'displayName': ['FooBar FooFoo'], 'uid': ['fooby'], 'cn': ['my_cn'], 'esnAdministrativeDomainName': ["example.com"], 'memberOf': ["role1","role2"]}
  with mock.patch.object(l, '_ldap__ldap_query', return_value=ret_val) as method:
    nose.tools.assert_equal({"name": "my_cn", "email": "fooby@example.com", "roles": ["role1","role2"]}, l.user("fooby"))

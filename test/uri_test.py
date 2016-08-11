import pytest
from uri import URI

auth_uri = URI('http://some_user:some_password@example.com:8080/foo?bar=baz')

def test_create_uri():
  simple_uri = URI('http://example.com/foo?bar=baz')
  assert simple_uri.toString() == 'http://example.com/foo?bar=baz'

def test_toString_same_as_valueOf():
  assert auth_uri.toString() == 'http://some_user:some_password@example.com:8080/foo?bar=baz'

def test_valueOf_returns_same_as_toString():
  assert auth_uri.valueOf() == auth_uri.toString()

def test_protocol_parsed():
  assert auth_uri.protocol() == 'http'

def test_scheme_is_same_as_protocol():
  assert auth_uri.scheme() == auth_uri.protocol()

def test_username_parsed():
  assert auth_uri.username() == 'some_user'

def test_password_parsed():
  assert auth_uri.password() == 'some_password'

def test_hostname_parsed():
  assert auth_uri.hostname() == 'example.com'

def test_port_parsed():
  assert auth_uri.port() == '8080'

def test_fragment_parsed():
  # Not sure if this is a good uri w/ both query and fragment...
  fragment_uri = URI('http://example.com/foo?bar=baz#anchor')
  assert fragment_uri._fragment == 'anchor'

def test_removing_search_value_from_uri():
  uri = URI('http://example.com/foo?bar=baz')
  assert uri.removeSearch(['bar']).toString() == 'http://example.com/foo'

# Why does this sitll have the '?' and the previous test doesn't?
def test_removing_search_value_with_key_from_uri():
  uri = URI('http://example.com/foo?bar=baz')
  assert uri.removeSearch(['bar'], 'baz').toString() == 'http://example.com/foo'

def test_removeQuery_is_same_as_removeSearch():
  uri = URI('http://example.com/foo?bar=baz')
  assert uri.removeQuery(['bar']).toString() == uri.removeSearch(['bar']).toString()


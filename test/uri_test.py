import pytest
from slycat.uri import URI

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

def test_str_representation():
  assert str(auth_uri) == 'http://some_user:some_password@example.com:8080/foo?bar=baz'

def test_fragment_parsed():
  # Not sure if this is a good uri w/ both query and fragment...
  fragment_uri = URI('http://example.com/foo?bar=baz#anchor')
  assert fragment_uri._fragment == 'anchor'

def test_removing_search_value_from_uri():
  uri = URI('http://example.com/foo?bar=baz')
  assert uri.removeSearch(['bar']).toString() == 'http://example.com/foo'

def test_removing_search_value_and_key_from_uri_given_key():
  uri = URI('http://example.com/foo?bar=baz')
  assert uri.removeSearch(['bar']).toString() == 'http://example.com/foo'

def test_removing_multiple_search_keys_and_values_from_uri_given_keys():
  uri = URI('http://example.com/foo?bar=baz&sam=sue')
  assert uri.removeSearch(['bar', 'sam']).toString() == 'http://example.com/foo'

def test_removing_only_keys_with_given_value_from_uri():
  uri = URI("http://example.com/foo?bar=baz&name=sue")
  assert uri.removeSearch(['bar'], 'baz').toString() == "http://example.com/foo?name=sue"

def test_removeQuery_is_same_as_removeSearch():
  uri = URI('http://example.com/foo?bar=baz')
  assert uri.removeQuery(['bar']).toString() == uri.removeSearch(['bar']).toString()

## Setter tests
class TestUriSetters:
  def setup(self):
    self.uri = URI('http://some_user:some_password@example.com:8080/foo?bar=baz#anchor')

  def test_set_protocol(self):
    assert str(self.uri.protocol(value='https')) == 'https://some_user:some_password@example.com:8080/foo?bar=baz#anchor'

  def test_set_username(self):
    assert str(self.uri.username(value='eggsample')) == 'http://eggsample:some_password@example.com:8080/foo?bar=baz#anchor'

  def test_set_password(self):
    assert str(self.uri.password(value='secret')) == 'http://some_user:secret@example.com:8080/foo?bar=baz#anchor'

  def test_set_hostname(self):
    assert str(self.uri.hostname(value='example.net')) == 'http://some_user:some_password@example.net:8080/foo?bar=baz#anchor'

  def test_set_port(self):
    assert str(self.uri.port(value='7070')) == 'http://some_user:some_password@example.com:7070/foo?bar=baz#anchor'


import unittest
from uri import URI

class TestSlycatUri(unittest.TestCase):
  #def test_toString_same_as_valueOf(self):
   def test_create_uri(self):
     u = URI()
     self.assertEqual(u.toString(), "http://example.com")
#     u = URI("http://example.com")
#     self.assertEqual(u.toString(), "http://example.com")


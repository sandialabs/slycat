import pytest
import slycat.web.server.handlers as handler

## It seems like testing most of the handler will require integration testing by
##   standing up a Cherrypy instance. Otherwise, to get unit testing, there will
##   need to be lots of mocking.

#def test_css_bundle():
#  assert handler.css_bundle() == 'dorg'

def test_require_json_parameter():
  assert handler.require_json_parameter("name") == 'happy'


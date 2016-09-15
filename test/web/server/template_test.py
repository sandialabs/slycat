import pytest
import slycat.web.server.template as template

# Hooks into Cherrypy, so needs stub/mock or something. Otherwise, do an
# integration test.

def test_render():
  assert template.render('.', "some_context_here") == 'nice mustache template-y stuff'

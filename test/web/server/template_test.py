# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import pytest
import slycat.web.server.template as template

# Hooks into Cherrypy, so needs stub/mock or something. Otherwise, do an
# integration test.

def test_render():
  assert template.render('.', "some_context_here") == 'nice mustache template-y stuff'

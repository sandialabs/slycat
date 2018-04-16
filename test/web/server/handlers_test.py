# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import pytest
import slycat.web.server.handlers as handler

## It seems like testing most of the handler will require integration testing by
##   standing up a Cherrypy instance. Otherwise, to get unit testing, there will
##   need to be lots of mocking.

#def test_css_bundle():
#  assert handler.css_bundle() == 'dorg'

def test_require_json_parameter():
  assert handler.require_json_parameter("name") == 'happy'


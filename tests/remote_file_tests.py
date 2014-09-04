import h5py
import nose.tools
import numpy.testing
import os
import tempfile

import cherrypy
import stat
import mock
import slycat.web.server.handlers

# don't want to see the logs in my test output
cherrypy.log.screen = False

############# HELPER for Mocking ** Anything ** ##################
class MockAnything:
  pass

  def __enter__(self, *args):
    return self

  def __exit__(self, *args):
    return

  def __call__(self, *args):
    return

def do_raise(msg=None):
  raise IOError, msg

def mock_ssh_session(error_message=None):
  mock_session = MockAnything()
  mock_sftp    = MockAnything()
  mock_file    = MockAnything()
  mock_ssh     = MockAnything()
  mock_stat    = MockAnything()
  mock_io      = MockAnything()
  mock_file.read = lambda : do_raise(error_message)
  mock_sftp.file = lambda x: mock_file
  mock_stat.st_mode = None
  mock_sftp.stat = lambda x: mock_stat
  mock_session.sftp = mock_sftp
  mock_io.read = lambda : "Permissions go here"
  mock_ssh.exec_command = mock.Mock(return_value=(True,mock_io,True)) 
  mock_session.ssh  = mock_ssh
  return mock_session
  

############# ** TESTS ** ###########################################
def test_remote_file_missing():
  stat.S_ISDIR = mock.Mock(return_value=False)
  slycat.web.server.ssh.get_session = mock.Mock(return_value=mock_ssh_session("No such file"))

  with nose.tools.assert_raises_regexp(cherrypy.HTTPError, "400 Remote access failed: No such file"):
    slycat.web.server.handlers.get_remote_file("IDK","/some_missing_path")

  slycat.web.server.ssh.get_session.assert_called_once_with("IDK")

def test_remote_file_permission_denide():
  stat.S_ISDIR = mock.Mock(return_value=False)
  slycat.web.server.ssh.get_session = mock.Mock(return_value=mock_ssh_session("Permission Denied"))

  with nose.tools.assert_raises_regexp(cherrypy.HTTPError, "400 Remote access failed: Permission Denied"):
    slycat.web.server.handlers.get_remote_file("IDK","/some_access_restricted_file")

  slycat.web.server.ssh.get_session.assert_called_once_with("IDK")

def test_remote_file_garbage_packet():
  stat.S_ISDIR = mock.Mock(return_value=False)
  slycat.web.server.ssh.get_session = mock.Mock(return_value=mock_ssh_session("Garbage packet received"))

  with nose.tools.assert_raises_regexp(cherrypy.HTTPError, "500 Remote access failed: Garbage packet received"):
    slycat.web.server.handlers.get_remote_file("IDK","/some_access_restricted_file")

  slycat.web.server.ssh.get_session.assert_called_once_with("IDK")

def test_remote_file_access_failure_catch_all():
  stat.S_ISDIR = mock.Mock(return_value=False)
  slycat.web.server.ssh.get_session = mock.Mock(return_value=mock_ssh_session("Something went Wrong"))

  with nose.tools.assert_raises_regexp(cherrypy.HTTPError, "400 Remote access failed: Something went Wrong"):
    slycat.web.server.handlers.get_remote_file("IDK","/some_access_issue")

  slycat.web.server.ssh.get_session.assert_called_once_with("IDK")

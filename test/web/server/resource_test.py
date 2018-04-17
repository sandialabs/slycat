# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import pytest
import slycat.web.server.resource as resource

def test_init_manager():
  mgr = resource.Manager()
  assert mgr is not None
  
def test_add_bundle_using_server_default():
  mgr = resource.Manager()
  #print(os.path.join(cherrypy.tree.apps[""].config["slycat-web-server"]["root-path"], path))
  assert mgr.add_bundle("text/css", 
      [
        "css/namespaced-bootstrap.css",
        "css/font-awesome.css",
        "css/slycat.css",
      ]) == 'dorg'
      #== '0e54b9f330e868393ac40aa84ee9b8d2'

def test_add_bundle_using_absolute_path():
  abs_path_prefix = "/home/jecompt/job/projects/slycat-project/slycat/"
  mgr = resource.Manager()
  assert mgr.add_bundle("text/css", 
      [
        abs_path_prefix + "web-server/css/namespaced-bootstrap.css",
        abs_path_prefix + "web-server/css/font-awesome.css",
        abs_path_prefix + "web-server/css/slycat.css",
      ]) == '0e54b9f330e868393ac40aa84ee9b8d2'

# def test_add_directory_to_manager

# def tetst_add_file_to_manager

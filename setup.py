# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

from setuptools import setup, find_packages
setup(
  name = "slycat",
  version = "1.1.0",
  package_dir = {"" : "packages"},
  packages = find_packages("packages", exclude=[]),
  # adding hard requirement for numpy since read the docs uses python 3.7 by default
  # second possible fix is to add read the docs yaml
  install_requires=['cherrypy', 'numpy==1.21.0']
)
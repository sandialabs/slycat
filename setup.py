# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

from setuptools import setup, find_packages
setup(
  name = "slycat",
  version = "1.1.0",
  package_dir = {"" : "packages"},
  packages = find_packages("packages", exclude=[]),
  install_requires=['cherrypy', 'numpy']
)

# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

from setuptools import setup, find_packages
setup(
  name = "slycat",
  version = "1.1.0",
  package_dir = {"" : "packages"},
  packages = find_packages("packages", exclude=[]),
  install_requires=['cherrypy', 'numpy', 'cPickle']
)

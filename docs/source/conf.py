# Configuration file for the Sphinx documentation builder.
#
# This file only contains a selection of the most common options. For a full
# list see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Path setup --------------------------------------------------------------

# If extensions (or modules to document with autodoc) are in another directory,
# add these directories to sys.path here. If the directory is relative to the
# documentation root, use os.path.abspath to make it absolute, like shown here.
#
# import os
# import sys
# sys.path.insert(0, os.path.abspath('.'))

import sys
import os

# add in slycat packages for autodoc
sys.path.insert(0, os.path.abspath('../../packages'))

class module_proxy(object):
  __all__ = []

  def __init__(self, *args, **kwargs):
    pass

  def __call__(self, *args, **kwargs):
    return module_proxy()

  @classmethod
  def __getattr__(cls, name):
    if name in ("__file__", "__path__"):
        return "/dev/null"
    elif name[0] == name[0].upper():
      proxy_type = type(name, (), {})
      proxy_type.__module__ = __name__
      return proxy_type
    else:
      return module_proxy()

for module_name in ["couchdb", "couchdb.client", "h5py", "numpy", 
                    "paramiko", "pyparsing", "pystache", "scipy", 
                    "scipy.linalg", "scipy.cluster", "scipy.cluster.hierarchy", 
                    "scipy.spatial", "scipy.spatial.distance", "scipy.stats", 
                    "slycat.hyperchunks.grammar"]:
  sys.modules[module_name] = module_proxy()

# -- Project information -----------------------------------------------------

project = 'Slycat'
copyright = """2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software"""
author = 'Matthew Letter'
master_doc = 'index'

# The full version, including alpha/beta/rc tags
release = '3.0.0'

# -- General configuration ---------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
  "sphinx.ext.autodoc",
  "sphinx.ext.viewcode",
  "sphinx.ext.mathjax",
  "sphinx.ext.napoleon",
  "sphinxcontrib.httpdomain",
]
# Add any paths that contain templates here, relative to this directory.
templates_path = ['_templates']

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This pattern also affects html_static_path and html_extra_path.
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']


# -- Options for HTML output -------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
#
html_theme = "sphinx_rtd_theme"

# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
html_static_path = ['_static']
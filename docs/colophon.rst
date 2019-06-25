.. _colophon:

Colophon
========

The following are needed to generate this documentation:

* Sphinx - documentation builder - http://sphinx-doc.org
* Sphinx readthedocs theme - https://github.com/snide/sphinx_rtd_theme
* napoleon - http://sphinxcontrib-napoleon.readthedocs.org/en/latest/
* httpdomain - http://pythonhosted.org/sphinxcontrib-httpdomain/

Writing the Documentation
-------------------------

The primary sources for this documentation are the docstrings
embedded in the Slycat source code itself.  When writing docstrings,
strictly follow the guidelines at https://numpydoc.readthedocs.io/en/latest/format.html#docstring-standard

The remainder of the documentation is contained in `*.rst` files in
the `slycat/docs` directory.

Building the Documentation
--------------------------

To build the documentation, run::

  $ cd slycat/docs
  $ python setup.py

Once the documentation is built, you can view it by opening
`slycat/docs/_build/html/index.html` in a web browser.

Deploying the Documentation
---------------------------

The slycat documentation is hosted at http://slycat.readthedocs.org and is
automatically built and deployed whenever changes are pushed to the Slycat
repository at github.com.

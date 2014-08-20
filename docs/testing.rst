.. _Testing:

Testing
=======

The following are required to run the Slycat regression tests / view test coverage:

* nose - unit test framework - https://nose.readthedocs.org/en/latest/
* coverage - code coverage module - http://nedbatchelder.com/code/coverage/

Running Regression Tests
------------------------

Slycat testing has been roughly divided into two categories: unit tests on
individual software components, and high-level system testing that exercises
the entire Slycat system using a running Slycat web server.  To run the unit
tests, run nose in the top level of the Slycat source tree::

  $ cd slycat
  $ nosetests

To run the system tests, run nose within the `web-server` directory in the source
tree::

  $ cd slycat/web-server
  $ nosetests

Modifying Regression Tests
--------------------------

* To add or modify unit tests, edit `slycat/tests/tests.py`.
* To add or modify system tests, edit `slycat/web-server/tests.py`.

Test Coverage
-------------

When you run the unit test suite with nose, it also automatically generates
code coverage statistics.  To see the coverage results, open
`slycat/.cover/index.html` in a web browser.


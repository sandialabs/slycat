import nose.tools
import numpy.testing

import slycat.cca

def test_slycat_cca_preconditions():
  with nose.tools.assert_raises_regexp(TypeError, "X and Y must be numpy.ndarray instances."):
    slycat.cca.cca([], [])
  with nose.tools.assert_raises_regexp(ValueError, "X and Y must have two dimensions."):
    slycat.cca.cca(numpy.random.random(10), numpy.random.random(10))
  with nose.tools.assert_raises_regexp(ValueError, "X and Y must contain the same number of rows."):
    slycat.cca.cca(numpy.random.random((10, 4)), numpy.random.random((11, 3)))
  with nose.tools.assert_raises_regexp(ValueError, "X and Y must contain two-or-more rows."):
    slycat.cca.cca(numpy.random.random((1, 4)), numpy.random.random((1, 3)))
  with nose.tools.assert_raises_regexp(ValueError, "X and Y must contain one-or-more columns."):
    slycat.cca.cca(numpy.random.random((10, 0)), numpy.random.random((10, 0)))
  with nose.tools.assert_raises_regexp(ValueError, "Columns in X and Y cannot be constant."):
    slycat.cca.cca(numpy.zeros((10, 4)), numpy.ones((10, 3)))
  with nose.tools.assert_raises_regexp(TypeError, "scale_inputs must be a boolean."):
    slycat.cca.cca(numpy.random.random((10, 4)), numpy.random.random((10, 3)), scale_inputs=3)
  with nose.tools.assert_raises_regexp(TypeError, "force_positive must be an integer or None."):
    slycat.cca.cca(numpy.random.random((10, 4)), numpy.random.random((10, 3)), force_positive=3.4)
  with nose.tools.assert_raises_regexp(ValueError, "force_positive must be in the range \[0, number of Y columns\)."):
    slycat.cca.cca(numpy.random.random((10, 4)), numpy.random.random((10, 3)), force_positive=5)
  with nose.tools.assert_raises_regexp(TypeError, "significant_digits must be an integer or None."):
    slycat.cca.cca(numpy.random.random((10, 4)), numpy.random.random((10, 3)), significant_digits=3.4)

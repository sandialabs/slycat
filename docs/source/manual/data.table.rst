.. _csv-ref-label:

Source Data Table
=================

**CSV Format, Specification, Options**

Slycat relies on a CSV-format data table to create most of its analysis models. Often this table already exists as a product or artifact of completing an ensemble of simulation runs.  Supplementing the table with file system paths to images, animations, PDF documents, and 3D model files (such as STL and VTP) will produce an enhanced Parameter Space model.  An enhanced Parameter Space model enables a user to connect features in a plotted numerical domain to explanatory images or artifacts that convey physical intuition about why particular samples have similar features in a quantitative space.

The CCA and Parameter Space models are created solely by supplying a CSV file. The file is expected to follow the standard CSV format where each row is a set of comma-delimited values from a single sample. A header row should name the values contained in the columns, and the delimiters must be commas. Columns may contain integers, real numbers, or strings. Columns must be type-consistent and missing data should be represented with an appropriate entry, such as “” for empty string or NAN for missing number.

Here is a simple CSV file example:

.. code-block:: bash

  index, value1, value2
  0, 2.7, 3
  1, 2.6, 5
  2, 2.5, 2

Here is a CSV example for a Linux remote system that includes one media column:

.. code-block:: bash

  index, value1, value2, media1
  0, 2.7, 3, file://hostname/tmp/sim1/stress.jpg
  1, 2.6, 5, file://hostname/tmp/sim2/stress.jpg
  2, 2.5, 2, file://hostname/tmp/sim3/stress.jpg

The format for a Linux file system URL or media path is:

.. code-block:: bash

  file://hostname/path/to/image.jpg

To include a reference to a media file on a Windows file system, use this format:

.. code-block:: bash

  smb://somehost.example.com/drive/path/to/image.jpg

Here is a CSV example for a remote Windows file system, that includes one media column:

.. code-block:: bash

  index, value1, value2, media1
  0, 2.7, 3, smb://host.example.com/collab/sim1/stress.jpg
  1, 2.6, 5, smb://host.example.com/collab/sim2/stress.jpg
  2, 2.5, 2, smb://host.example.com/collab/sim3/stress.jpg


**XY Pairs**

The Parameter Space model recognizes pairs of columns in the data table, such as pairs of (x, y) coordinates.  When XY pairs are present Slycat allows a user to visualize that pair with a single selection in the Navbar, instead of individually selecting the X-axis variable and the Y-axis variable.  To enable this feature and mark the pair of columns, the 2 column labels are prefaced with [XYpair X] and [XYpair Y]. The column label string is placed after the preface, and the label is closed with an X or a Y. When both labels are combined in the Navbar control the final X or Y character is dropped.

Here are several examples of valid XY pair column labels:

.. code-block:: bash

  [XYpair X]Risk PCA X, [XYpair Y]Risk PCA Y

.. code-block:: bash

  [XYpair X]Foo X, [XYpair Y]Foo Y


Here is a CSV example that includes an XY pair that indicates a 2D projection of correlation values.

.. code-block:: bash

  index, value1, value2, value3, [XYpair X]Risk PCA X, [XYpair Y]Risk PCA Y
  0, 2.7, 3, 0.056, 0.72, 0.31
  1, 2.6, 3, 0.103, 0.77, 0.52
  2, 2.5, 4, 0.087, 0.44, 0.35


Here is a CSV file example that illustrates numerical values, string values, missing values, media paths, and XY pairs:

.. code-block:: bash

  index, value1, value2, value3, rank, [XYpair X]x_coord, [XYpair Y]y_coord, media1, media2
  0, 2.7, 3, 0.056, low,  0.72, 0.31, file://hostname/tmp/sim1/stress.jpg, file://hostname/tmp/sim1/veloc.jpg
  1, 2.6, 3, 0.103, low,  0.77, 0.52, file://hostname/tmp/sim2/stress.jpg, file://hostname/tmp/sim2/veloc.jpg
  2, 2.5, 4, 0.087,  “”,  0.44, 0.35, file://hostname/tmp/sim3/stress.jpg, file://hostname/tmp/sim3/veloc.jpg
  3, 2.4, 4,   NAN, med,  0.68, 0.59, file://hostname/tmp/sim4/stress.jpg, file://hostname/tmp/sim4/veloc.jpg
  4, 2.3, 5, 0.040, high, 0.39, 0.30, file://hostname/tmp/sim5/stress.jpg, file://hostname/tmp/sim5/veloc.jpg
  5, 2.2, 5, 0.066, med,  0.42, 0.41, file://hostname/tmp/sim6/stress.jpg, file://hostname/tmp/sim6/veloc.jpg


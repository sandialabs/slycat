.. _parameter-image-model:

Parameter Image Model
=====================

Overview
--------

A Parameter Image model relates a set of images to a set of feature vectors,
where we assume that each feature vector is a set of simulation inputs and
outputs, and we assume that each image is a simulation output.

Currently, the preferred method to create a new Parameter Image model is to
import a remote delimited text file (typically a CSV file) using a web browser.
For low-level details on how the input file must be formatted, see
:py:func:`slycat.table.parse`.  In addition to the requirements documented
there, the input delimited text file should contain the following:

* Zero to many "input" columns that contain simulation inputs, e.g: the parameters in a parameter study.
* Zero to many "output" columns that contain simulation outputs, e.g: features extracted from the simulations.
* Zero to many "rating" columns that end users will edit to designate regions in the parameter
  space that should be ignored / explored further in future studies.
* Zero to many "category" columns that contain categorical variables, such as the results
  of machine learning classification.  Category variables may be numeric or string-based,
  and also may be edited by end users.
* Zero to many "image" columns that contain file URIs pointing to images on a remote host.
  Each file URI must be of the form *file://hostname/path/to/file* and files must
  be either PNG or JPEG images.  Slycat uses the file URIs to retrieve images
  via SSH on-demand when end users hover over an observation in the
  scatterplot, so it is important that the files remain in-place and have
  appropriate file permissions.
* At least two numeric columns, regardless of type, so the visualization can generate a scatterplot.

Note that there are no constraints on variable names - end users will explicitly identify which columns
are "input", "output", "rating", "category", "image", or "none of the above" when the data is imported.

Stored Artifacts
----------------

On the server side, a parameter image model includes the following artifacts that are accessible via the :ref:`rest-api`:

* data-table - :py:mod:`darray<slycat.darray>` containing the input table data (a 1D darray with one attribute per table column).
* category-columns - JSON array containing a zero-based index for every column in `data-table` that contains categorical data.
* image-columns - JSON array containing a zero-based index for every column in `data-table` that contains images.
* input-columns - JSON array containing a zero-based index for every column in `data-table` that should be considered an input.
* output-columns - JSON array containing a zero-based index for every column in `data-table` that should be considered an output.
* rating-columns - JSON array containing a zero-based index for every column in `data-table` that contains ratings.

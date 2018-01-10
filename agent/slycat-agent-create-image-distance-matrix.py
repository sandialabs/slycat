#!/bin/env python

# Copyright 2013, National Technology & Engineering Solutions of Sandia, LLC (NTESS).
# Under the terms of Contract DE-NA0003525 with NTESS,
# the U.S. Government retains certain rights in this software.
# Export of this program may require a
# license from the United States Government.

"""Compute distances between images specified in a CSV file.

This script loads data from a CSV file containing zero-or-more columns
containing image variables (file: URIs that point to images on the local host).
Distances between each pair of files is computed, and the resulting symmetric
distance matrix is written to a CSV file.
"""

import argparse
import IPython.parallel
import numpy
import re

class ImageCache(object):
  def __init__(self):
    self._storage = {}

  def image(self, url, process=lambda x:x):
    if url not in self._storage:
      try:
        path = urlparse.urlparse(url).path
        self._storage[url] = process(numpy.asarray(PIL.Image.open(path)))
      except:
        self._storage[url] = None
    return self._storage[url]

def jaccard_distance(left_index, right_index):
# Uses intelligent (image-dependent) thresholding. Slower than jaccard2.
  def convert_bw(image):
    image = skimage.color.rgb2gray(image)
    thresh = skimage.filter.threshold_otsu(image)
    return image

  left_image = image_cache.image(column[left_index], convert_bw)
  right_image = image_cache.image(column[right_index], convert_bw)

  # If both images are nonexistent, return a zero distance so they'll cluster together.
  if left_image is None and right_image is None:
    return 0.0
  # If one image is nonexistent and the other is not, make them as far apart as possible.
  if left_image is None or right_image is None:
    return 1.0
  # If the image dimensions don't match, make them as far apart as possible.
  if left_image.shape != right_image.shape:
    return 1.0
  # The images exist and have identical dimensions, so compute their distance.
  return scipy.spatial.distance.jaccard(left_image.ravel(), right_image.ravel())

def jaccard2_distance(left_index, right_index):
# For very light image data (such as yellow on white background). Do not use for images with a medium to dark background.
  def convert_bw(image):
    image = skimage.color.rgb2gray(image)
    image = image < 0.9
    return image

  left_image = image_cache.image(column[left_index], convert_bw)
  right_image = image_cache.image(column[right_index], convert_bw)

  # If both images are nonexistent, return a zero distance so they'll cluster together.
  if left_image is None and right_image is None:
    return 0.0
  # If one image is nonexistent and the other is not, make them as far apart as possible.
  if left_image is None or right_image is None:
    return 1.0
  # If the image dimensions don't match, make them as far apart as possible.
  if left_image.shape != right_image.shape:
    return 1.0
  # The images exist and have identical dimensions, so compute their distance.
  return scipy.spatial.distance.jaccard(left_image.ravel(), right_image.ravel())

def one_norm_distance(left_index, right_index):
  def convert_gray(image):
    image = skimage.color.rgb2gray(image)
    return image

  left_image = image_cache.image(column[left_index], convert_gray)
  right_image = image_cache.image(column[right_index], convert_gray)

  # If both images are nonexistent, return a zero distance so they'll cluster together.
  if left_image is None and right_image is None:
    return 0.0
  # If one image is nonexistent and the other is not, make them as far apart as possible.
  if left_image is None or right_image is None:
    return 1.0
  # If the image dimensions don't match, make them as far apart as possible.
  if left_image.shape != right_image.shape:
    return 1.0
  # The images exist and have identical dimensions, so compute their distance.
  return scipy.spatial.distance.minkowski(left_image.ravel(), right_image.ravel(),1)

def correlation_distance(left_index, right_index):
  def convert_gray(image):
    image = skimage.color.rgb2gray(image)
    return image

  left_image = image_cache.image(column[left_index], convert_gray)
  right_image = image_cache.image(column[right_index], convert_gray)

  # If both images are nonexistent, return a zero distance so they'll cluster together.
  if left_image is None and right_image is None:
    return 0.0
  # If one image is nonexistent and the other is not, make them as far apart as possible.
  if left_image is None or right_image is None:
    return 1.0
  # If the image dimensions don't match, make them as far apart as possible.
  if left_image.shape != right_image.shape:
    return 1.0
  # The images exist and have identical dimensions, so compute their distance.
  return scipy.spatial.distance.correlation(left_image.ravel(), right_image.ravel())

def cosine_distance(left_index, right_index):
# Note that cosine_distance returns both positive and negative values
  def convert_gray(image):
    image = skimage.color.rgb2gray(image)
    return image

  left_image = image_cache.image(column[left_index], convert_gray)
  right_image = image_cache.image(column[right_index], convert_gray)

  # If both images are nonexistent, return a zero distance so they'll cluster together.
  if left_image is None and right_image is None:
    return 0.0
  # If one image is nonexistent and the other is not, make them as far apart as possible.
  if left_image is None or right_image is None:
    return 1.0
  # If the image dimensions don't match, make them as far apart as possible.
  if left_image.shape != right_image.shape:
    return 1.0
  # The images exist and have identical dimensions, so compute their distance.
  return scipy.spatial.distance.cosine(left_image.ravel(), right_image.ravel())

def hamming_distance(left_index, right_index):
  def convert_gray(image):
    image = skimage.color.rgb2gray(image)
    return image

  left_image = image_cache.image(column[left_index], convert_gray)
  right_image = image_cache.image(column[right_index], convert_gray)

  # If both images are nonexistent, return a zero distance so they'll cluster together.
  if left_image is None and right_image is None:
    return 0.0
  # If one image is nonexistent and the other is not, make them as far apart as possible.
  if left_image is None or right_image is None:
    return 1.0
  # If the image dimensions don't match, make them as far apart as possible.
  if left_image.shape != right_image.shape:
    return 1.0
  # The images exist and have identical dimensions, so compute their distance.
  return scipy.spatial.distance.hamming(left_image.ravel(), right_image.ravel())


# Map measure names to functions
measures = {
  "jaccard" : jaccard_distance,
  "jaccard2" : jaccard2_distance,
  "one-norm" : one_norm_distance,
  "correlation" : correlation_distance,
  "cosine" : cosine_distance,
  "hamming" : hamming_distance
  }


if __name__ == "__main__":
  parser = argparse.ArgumentParser()
  parser.add_argument("--distance-column", default=None, help="Name of a column containing images for computing distances.  Default: any detected image column.")
  parser.add_argument("input", help="Input CSV file containing image paths")
  parser.add_argument("output", help="Output CSV file")
  parser.add_argument("--distance-measure", default="jaccard", help="Distance metric to be used. Options: jaccard, jaccard2 (for very light-colored images), one-norm, correlation, cosine, or hamming. For most image data, correlation or jaccard will yield best results.")
  parser.add_argument("--profile", default=None, help="Name of the IPython profile to use")
  arguments = parser.parse_args()

  ###########################################################################################
  # Parse the input CSV file into a collection of named columns.

  rows = [[value.strip() for value in row.split(",")] for row in open(arguments.input, "r")]
  columns = {column[0] : numpy.array(column[1:], dtype="string") for column in zip(*rows)}

  ###########################################################################################
  # By default, automatically identify which columns are image columns.

  image_columns = []
  expression = re.compile("file://")
  search = numpy.vectorize(lambda x:bool(expression.search(x)))
  for name, column in columns.items():
    if numpy.any(search(column)):
      image_columns.append(name)

  ###########################################################################################
  # If there's a single image column, use it; otherwise, the user must pick one.

  try:
    if arguments.distance_column is None:
      if len(image_columns) != 1:
        raise Exception()
      arguments.distance_column = image_columns[0]
    if arguments.distance_column not in image_columns:
      raise Exception()
  except:
    raise Exception("You must specify a column containing images to be analyzed using --distance-column.  Available choices: %s" % (", ".join(image_columns)))

  ###########################################################################################
  # Connect to our parallel workers, import required modules, and setup some globals
  # for use by the parallel code.

  try:
    workers = IPython.parallel.Client(profile=arguments.profile)[:]
  except Exception, e:
    print str(e)
    raise Exception("A running IPython parallel cluster is required.")

  workers.use_dill()
  with workers.sync_imports():
    import PIL
    import PIL.Image
    import numpy
    import scipy
    import scipy.spatial
    import scipy.spatial.distance
    import skimage
    import skimage.color
    import skimage.filter
    import urlparse
  workers.push({
    "column": columns[arguments.distance_column],
    "image_cache": ImageCache(),
    })

  ###########################################################################################
  # Compute the distance between each pair of images.

  left, right = numpy.triu_indices(len(column), k=1)
  measure = measures[arguments.distance_measure]
  distances = workers.map_sync(measure, left, right)

  ###########################################################################################
  # Convert the distances into a symmetric matrix and dump it to CSV.

  distance_matrix = scipy.spatial.distance.squareform(distances)

  with open(arguments.output, "w") as file:
    file.write(",".join(numpy.arange(len(column)).astype("string")))
    file.write("\n")
    for row in distance_matrix:
      file.write(",".join(row.astype("string")))
      file.write("\n")


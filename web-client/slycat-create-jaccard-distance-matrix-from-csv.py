#!/bin/env python

# Copyright 2013 Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000, there is a non-exclusive license for use of this work by
# or on behalf of the U.S. Government. Export of this program may require a
# license from the United States Government.

"""Compute jaccard distances between images specified in a CSV file.

This script loads data from a CSV file containing zero-or-more columns
containing image variables (file: URIs that point to images on the local host).
Distances between each pair of files is computed, and the resulting symmetric
distance matrix is written to a CSV file.
"""

import argparse
import numpy
import PIL.Image
import re
import scipy.spatial.distance
import skimage.color
import urlparse

class ImageCache(object):
  def __init__(self):
    self._storage = {}

  def image(self, path, process=lambda x:x):
    if path not in self._storage:
      try:
        self._storage[path] = process(numpy.asarray(PIL.Image.open(path)))
      except Exception as e:
        self._storage[path] = None
    return self._storage[path]

image_cache = ImageCache()
column = None

def jaccard_distance(left_index, right_index):
  left_path = urlparse.urlparse(column[left_index]).path
  right_path = urlparse.urlparse(column[right_index]).path

  def threshold_bw(image):
    image = skimage.color.rgb2gray(image)
    image = image < 0.9
    return image

  left_image = image_cache.image(left_path, threshold_bw)
  right_image = image_cache.image(right_path, threshold_bw)

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

if __name__ == "__main__":
  parser = argparse.ArgumentParser()
  parser.add_argument("--distance-column", default=None, help="Name of a column containing images for computing distances.  Default: any detected image column.")
  parser.add_argument("input", help="Input CSV file")
  parser.add_argument("output", help="Output CSV file")
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
  # Compute the distance between each pair of images.

  column = columns[arguments.distance_column]

  left, right = numpy.triu_indices(len(column), k=1)

  distances = numpy.empty(len(left))
  for index in range(len(left)):
    distances[index] = jaccard_distance(left[index], right[index])
    print "Computed distance %s -> %s: %s." % (left[index], right[index], distances[index])

  ###########################################################################################
  # Convert the distances into a symmetric matrix and dump it to CSV.

  distance_matrix = scipy.spatial.distance.squareform(distances)

  with open(arguments.output, "w") as file:
    file.write(",".join(numpy.arange(len(column)).astype("string")))
    file.write("\n")
    for row in distance_matrix:
      file.write(",".join(row.astype("string")))
      file.write("\n")



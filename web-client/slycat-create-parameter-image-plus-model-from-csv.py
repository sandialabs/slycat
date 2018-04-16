#!/bin/env python

# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

"""Compute a parameter image plus model locally from csv data, uploading the results to Slycat Web Server.

This script loads data from a CSV file containing:

Zero-or-more columns containing input variables.
Zero-or-more columns containing output variables.
Zero-or-more columns containing rating variables.
Zero-or-more columns containing category variables.
Zero-or-more columns containing image variables.

The contents of the CSV file are stored on the server unmodified as a raw data table.  Then, for each
image column, a hierarchical clustering of the images in that column is computed and stored on the server.
"""

import collections
import json
import numpy
import os
import re
import scipy.cluster.hierarchy
import scipy.spatial.distance
import slycat.web.client
import urlparse

class ImageCache(object):
  def __init__(self):
    self._reset()

  def _reset(self):
    self._storage = {}

  def reset(self):
    slycat.web.client.log.info("Resetting image cache.")
    self._reset()

  def image(self, path, process=lambda x,y:x):
    if path not in self._storage:
      slycat.web.client.log.info("Loading %s." % path)
      import PIL.Image
      try:
        self._storage[path] = process(numpy.asarray(PIL.Image.open(path)), path)
      except Exception as e:
        slycat.web.client.log.error(str(e))
        self._storage[path] = None
    return self._storage[path]

image_cache = ImageCache()

def identity_distance(left_index, left_path, right_index, right_path):
  """Do-nothing distance measure for two images that always returns 1."""
  return 1.0

def jaccard_distance(left_index, left_path, right_index, right_path):
  def threshold_bw(image, path):
    import skimage.color
    slycat.web.client.log.info("Converting %s rgb to grayscale." % path)
    image = skimage.color.rgb2gray(image)
    slycat.web.client.log.info("Thresholding %s values < 0.9." % path)
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

def euclidean_rgb_distance(left_index, left_path, right_index, right_path):
  left_image = image_cache.image(left_path)
  right_image = image_cache.image(right_path)
  # If both images are nonexistent, return a zero distance so they'll cluster together.
  if left_image is None and right_image is None:
    return 0.0
  # If one image is nonexistent and the other is not, make them as far apart as possible.
  if left_image is None or right_image is None:
    return numpy.finfo("float64").max / 100000
  # If the image dimensions don't match, make them as far apart as possible.
  if left_image.shape != right_image.shape:
    return numpy.finfo("float64").max / 100000
  # The images exist and have identical dimensions, so compute their distance.
  return scipy.spatial.distance.euclidean(left_image.ravel(), right_image.ravel())

def csv_distance(left_index, left_path, right_index, right_path):
  return csv_distance.matrix[left_index, right_index]
csv_distance.matrix = None

# Map measure names to functions
measures = {
  "identity" : identity_distance,
  "jaccard" : jaccard_distance,
  "euclidean-rgb" : euclidean_rgb_distance,
  "csv" : csv_distance,
  }

def compute_distance(left, right, storage, cluster_name, measure_name, measure):
  distance = numpy.empty(len(left))
  for index in range(len(left)):
    i = left[index]
    j = right[index]
    row_i, column_i = storage[i]
    uri_i = columns[column_i][1][row_i]
    path_i = urlparse.urlparse(uri_i).path
    row_j, column_j = storage[j]
    uri_j = columns[column_j][1][row_j]
    path_j = urlparse.urlparse(uri_j).path
    distance[index] = measure(i, path_i, j, path_j)
    slycat.web.client.log.info("Computed %s distance for %s, %s -> %s: %s." % (measure_name, cluster_name, i, j, distance[index]))
  return distance

if __name__ == "__main__":
  parser = slycat.web.client.ArgumentParser()
  parser.add_argument("--cluster-columns", default=None, nargs="*", help="Cluster column names.  Default: all image columns.")
  parser.add_argument("--cluster-measure", default="jaccard", choices=["identity", "jaccard", "euclidean-rgb", "csv"], help="Hierarchical clustering measure.  Default: %(default)s")
  parser.add_argument("--cluster-linkage", default="average", choices=["single", "complete", "average", "weighted"], help="Hierarchical clustering method.  Default: %(default)s")
  parser.add_argument("--distance-matrix", default=None, help="Optional CSV distance matrix.  Only used with --cluster-measure=csv")
  parser.add_argument("--dry-run", default=False, action="store_true", help="Don't actually create a model on the server.")
  parser.add_argument("--image-columns", default=None, nargs="*", help="Image column names.")
  parser.add_argument("--input-columns", default=[], nargs="*", help="Input column names.")
  parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
  parser.add_argument("--model-description", default=None, help="New model description.  Defaults to a summary of the input parameters.")
  parser.add_argument("--model-name", default=None, help="New model name.  Default: Based on the input CSV file name.")
  parser.add_argument("--output-columns", default=[], nargs="*", help="Output column names.")
  parser.add_argument("--project-name", default="Parameter Image Plus Project", help="New project name.  Default: %(default)s")
  parser.add_argument("input", help="Input CSV file")
  arguments = parser.parse_args()

  if arguments.cluster_measure == "csv" and arguments.distance_matrix is None:
    raise Exception("You must specify a CSV distance matrix with --distance-matrix when --cluster-measure=csv")

  if arguments.cluster_measure not in measures:
    raise Exception("Unsupported distance measure: %s" % arguments.cluster_measure)

  ###########################################################################################
  # Parse the input CSV file.

  rows = [[value.strip() for value in row.split(",")] for row in open(arguments.input, "r")]
  columns = []
  for column in zip(*rows):
    try:
      columns.append((column[0], numpy.array(column[1:], dtype="float64")))
    except:
      columns.append((column[0], numpy.array(column[1:])))

  ###########################################################################################
  # Parse the input distance matrix.

  if arguments.distance_matrix is not None:
    rows = [row.split(",") for row in open(arguments.distance_matrix, "r")]
    csv_distance.matrix = numpy.array(rows[1:], dtype="float64")

  ###########################################################################################
  # The input must contain a minimum of one numeric column, so we can display a scatterplot.

  numeric_columns = [name for name, column in columns if column.dtype == "float64"]
  if len(numeric_columns) < 1:
    raise Exception("You must supply at least one numeric column in the input data.")

  ###########################################################################################
  # By default, automatically identify which columns are image columns.

  if arguments.image_columns is None:
    arguments.image_columns = []
    expression = re.compile("file://")
    search = numpy.vectorize(lambda x:bool(expression.search(x)))
    for name, column in columns:
      if column.dtype != "float64":
        if numpy.any(search(column)):
          arguments.image_columns.append(name)

  ###########################################################################################
  # By default, assume all image columns will be clustered.

  if arguments.cluster_columns is None:
    arguments.cluster_columns = arguments.image_columns

  ###########################################################################################
  # If we're using an external CSV distance matrix, there can only be one cluster column.

  if arguments.cluster_measure == "csv" and len(arguments.cluster_columns) != 1:
    raise Exception("Only one column can be clustered with --cluster-measure=csv ... currently selected columns: %s" % arguments.cluster_columns)

  ###########################################################################################
  # Setup a connection to the Slycat Web Server, and test it before we do a lot of work.
  arguments.no_verify = True
  connection = slycat.web.client.connect(arguments)
  version = connection.get_configuration_version()
  slycat.web.client.log.info("Connected to server version %s%s." % (version["version"], " (" + version["commit"] + ")" if "commit" in version else ""))

  ###########################################################################################
  # Create a mapping from unique cluster names to column rows.

  
  #import pudb; pu.db
  clusters = collections.defaultdict(list)
  for column_index, (name, column) in enumerate(columns):
    if name not in arguments.cluster_columns:
      continue
    if name not in arguments.image_columns:
      continue
    for row_index, row in enumerate(column):
      if row:
        clusters[name].append((row_index, column_index))

  ###########################################################################################
  # Compute a hierarchical clustering for each cluster column.

  cluster_linkages = {}
  cluster_exemplars = {}
  for index, (name, storage) in enumerate(sorted(clusters.items())):
    image_cache.reset()
    progress_begin = float(index) / float(len(clusters))
    progress_end = float(index + 1) / float(len(clusters))

    # Compute a distance matrix comparing every image to every other ...
    observation_count = len(storage)
    left, right = numpy.triu_indices(observation_count, k=1)
    distance = compute_distance(left, right, storage, name, arguments.cluster_measure, measures[arguments.cluster_measure])

    # Use the distance matrix to cluster observations ...
    slycat.web.client.log.info("Clustering %s" % name)
    #distance = scipy.spatial.distance.squareform(distance_matrix)
    linkage = scipy.cluster.hierarchy.linkage(distance, method=str(arguments.cluster_linkage))
    cluster_linkages[name] = linkage

    # Identify exemplar waveforms for each cluster ...
    distance_matrix = scipy.spatial.distance.squareform(distance)

    summed_distances = numpy.zeros(shape=(observation_count))
    exemplars = dict()
    cluster_membership = []

    for i in range(observation_count):
      exemplars[i] = i
      cluster_membership.append(set([i]))

    slycat.web.client.log.info("Identifying examplars for %s" % (name))
    for i in range(len(linkage)):
      cluster_id = i + observation_count
      (f_cluster1, f_cluster2, height, total_observations) = linkage[i]
      cluster1 = int(f_cluster1)
      cluster2 = int(f_cluster2)
      # Housekeeping: assemble the membership of the new cluster
      cluster_membership.append(cluster_membership[cluster1].union(cluster_membership[cluster2]))
      # We need to update the distance from each member of the new
      # cluster to all the other members of the cluster.  That means
      # that for all the members of cluster1, we need to add in the
      # distances to members of cluster2, and for all members of
      # cluster2, we need to add in the distances to members of
      # cluster1.
      for cluster1_member in cluster_membership[cluster1]:
        for cluster2_member in cluster_membership[cluster2]:
          summed_distances[cluster1_member] += distance_matrix[cluster1_member][cluster2_member]

      for cluster2_member in cluster_membership[int(cluster2)]:
        for cluster1_member in cluster_membership[cluster1]:
          summed_distances[cluster2_member] += distance_matrix[cluster2_member][cluster1_member]

      min_summed_distance = None
      max_summed_distance = None

      exemplar_id = 0
      for member in cluster_membership[cluster_id]:
        if min_summed_distance is None or summed_distances[member] < min_summed_distance:
          min_summed_distance = summed_distances[member]
          exemplar_id = member

        if max_summed_distance is None or summed_distances[member] > min_summed_distance:
          max_summed_distance = summed_distances[member]

      exemplars[cluster_id] = exemplar_id
    cluster_exemplars[name] = exemplars

  ###########################################################################################
  # Ingest the raw data into Slycat.

  if not arguments.dry_run:
    # Create a new project to contain our model.
    pid = connection.find_or_create_project(arguments.project_name)

    # Create the new, empty model.
    if arguments.model_name is None:
      arguments.model_name = os.path.basename(arguments.input)

    if arguments.model_description is None:
      arguments.model_description = ""
      arguments.model_description += "Input file: %s.\n" % os.path.abspath(arguments.input)
      arguments.model_description += "Cluster linkage: %s.\n" % arguments.cluster_linkage
      arguments.model_description += "Cluster distance: %s.\n" % arguments.cluster_measure
      if arguments.cluster_measure == "csv":
        arguments.model_description += "Distance matrix: %s.\n" % arguments.distance_matrix
      arguments.model_description += "Cluster columns: %s.\n" % ", ".join(arguments.cluster_columns)

    mid = connection.post_project_models(pid, "parameter-image-plus", arguments.model_name, arguments.marking, arguments.model_description)

    # Store clustering parameters.
    connection.put_model_parameter(mid, "cluster-linkage", arguments.cluster_linkage)
    connection.put_model_parameter(mid, "cluster-measure", arguments.cluster_measure)

    # Store an alphabetized collection of cluster names.
    connection.post_model_files(mid, aids=["clusters"], files=[json.dumps(sorted(clusters.keys()))], parser="slycat-blob-parser", parameters={"content-type":"application/json"})

    # Store each cluster.
    for key in clusters.keys():
      connection.post_model_files(mid, aids=["cluster-%s" % key], files=[json.dumps({
        "linkage" : cluster_linkages[key].tolist(),
        "exemplars" : cluster_exemplars[key],
        "input-indices" : [row_index for row_index, column_index in clusters[key]],
        })], parser="slycat-blob-parser", parameters={"content-type":"application/json"})

    # Upload our observations as "data-table".
    connection.put_model_arrayset(mid, "data-table")

    # Start our single "data-table" array.
    dimensions = [dict(name="row", end=len(rows)-1)]
    attributes = [dict(name=name, type="float64" if column.dtype == "float64" else "string") for name, column in columns]
    connection.put_model_arrayset_array(mid, "data-table", 0, dimensions, attributes)

    # Upload each column into the array.
    for index, (name, column) in enumerate(columns):
      connection.put_model_arrayset_data(mid, "data-table", "0/%s/..." % index, [column])

    # Store the remaining parameters.
    connection.put_model_parameter(mid, "input-columns", [index for index, (name, column) in enumerate(columns) if name in arguments.input_columns and column.dtype == "float64"])
    connection.put_model_parameter(mid, "output-columns", [index for index, (name, column) in enumerate(columns) if name in arguments.output_columns and column.dtype == "float64"])
    connection.put_model_parameter(mid, "image-columns", [index for index, (name, column) in enumerate(columns) if name in arguments.image_columns and column.dtype != "float64"])

    # Signal that we're done uploading data to the model.  This lets Slycat Web
    # Server know that it can start computation.
    connection.post_model_finish(mid)
    # Wait until the model is ready.
    connection.join_model(mid)

    # Supply the user with a direct link to the new model.
    slycat.web.client.log.info("Your new model is located at %s/models/%s" % (arguments.host, mid))


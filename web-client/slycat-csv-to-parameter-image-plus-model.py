#!/bin/env python

# Copyright 2013 Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000, there is a non-exclusive license for use of this work by
# or on behalf of the U.S. Government. Export of this program may require a
# license from the United States Government.

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

parser = slycat.web.client.option_parser()
parser.add_argument("--cluster-type", default="average", choices=["single", "complete", "average", "weighted"], help="Hierarchical clustering method.  Default: %(default)s")
parser.add_argument("--cluster-metric", default="euclidean", choices=["euclidean"], help="Hierarchical clustering distance metric.  Default: %(default)s")
parser.add_argument("--cluster-columns", default=None, nargs="*", help="Cluster column names.  Default: all image columns.")
parser.add_argument("--image-columns", default=None, nargs="*", help="Image column names.")
parser.add_argument("--input-columns", default=[], nargs="*", help="Input column names.")
parser.add_argument("input", help="Input CSV file")
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument("--model-description", default=None, help="New model description.  Defaults to a summary of the input parameters.")
parser.add_argument("--model-name", default=None, help="New model name.  Default: Based on the input CSV file name.")
parser.add_argument("--output-columns", default=[], nargs="*", help="Output column names.")
parser.add_argument("--project-name", default="Parameter Image Plus Project", help="New project name.  Default: %(default)s")
arguments = parser.parse_args()

if arguments.model_name is None:
  arguments.model_name = os.path.basename(arguments.input)

if arguments.model_description is None:
  arguments.model_description = ""
  arguments.model_description += "Input file: %s.\n" % os.path.abspath(arguments.input)
  arguments.model_description += "Cluster method: %s.\n" % arguments.cluster_type
  arguments.model_description += "Cluster distance metric: %s.\n" % arguments.cluster_metric

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
# Compute a hierarchical clustering for each cluster column.

clusters = {}
for index, (name, column) in enumerate(columns):
  if name not in arguments.cluster_columns:
    continue
  if name not in arguments.image_columns:
    continue
  clusters[name] = index

for name, column_index in clusters.items():
  progress_begin = float(index) / float(len(clusters))
  progress_end = float(index + 1) / float(len(clusters))

  # Compute a distance matrix comparing every series to every other ...
  observation_count = len(column)
  distance_matrix = numpy.zeros(shape=(observation_count, observation_count))
  for i in range(0, observation_count):
    slycat.web.client.log.info("Computing distance for %s, %s of %s" % (name, i+1, observation_count))
    for j in range(i + 1, observation_count):
      distance = 1
      #distance = numpy.sqrt(numpy.sum(numpy.power(waveforms[j]["values"] - waveforms[i]["values"], 2.0)))
      distance_matrix[i, j] = distance
      distance_matrix[j, i] = distance

  # Use the distance matrix to cluster observations ...
  slycat.web.client.log.info("Clustering %s" % name)
  distance = scipy.spatial.distance.squareform(distance_matrix)
  linkage = scipy.cluster.hierarchy.linkage(distance, method=str(arguments.cluster_type), metric=str(arguments.cluster_metric))

###########################################################################################
# Ingest the raw data into Slycat.

# Setup a connection to the Slycat Web Server.
connection = slycat.web.client.connect(arguments)

# Create a new project to contain our model.
pid = connection.find_or_create_project(arguments.project_name)

# Create the new, empty model.
mid = connection.post_project_models(pid, "parameter-image-plus", arguments.model_name, arguments.marking, arguments.model_description)

# Store clustering parameters.
connection.put_model_parameter(mid, "cluster-type", arguments.cluster_type)
connection.put_model_parameter(mid, "cluster-metric", arguments.cluster_metric)

# Store an alphabetized collection of cluster names.
connection.put_model_file(mid, "clusters", json.dumps(sorted(clusters.keys())), "application/json")

# Upload our observations as "data-table".
connection.put_model_arrayset(mid, "data-table")

# Start our single "data-table" array.
dimensions = [dict(name="row", end=len(rows)-1)]
attributes = [dict(name=name, type="float64" if column.dtype == "float64" else "string") for name, column in columns]
connection.put_model_arrayset_array(mid, "data-table", 0, dimensions, attributes)

# Upload each column into the array.
for index, (name, column) in enumerate(columns):
  connection.put_model_arrayset_data(mid, "data-table", (0, index, numpy.index_exp[...], column))

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


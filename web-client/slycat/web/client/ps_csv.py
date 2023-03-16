# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

# This script read and processes a .csv file before pushing it to the Slycat server
# as a parameter space model.

import os
import re

import pandas as pd
import numpy as np

import slycat.web.client
import urllib.parse as urlparse

# parse command line arguments
def parser():

  parser = slycat.web.client.ArgumentParser(description=
    "Create Slycat Parameter Space model from .csv table.")

  # input file
  parser.add_argument("file", help="Input CSV file.")

  # input/output columns
  parser.add_argument("--input-columns", default=[], nargs="*", 
    help="Input column names, can't be media columns.")
  parser.add_argument("--output-columns", default=[], nargs="*", 
    help="Output column names, can't be media columns.")

  # media columns
  parser.add_argument("--media-columns", default=None, nargs="*", 
    help="Columns that contain media URLs.")
  parser.add_argument("--media-hostname", default=None, 
    help="Optionally override the hostname for media columns.")
  parser.add_argument("--strip", type=int, default=None, 
    help="Optionally strip N prefix directories from the stored URLs.")

  # model and project names/descriptions
  parser.add_argument("--marking", default="cui", 
      help="Marking type.  Default: %(default)s")
  parser.add_argument("--model-description", default="", 
      help="New model description.  Default: %(default)s")
  parser.add_argument("--model-name", default="PS Model", 
      help="New model name.  Default: %(default)s")
  parser.add_argument("--project-description", default="", 
      help="New project description.  Default: %(default)s")
  parser.add_argument("--project-name", default="PS Models", 
      help="New project name.  Default: %(default)s")

  return parser

# logging is just printing to the screen
def log (msg):
    print(msg)

# create PS model, show progress by default, arguments 
# include the command line connection parameters
# and project/model information
def upload_model (arguments, parser, df, progress=True):

  # setup a connection to the Slycat Web Server.
  connection = slycat.web.client.connect(arguments)

  # create a new project to contain our model.
  pid = connection.find_or_create_project(arguments.project_name, arguments.project_description)

  # create the new, empty model.
  mid = connection.post_project_models(pid, "parameter-image", 
    arguments.model_name, arguments.marking, arguments.model_description)

  # Upload our observations as "data-table".
  connection.put_model_arrayset(mid, "data-table")

  # Start our single "data-table" array.
  dimensions = [dict(name="row", end=len(df.index))]
  attributes = [dict(name=header, type="float64" 
    if df[header].dtype != "object" else "string") 
    for header in df.columns]
  connection.put_model_arrayset_array(mid, "data-table", 0, dimensions, attributes)

  # Upload each column into the array.
  for index, header in enumerate(df.columns):

    # make sure type is either float or string
    if df[header].dtype == "object":
      values = [df[header].values.astype(str)]
    else:
      values = [df[header].values.astype(float)]

    # push to server
    connection.put_model_arrayset_data(mid, "data-table", "0/%s/..." % index, values)

  # Store the remaining parameters.
  input_col_inds = [index for index, header in enumerate(df.columns) 
    if header in arguments.input_columns and df[header].dtype != "object"]
  connection.put_model_parameter(mid, "input-columns", input_col_inds)
  output_col_inds = [index for index, header in enumerate(df.columns) 
    if header in arguments.output_columns and df[header].dtype != "object"]
  connection.put_model_parameter(mid, "output-columns", output_col_inds)
  media_col_inds = [index for index, header in enumerate(df.columns) 
    if header in arguments.media_columns and df[header].dtype == "object"]
  connection.put_model_parameter(mid, "image-columns", media_col_inds)

  # Signal that we're done uploading data to the model.  This lets Slycat Web
  # Server know that it can start computation.
  connection.post_model_finish(mid)

  # Wait until the model is ready.
  connection.join_model(mid)

  return mid

# check arguments and create model
def create_model (arguments, log):

  # check that input file exists
  if not os.path.isfile(arguments.file):
    log("Input file " + arguments.file + " does not exist.")
    raise ValueError("Input file " + arguments.file + " does not exist.")

  # check that input/output columns are non-intersecting
  if set(arguments.input_columns).intersection(set(arguments.output_columns)):
    log("Input columns and output columns are intersecting.")
    raise ValueError("Input columns and output columns are intersecting.")

  # load input file as pandas dataframe
  df = pd.read_csv(arguments.file)

  # check that inputs are in headers
  if arguments.input_columns is not None:
    for input_col in arguments.input_columns:
      if input_col not in df.columns:
        log('Input column "' + input_col + '" not found in input file.')
        raise ValueError('Input column "' + input_col + '" not found in input file.')

  # check that outputs are in headers
  if arguments.output_columns is not None:
    for output_col in arguments.output_columns:
      if output_col not in df.columns:
        log('Output column "' + output_col + '" not found in input file.')
        raise ValueError('Output column "' + output_col + '" not found in input file.')
      
  # check that meda-columns are in headers
  if arguments.media_columns is not None:
    for media_col in arguments.media_columns:
      if media_col not in df.columns:
        log('Media column "' + media_col + '" not found in input file.')
        raise ValueError('Media column "' + media_col + '" not found in input file.')

  # check that there is at least one numeric columns (to display scatter plot)
  if not df.select_dtypes(include='float64').columns.to_list():
    log("You must supply at least one numeric column in the input data.")
    raise ValueError("You must supply at least one numeric column in the input data.")

  # identify media columns automatically if not provided
  if arguments.media_columns is None:
    arguments.media_columns = []

    # search for "file://"
    expression = re.compile("file://")
    search = np.vectorize(lambda x:bool(expression.search(x)))

    # go through each column
    for header in df.columns:

      # strings are stored in pandas object type
      if df[header].dtype == "object":
        if np.any(search(df[header].values)):
          arguments.media_columns.append(header)

  # replace media URL hostnames, if requested
  if arguments.media_hostname is not None:
    
    # go through each column
    for header in df.columns:

      # if media column is given and a string
      if header in arguments.media_columns and df[header].dtype == "object":
        modified = []

        # replace file://cluster with file://hostname
        for uri in df[header].values:
          uri = urlparse.urlparse(uri)
          path = uri.path
          uri = "file://%s%s" % (arguments.media_hostname, path)
          modified.append(uri)
        df[header] = modified

  # strip prefix directories, if requested
  if arguments.strip is not None:

    # go through each column:
    for header in df.columns:

      # for media columns, strip prefix directories
      if header in arguments.media_columns and df[header].dtype == "object":
        modified = []

        # strip prefixes
        for uri in df[header].values:
          uri = urlparse.urlparse(uri)
          hostname = uri.netloc
          path = os.path.join(*([os.path.abspath(os.path.dirname(arguments.file))] + 
            uri.path.split(os.sep)[arguments.strip + 1:]))
          uri = "file://%s%s" % (hostname, path)
          modified.append(uri)
        df[header] = modified

  # echo inputs to user
  log('Input file: ' + arguments.file)
  if arguments.input_columns is not None:
    log('Input columns: ' + str(arguments.input_columns))
  if arguments.output_columns is not None:
    log('Output columns: ' + str(arguments.output_columns))
  if arguments.media_columns != []:
    log('Media columns: ' + str(arguments.media_columns))
  if arguments.media_hostname is not None:
    log('Media hostname: ' + str(arguments.media_hostname))
  if arguments.strip is not None:
    log('Stripped ' + str(arguments.strip) + ' prefixes from media columns.')

  # upload model
  mid = upload_model (arguments, parser, df, progress=True)

  # supply direct link to model
  host = arguments.host
  if arguments.port:
      host = host + ":" + arguments.port
  log("Your new model is located at %s/models/%s" % (host, mid))
  log('***** PS Model Successfully Created *****')

# main entry point
def main():

    # set up argument parser
    ps_parser = parser()  

    # get user arguments
    arguments = ps_parser.parse_args()

    # check arguments and create model
    create_model(arguments, log)

# command line version
if __name__ == "__main__":

    main()
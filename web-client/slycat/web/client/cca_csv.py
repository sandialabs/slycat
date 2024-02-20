#!/bin/env python
# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

"""Uploads a CSV file to Slycat Web Server to compute a CCA model."""

import slycat.web.client
import os

# slycat csv parser
import slycat.pandas_util

# parse arguments
def parser():

  parser = slycat.web.client.ArgumentParser(description="Create CCA model from .csv file.")

  # CSV file is mandatory
  parser.add_argument("file", default="-", help="Input CSV file.  Use - for stdin.  " +
                      "Default: %(default)s")
  
  # project/model name/description
  parser.add_argument("--project-description", default="", 
                      help="New project description.  Default: %(default)s")
  parser.add_argument("--project-name", default="CCA Models", 
                      help="New project name.  Default: %(default)s")
  parser.add_argument("--model-name", default="CCA from CSV", help="New model name.  " + 
                      "Default: %(default)s")
  parser.add_argument("--model-description", default="", help="New model description.  " +
                      "Default: %(default)s")
  
  # input/output columns for CCA
  parser.add_argument("--input-columns", default=[], nargs="+", help="Input column(s).")
  parser.add_argument("--output-columns", default=[], nargs="+", help="Output column(s).")

  parser.add_argument("--marking", default="mna", help="Marking type.  Default: %(default)s")

  # CCA algorithm scaling
  parser.add_argument("--scale-inputs", default=False, action="store_true", 
                      help="Enable input scaling.")

  parser.add_argument("--no-join", default=False, action="store_true", 
                      help="Don't wait for the model to finish.")
  
  return parser

# logging is just printing to the screen
def log (msg):
    print(msg)

# upload the model to the Slycat web server
def upload_model(arguments, attributes, dimensions, data, inputs, outputs, log):

  # get column names
  column_names = [attribute["name"] for attribute in attributes]
  
  # setup a connection to the Slycat Web Server.
  connection = slycat.web.client.connect(arguments)

  # Create a new project to contain our model.
  pid = connection.find_or_create_project(arguments.project_name, arguments.project_description)

  # Create the new, empty model.
  mid = connection.post_project_models(pid, "cca", arguments.model_name, arguments.marking, 
                                       arguments.model_description)

  # Upload our observations as "data-table".
  connection.put_model_arrayset(mid, "data-table")

  # Start our single "data-table" array.
  connection.put_model_arrayset_array(mid, "data-table", 0, dimensions, attributes)

  # Upload data into the array.
  for index, column in enumerate(data):
    log("Uploading column {} of {} ({})".format(index, len(data), column_names[index]))
    connection.put_model_arrayset_data(mid, "data-table", "0/%s/..." % index, [column])

  # Store the remaining parameters.
  connection.put_model_parameter(mid, "input-columns", inputs)
  connection.put_model_parameter(mid, "output-columns", outputs)
  connection.put_model_parameter(mid, "scale-inputs", arguments.scale_inputs)

  # Signal that we're done uploading data to the model.  This lets Slycat Web
  # Server know that it can start computation.
  connection.post_model_finish(mid)

  # Wait until the model is ready.
  connection.join_model(mid)

  return mid

# create CCA model
def create_model(arguments, log):

  # check that input file exists
  if not os.path.isfile(arguments.file):
    log("Input file " + arguments.file + " does not exist.")
    raise ValueError("Input file " + arguments.file + " does not exist.")

  # check that input/output columns are non-intersecting
  if set(arguments.input_columns).intersection(set(arguments.output_columns)):
    log("Input columns and output columns are intersecting.")
    raise ValueError("Input columns and output columns are intersecting.")

  # parse file using standard slycat csv parser
  attributes, dimensions, data, csv_read_error = \
    slycat.pandas_util.parse_file(arguments.file, file_name=True)

  # check for warnings/errors
  for i in range(len(csv_read_error)):
    if csv_read_error[i]["type"] == "warning":
      log("Warning: " + csv_read_error[i]["message"])
    else:
      log("Error: " + csv_read_error[i]["message"])
      raise ValueError(csv_read_error[i]["message"])

  # get column names/types
  column_names = [attribute["name"] for attribute in attributes]
  column_types = [attribute["type"] for attribute in attributes]
  columns = data

  # check that non-empty inputs are in headers
  if len(arguments.input_columns) == 0:
    log('You must specify at least one input column.')
    raise ValueError('You must specify at least one input column.  Available columns: %s' 
                     % str(column_names))
  else:
    for input_col in arguments.input_columns:
      if input_col not in column_names:
        log('Input column "' + input_col + '" not found in input file.')
        raise ValueError('Input column "' + input_col + '" not found in input file.')

  # check that non-empty outputs are in headers
  if len(arguments.output_columns) == 0:
    log('You must specifcy at least one output column.')
    raise ValueError('You must specify at least one output column.  Available columns: %s'
                     % str(column_names))
  else:
    for output_col in arguments.output_columns:
      if output_col not in column_names:
        log('Output column "' + output_col + '" not found in input file.')
        raise ValueError('Output column "' + output_col + '" not found in input file.')

  # get column indices for input/output arguments
  inputs = [column_names.index(input) for input in arguments.input_columns]
  outputs = [column_names.index(output) for output in arguments.output_columns]

  # check that inputs/outputs are numeric
  for input in inputs:
    if column_types[input] != "float64":
      raise Exception("Cannot analyze non-numeric input: %s" % column_names[input])
  for output in outputs:
    if column_types[output] != "float64":
      raise Exception("Cannot analyze non-numeric output: %s" % column_names[output])

  # upload model
  mid = upload_model (arguments, attributes, dimensions, data, inputs, outputs, log)

  # supply direct link to model
  host = arguments.host
  if arguments.port:
      host = host + ":" + arguments.port
  url = host + "/models/" + mid
  log("Your new model is located at %s" % url)
  log('***** CCA Model Successfully Created *****')

  return url

# main entry point
def main():

    # set up argument parser
    ps_parser = parser()  

    # get user arguments
    arguments = ps_parser.parse_args()

    # check arguments and create model
    url = create_model(arguments, log)

# command line version
if __name__ == "__main__":

    main()

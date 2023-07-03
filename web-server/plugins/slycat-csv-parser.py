# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import csv
import time
import numpy

import slycat.web.server
import cherrypy

import pandas as pd
from io import StringIO


# common csv parsing code used by both slycat-web-server and slycat-web-client
# does not call slycat.web.server directly, instead returns any error messages
# error messages are returned as a list of {'type': 'warning', 'message': 'message'}
def parse_file_offline(file):
    """
    parses out a csv file into numpy array by column (data), the dimension meta data(dimensions),
    and sets attributes (attributes)
    :param file: csv file to be parsed
    :returns: attributes, dimensions, data, error_messages
    """

    # initial attributes, dimensions, and data
    # empty, but existing to avoid crashing slycat
    dimensions = [dict(name="row", type="int64", begin=0, end=0)]
    attributes = [dict(name="None", type="float64")]
    data = [numpy.zeros(0)]

    # keep track of errors
    csv_read_error = []

    # load input file as pandas dataframe
    try:
        df = pd.read_csv(StringIO(file))

    # return empty values if couldn't read file
    except Exception as e:
        csv_read_error.append({'type': 'error', 'message': 'Could not read .csv file.\n\n' +
                               'Pandas exception: "' + str(e) + '".'})
        return attributes, dimensions, data, csv_read_error 

    # check for at least two rows
    if df.shape[0] < 2:
        csv_read_error.append({'type': 'error', 'message': 'File must contains at least two rows.'})
        return attributes, dimensions, data, csv_read_error 
    
    # check for at least one column
    if df.shape[1] < 1:
        csv_read_error.append({'type': 'error', 'message': 'File must have at least one column.'})
        return attributes, dimensions, data, csv_read_error

    # parse attributes, dimensions of data frame
    dimensions = [dict(name="row", type="int64", begin=0, end=len(df.index))]
    attributes = [dict(name=header, type="float64" 
        if df[header].dtype != "object" else "string") 
        for header in df.columns]
    
    # parse data
    data = []
    for header in df.columns.values:
        if df[header].dtype == "object":
            data.append(df[header].values.astype('unicode'))
        else:
            data.append(df[header].values)
            
    # check for empty headers (pandas replaced them with 'Unnamed: <Column #>')
    empty_headers = []
    headers = df.columns.values
    for i in range(len(headers)):
        if headers[i].startswith('Unnamed:'):
            empty_headers.append(int(headers[i][8:])+1)

            # rename header so index starts at 1
            df = df.rename(columns = {headers[i]: "Unnamed: " + str(empty_headers[-1])})
    headers = df.columns.values

    # slycat warning for empty headers
    if len(empty_headers) != 0:
        csv_read_error.append({'type': 'warning', 'message': 'Found empty headers in columns: ' + \
                               str(empty_headers) + '.  Using "Unnamed: <Column #>" for empty headers.'})
    
    # look for duplicate headers (pandas adds .# to column)
    duplicated_headers = []
    for i in range(len(headers)):
        for j in range(i+1,len(headers)):
            if headers[j].startswith(headers[i]):
                header_j_suffix = headers[j].split('.')[-1]
                if header_j_suffix.isnumeric():
                    duplicated_headers.append(i+1)
                    duplicated_headers.append(j+1)
    duplicated_headers = pd.unique(duplicated_headers)

    # slycat warning for duplicated headers
    if len(duplicated_headers) != 0:
        csv_read_error.append({'type': 'warning', 'message': 'Found duplicated headers in columns: ' + \
                              str(duplicated_headers) + '.  Using "<Header>.#" for duplicate headers.'})

    # headers may have been changed, need to recompute
    attributes = [dict(name=header, type="float64" 
        if df[header].dtype != "object" else "string") 
        for header in df.columns]
    
    # return data and errors
    return attributes, dimensions, data, csv_read_error


def parse_file(file, model, database):
    """
    parses out a csv file into numpy array by column (data), the dimension meta data(dimensions),
    and sets attributes (attributes)
    :param file: csv file to be parsed
    :returns: attributes, dimensions, data
    """

    # parse file
    attributes, dimensions, data, csv_read_errors = parse_file_offline(file)

    # pass errors on to model
    if len(csv_read_errors) != 0:
        slycat.web.server.put_model_parameter(database, model, "error-messages", csv_read_errors)
    else:
        slycat.web.server.put_model_parameter(database, model, "error-messages", [])

    # return data
    return attributes, dimensions, data


def parse(database, model, input, files, aids, **kwargs):
    """
    parses a file as a csv and then uploads the parsed data to associated storage for a
    model
    :param database: slycat.web.server.database.couchdb.connect()
    :param model: database.get("model", self._mid)
    :param input: boolean
    :param files: files to be parsed
    :param aids: artifact ID
    :param kwargs:
    """

    # keep track of processing time
    start = time.time()

    if len(files) != len(aids):
        cherrypy.log.error("slycat-csv-parser.py parse", "Number of files and artifact IDs must match.")
        raise Exception("Number of files and artifact ids must match.")

    # parse files
    parsed = [parse_file(file, model, database) for file in files]

    # upload data
    array_index = int(kwargs.get("array", "0"))
    for (attributes, dimensions, data), aid in zip(parsed, aids):
        slycat.web.server.put_model_arrayset(database, model, aid, input)
        slycat.web.server.put_model_array(database, model, aid, 0, attributes, dimensions)
        slycat.web.server.put_model_arrayset_data(database, model, aid, 
                                                    "%s/.../..." % array_index, data)
    
    # done processing
    end = time.time()

    model = database.get("model", model['_id'])
    model["db_creation_time"] = (end - start)
    database.save(model)


def register_slycat_plugin(context):
    context.register_parser("slycat-csv-parser", "Comma separated values (CSV)", ["table"], parse)

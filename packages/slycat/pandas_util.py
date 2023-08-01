# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import pandas as pd
import numpy 
from io import StringIO
import cherrypy

# common csv parsing code used by both slycat-web-server and slycat-web-client
# does not call slycat.web.server directly, instead returns any error messages
# error messages are returned as a list of {'type': 'warning', 'message': 'message'}
# use file_name = True to pass a file name instead of a string with file contents
def parse_file(file, file_name=False):
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
        if file_name:
            df = pd.read_csv(file)
        else:
            df = pd.read_csv(StringIO(file))

    # return empty values if couldn't read file
    except Exception as e:
        csv_read_error.append({'type': 'error', 'message': 'Could not read .csv file.\n' +
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
            data.append(df[header].values.astype(float))
            
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
                               str(empty_headers) + '.\nUsing "Unnamed: <Column #>" for empty headers.'})
    
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
                              str(duplicated_headers) + '.\nUsing "<Header>.#" for duplicate headers.'})

    # slycat warning that NaNs were discovered
    if df.isnull().values.any():
        csv_read_error.append({'type': 'warning', 'message': 'Found NaNs in .csv table.  Pandas converts a variety of null ' + 
                                "values to NaNs, including blanks, null, None, n/a, and others (see Panda's read_csv "
                                'for details).  NaNs may be ignored by Slycat algorithms/visualization tools.'})
        
    # headers may have been changed, need to recompute
    attributes = [dict(name=header, type="float64" 
        if df[header].dtype != "object" else "string") 
        for header in df.columns]
    
    # return data and errors
    return attributes, dimensions, data, csv_read_error

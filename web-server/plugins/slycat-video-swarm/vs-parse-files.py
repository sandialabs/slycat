# Copyright 2013 National Technology & Engineering Solutions of Sandia, LLC (NTESS). 
# Under the terms of Contract DE-NA0003525 with NTESS, the U.S. Government 
# retains certain rights in this software.
#
# This code does the actual parsing of csv files and matrix files
# for VideoSwarm.
#
# S. Martin
# 5/20/2018

import cherrypy
import csv
import numpy

# this version can handle either a matrix of floats, or a vector of strings
def parse_mat_file(file):

    """
    parses out a csv file into numpy array by column (data), the dimension meta data(dimensions),
    and sets attributes (attributes)
    :param file: csv file to be parsed
    :returns: attributes, dimensions, data
    """

    cherrypy.log.error("Started VS generic matrix parser.")

    # parse file using comma delimiter
    rows = [row for row in csv.reader(file.splitlines(), delimiter=",", doublequote=True,
            escapechar=None, quotechar='"', quoting=csv.QUOTE_MINIMAL, skipinitialspace=True)]

    # fill a numpy matrix with matrix from file (assumes floats, uses strings otherwise)
    data = numpy.zeros((len(rows[0:]), len(rows[0])))
    string_data = []
    is_float = True
    for j in range(len(rows[0:])):
        try:
            data[j,:] = numpy.array([float(name) for name in rows[j]])
        except:
            is_float = False
            string_data.append([name for name in rows[j]])

    # set dimensions according to what was in the file
    dimensions = [dict(name="row", end=int(data.shape[0])),
        dict(name="column", end=int(data.shape[1]))]

    # attributes are the same for matrices and vectors
    if is_float:
        attributes = [dict(name="value", type="float64")]
    else:
        attributes = [dict(name="value", type="string")]
        data = string_data

    # for debugging:
    # cherrypy.log.error (str(data))
    # cherrypy.log.error (str(dimensions))
    # cherrypy.log.error (str(attributes))

    return attributes, dimensions, data
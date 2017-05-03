# This script imports PTS log files for DAC.  It is modified from
# the slycat-csv-parser.  This parser parses the .ini files from
# the META directory.
#
# S. Martin
# 4/4/2017

import csv
import numpy
import slycat.web.server
import slycat.email
import time
import cherrypy


# this is the parser for the very specific format of the .ini files in the META directory
def parse_ini_file(file):

    """
    parses out a csv file into numpy array by column (data), the dimension meta data(dimensions),
    and sets attributes (attributes)
    :param file: csv file to be parsed
    :returns: attributes, dimensions, data
    """

    cherrypy.log.error("Started PTS META file parser.")

    # parse file one row at a time
    rows = file.splitlines()
    data = []
    waveform_conversion = False
    waveform_data = ""
    for i in range(0,len(rows)):

        if (waveform_conversion):

            # collect all rows as a string after
            # we find "[waveform_conversion]"
            waveform_data = waveform_data + ", " + rows[i]

        else:
            # check line for one equal sign
            row_data = rows[i].split("=")
            if (len(row_data) == 2):
                data.append(row_data)

        # turn off parsing at end of file
        if (rows[i] == "[waveform_conversion]"):
            waveform_conversion = True

    data.append(["[waveform_conversion]", waveform_data])

    cherrypy.log.error(data)

    cherrypy.log.error(str(len(rows)))
    cherrypy.log.error(str(rows))


    #rows = [row for row in csv.reader(file.splitlines(), delimiter=",", doublequote=True,
    #        escapechar=None, quotechar='"', quoting=csv.QUOTE_MINIMAL, skipinitialspace=True)]

    # fill a numpy matrix with matrix from file (assumes floats, fails otherwise)
    data = numpy.zeros((len(rows[0:]), len(rows[0])))
    #for j in range(len(rows[0:])):
    #    try:
    #        data[j,:] = numpy.array([float(name) for name in rows[j]])
    #    except:
    #        raise Exception ("Matrix entries must be floats.")


    # for a vector we strip off the out python array []
    #if int(data.shape[0]) == 1:

    #    data = data[0]
    #    dimensions = [dict(name="row", end=len(data))]

    #else:

    # for a matrix we need the number of columns too
    dimensions = [dict(name="row", end=int(data.shape[0])),
        dict(name="column", end=int(data.shape[1]))]

    # attributes are the same for matrices and vectors
    attributes = [dict(name="value", type="string")]

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

    start = time.time()

    # this version of parse is designed to pass in the column of the aid as the second
    # part of the aids array, so aids: ["variable", "0"] is the previous behavior.
    # if nothing extra is passed in, the array column defaults to 0.

    # also passed in via the aids array is a third variable, which indicates
    # whether or not the file is a table or a matrix, "table" for table and
    # "matrix" for matrix.  for example, aids: ["variable", "0", "table"] is
    # the default, while aids: ["variable", "1", "mat"] indicates that the
    # file is the 2nd matrix in the aid and should be parsed with no header row.

    # this version only parses the .ini files, not tables or matrices

    # print out file and return
    cherrypy.log.error (str(files[0]))

    # set defaults (array 0)
    array_col = 0

    # change defaults for two parameters
    if len(aids) == 2:
        array_col = int(aids[1])

    # revert aids to what is expected in original code
    aids = [aids[0]]

    if len(files) != len(aids):
        slycat.email.send_error("slycat-csv-parser.py parse", "Number of files and artifact IDs must match.")
        raise Exception("Number of files and artifact ids must match.")

    # table parser (original csv parser)
    parsed = [parse_ini_file(file) for file in files]
    return

    for (attributes, dimensions, data), aid in zip(parsed, aids):
        slycat.web.server.put_model_arrayset(database, model, aid, input)
        slycat.web.server.put_model_array(database, model, aid, array_col, attributes, dimensions)
        slycat.web.server.put_model_arrayset_data(database, model, aid, "%s/.../..." % array_col, data)

    end = time.time()
    model["db_creation_time"] = (end - start)
    database.save(model)


def register_slycat_plugin(context):
    context.register_parser("dac-meta-files-parser", "PTS META files", ["dac-meta-files"], parse)


# This script imports the .dac index file.  It is modified from
# the slycat-csv-parser.
#
# S. Martin
# 4/4/2017

import csv
import numpy
import slycat.web.server
import slycat.email
import time
import cherrypy

# note this version assumes the first row is a header row, and saves the header values
# as attributes
def parse_file(file):

    """
    parses out a csv file into numpy array by column (data), the dimension meta data(dimensions),
    and sets attributes (attributes)
    :param file: csv file to be parsed
    :returns: attributes, dimensions, data
    """

    def isfloat(value):
        try:
            float(value)
            return True
        except ValueError:
            return False

    cherrypy.log.error("dac gen table parsing:::::::")
    rows = [row for row in csv.reader(file.splitlines(), delimiter=",", doublequote=True, escapechar=None, quotechar='"', quoting=csv.QUOTE_MINIMAL, skipinitialspace=True)]
    if len(rows) < 2:
        slycat.email.send_error("slycat-csv-parser.py parse_file", "File must contain at least two rows.")
        raise Exception("File must contain at least two rows.")

    attributes = []
    dimensions = [{"name":"row", "type":"int64", "begin":0, "end":len(rows[1:])}]
    data = []

    # go through the csv by column
    for column in zip(*rows):
        column_has_floats = False

        # start from 1 to avoid the column name
        for value in column[1:]:
            if isfloat(value):
                column_has_floats = True
            try:# note NaN's are floats
                output_list = map(lambda x: 'NaN' if x=='' else x, column[1:])
                data.append(numpy.array(output_list).astype("float64"))
                attributes.append({"name":column[0], "type":"float64"})

            # could not convert something to a float defaulting to string
            except Exception as e:
                column_has_floats = False
                cherrypy.log.error("found floats but failed to convert, switching to string types Trace: %s" % e)
            break

        if not column_has_floats:
            data.append(numpy.array(column[1:]))
            attributes.append({"name":column[0], "type":"string"})

    if len(attributes) < 1:
        slycat.email.send_error("slycat-csv-parser.py parse_file", "File must contain at least one column.")
        raise Exception("File must contain at least one column.")

    return attributes, dimensions, data

# note this version assumes there is no header row and the file is a matrix
# note that we are assuming floats in our matrices
def parse_mat_file(file):

    """
    parses out a csv file into numpy array by column (data), the dimension meta data(dimensions),
    and sets attributes (attributes)
    :param file: csv file to be parsed
    :returns: attributes, dimensions, data
    """

    def isfloat(value):
        try:
            float(value)
            return True
        except ValueError:
            return False

    cherrypy.log.error("dac gen matrix parsing:::::::")
    rows = [row for row in csv.reader(file.splitlines(), delimiter=",", doublequote=True,
            escapechar=None, quotechar='"', quoting=csv.QUOTE_MINIMAL, skipinitialspace=True)]

    # if len(rows) < 2:
    #    slycat.email.send_error("slycat-csv-parser.py parse_file", "File must contain at least two rows.")
    #    raise Exception("File must contain at least two rows.")

    attributes = [{"name":"value", "type":"float64"}]
    dimensions = [{"name":"row", "begin":0, "end":len(rows[1:])}]
    data = []

    # go through the csv by column
    for column in zip(*rows):
        column_has_floats = False

        # start from 1 to avoid the column name
        for value in column[0:]:
            if isfloat(value):
                column_has_floats = True
            try:# note NaN's are floats
                output_list = map(lambda x: 'NaN' if x=='' else x, column[1:])
                data.append(numpy.array(output_list).astype("float64"))
                attributes.append({"name":column[0], "type":"float64"})

            # could not convert something to a float defaulting to string
            except Exception as e:
                column_has_floats = False
                cherrypy.log.error("found floats but failed to convert, switching to string types Trace: %s" % e)
                raise Exception("Matrix entries must be floats.")
            break

        # if not column_has_floats:
        #    data.append(numpy.array(column[1:]))
        #    attributes.append({"name":column[0], "type":"string"})

    if len(attributes) < 1:
        slycat.email.send_error("slycat-csv-parser.py parse_file", "File must contain at least one column.")
        raise Exception("File must contain at least one column.")

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

    # set defaults (table, array 0)
    table = True
    array_col = 0

    # change defaults for three parameters
    if len(aids) == 3:
        table = (aids[2] == "table")
        array_col = int(aids[1])

    # change defaults for two parameters
    if len(aids) == 2:
        array_col = int(aids[1])

    # revert aids to what is expected in original code
    aids = [aids[0]]

    if len(files) != len(aids):
        slycat.email.send_error("slycat-csv-parser.py parse", "Number of files and artifact IDs must match.")
        raise Exception("Number of files and artifact ids must match.")

    # parse file as either table or matrix
    if table:
        parsed = [parse_file(file) for file in files]
    else:
        parsed = [parse_mat_file(file) for file in files]

    # array_index = int(kwargs.get("array", "0"))
    cherrypy.log.error(str(array_col))
    for (attributes, dimensions, data), aid in zip(parsed, aids):
        slycat.web.server.put_model_arrayset(database, model, aid, input)
        slycat.web.server.put_model_array(database, model, aid, array_col, attributes, dimensions)
        slycat.web.server.put_model_arrayset_data(database, model, aid, "%s/.../..." % array_col, data)

    end = time.time()
    model["db_creation_time"] = (end - start)
    database.save(model)


# register all generic file parsers (really just the same csv parser), so that they
# appear with different labels in the file picker.
def register_slycat_plugin(context):
    context.register_parser("dac-index-file-parser", "DAC .dac meta-data file", ["dac-index-file"], parse)
    context.register_parser("dac-var-files-parser", "DAC .var files (and variables.meta file)", ["dac-var-files"], parse)
    context.register_parser("dac-time-files-parser", "DAC .time files", ["dac-time-files"], parse)
    context.register_parser("dac-dist-files-parser", "DAC .dist files", ["dac-dist-files"], parse)
    context.register_parser("dac-pref-files-parser", "DAC .pref files", ["dac-pref-files"], parse)



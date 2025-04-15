# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import time
import slycat.web.server
import slycat.pandas_util
import cherrypy
import csv
import numpy

def parse_file(file, model, database):
    # TODO - This code will be used for creating a new pandas CSV parser in the future
    # parse file
    # attributes, dimensions, data, csv_read_errors = slycat.pandas_util.parse_file(file)

    # pass errors on to model
    # if len(csv_read_errors) != 0:
    #     slycat.web.server.put_model_parameter(database, model, "error-messages", csv_read_errors)
    #     # return None, None, None, csv_read_errors
    # else:
    #     slycat.web.server.put_model_parameter(database, model, "error-messages", [])
    #     # return None, None, None, []

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

    invalid_csv = False  # CSV is completely missing a column header (it isn't just a blank string)
    content = file.splitlines()
    csv_reader = csv.reader(content)
    headings = next(csv_reader)
    first_line = next(csv_reader)

    if len(headings) != len(first_line):
        invalid_csv = True

    rows = [row for row in
            csv.reader(file.splitlines(), delimiter=",", doublequote=True, escapechar=None, quotechar='"',
                       quoting=csv.QUOTE_MINIMAL, skipinitialspace=True)]
    if len(rows) < 2:
        cherrypy.log.error("slycat-csv-parser.py parse_file", "File must contain at least two rows.")
        raise Exception("File must contain at least two rows.")

    attributes = []
    dimensions = [{"name": "row", "type": "int64", "begin": 0, "end": len(rows[1:])}]
    data = []
    default_name_index = 0
    duplicate_name_index = 0
    duplicate_names = []
    duplicate_indeces = []
    blank_header_columns = []
    column_headers = []
    error_message = []
    duplicate_headers = False
    blank_headers = False  # Header with a blank string, i.e. ",,"

    # go through the csv by column
    for j, column in enumerate(zip(*rows)):
        column_has_floats = False

        # start from 1 to avoid the column name
        # for value in column[1:]:
        if isfloat(column[1]): # if first val in col is float, this is a float col
            column_has_floats = True
            try:  # note NaN's are floats
                output_list = ['NaN' if x == '' else x for x in column[1:]]
                data.append(numpy.array(output_list).astype("float64"))
                attributes.append({"name": column[0], "type": "float64"})
                column_headers.append(column[0])

            # could not convert something to a float defaulting to string
            except Exception as e:
                column_has_floats = False
                # cherrypy.log.error("found floats but failed to convert, switching to string types Trace: %s" % e)
            # break

        if not column_has_floats:
            [str(item) for item in column[1:]]
            data.append(numpy.array(column[1:]))
            attributes.append({"name": column[0], "type": "string"})
            column_headers.append(column[0])

        # Check for mixed data types in first 20 rows of column.
        # Inform the user that we can't process their data if they mixed type rows.
        data_types = []
        for i in range(0, 20):
            if isfloat(data[j][i]):
                data_types.append("<class 'float'>")
            else:
                data_types.append(str(type(column[i])))
        data_types = set(data_types)
        
        cherrypy.log.error(str(data_types))

        if len(data_types) > 1:
            cherrypy.log.error("slycat-csv-parser.py parse_file", "Mixed data type columns found.")
            error_message.append(
                "You cannot have mixed data type columns. Please CLOSE this wizard, fix this issue, then start a new wizard. \n")
            break
            # raise Exception("You cannot have mixed data type columns.")

    if len(attributes) < 1:
        cherrypy.log.error("slycat-csv-parser.py parse_file", "File must contain at least one column.")
        raise Exception("File must contain at least one column.")

    # Adding deafult headers and making duplicates unique
    for index, attribute in enumerate(attributes):
        if attribute["name"] is "":
            message = "Column " + str(index + 1)
            blank_header_columns.append(message)
            blank_headers = True
        # Don't want to include blank headers as duplicates.
        if column_headers.count(attribute["name"]) > 1 and attribute["name"] is not '':
            duplicate_names.append(attribute["name"])
            duplicate_indeces.append(str(index + 1))
            duplicate_headers = True

    if invalid_csv is True:
        error_message.append(
            "Your CSV is invalid because it's missing at least one column header. Please CLOSE this wizard, fix this issue, then start a new wizard. \n")
    else:
        if blank_headers is True:
            base_message = "Your CSV file contained blank headers in: \n"
            for message in blank_header_columns:
                base_message += message + '\n'
            error_message.append(base_message)
        if duplicate_headers is True:
            error_message.append("Your CSV file contained these identical headers:")
            for name, index in zip(duplicate_names, duplicate_indeces):
                error_message.append(
                    "%s" % str("'" + name + "' " + "in column " + index))

    if error_message is not "":
        slycat.web.server.put_model_parameter(database, model, "error-messages", error_message)
    else:
        slycat.web.server.put_model_parameter(database, model, "error-messages", "")

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
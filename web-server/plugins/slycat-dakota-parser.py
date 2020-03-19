# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import numpy
import slycat.web.server

import io


def parse_file(file):
    """
    parses out a .dat file into numpy array by column (data), the dimension meta data(dimensions),
    and sets attributes (attributes)
    :param file: dakota file to be parsed
    :returns: attributes, dimensions, data
    """
    import cherrypy
    def isfloat(value):
        try:
            float(value)
            return True
        except ValueError:
            return False

    #cherrypy.log.error("parsing:::::::")
    rows = [row.split() for row in io.StringIO(file)]
    if len(rows) < 2:
        cherrypy.log.error("slycat-dakota-parser.py parse_file", "File must contain at least two rows.")
        raise Exception("File must contain at least two rows.")

    attributes = []
    dimensions = [{"name": "row", "type": "int64", "begin": 0, "end": len(rows[1:])}]
    data = []
    # go through the csv by column
    for column in zip(*rows):
        column_has_floats = False

        # start from 1 to avoid the column name
        for value in column[1:]:
            if isfloat(value):
                column_has_floats = True
                try:  # note NaN's are floats
                    output_list = ['NaN' if x == '' else x for x in column[1:]]
                    data.append(numpy.array(output_list).astype("float64"))
                    attributes.append({"name": column[0], "type": "float64"})

                # could not convert something to a float defaulting to string
                except Exception as e:
                    column_has_floats = False
                    cherrypy.log.error("found floats but failed to convert, switching to string types Trace: %s" % e)
                break
        if not column_has_floats:
            data.append(numpy.array(column[1:]))
            attributes.append({"name": column[0], "type": "string"})

    if len(attributes) < 1:
        cherrypy.log.error("slycat-dakota-parser.py parse_file", "File must contain at least one column.")
        raise Exception("File must contain at least one column.")

    return attributes, dimensions, data


def parse(database, model, input, files, aids, **kwargs):
    if len(files) != len(aids):
        cherrypy.log.error("slycat-dakota-parser.py parse", "Number of files and artifact IDs must match.")
        raise Exception("Number of files and artifact ids must match.")

    parsed = [parse_file(file) for file in files]

    array_index = int(kwargs.get("array", "0"))
    for (attributes, dimensions, data), aid in zip(parsed, aids):
        slycat.web.server.put_model_arrayset(database, model, aid, input)
        slycat.web.server.put_model_array(database, model, aid, 0, attributes, dimensions)
        slycat.web.server.put_model_arrayset_data(database, model, aid, "%s/.../..." % array_index, data)

    # Parameter Space model, and possibly others, need an error-messages parameter in order for creation wizard to work
    slycat.web.server.put_model_parameter(database, model, "error-messages", "")


def register_slycat_plugin(context):
    context.register_parser("slycat-dakota-parser", "Dakota tabular", ["table"], parse)

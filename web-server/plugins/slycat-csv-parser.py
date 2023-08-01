# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import time
import slycat.web.server
import slycat.pandas_util
import cherrypy

def parse_file(file, model, database):
    """
    parses out a csv file into numpy array by column (data), the dimension meta data(dimensions),
    and sets attributes (attributes)
    :param file: csv file to be parsed
    :returns: attributes, dimensions, data
    """

    # parse file
    attributes, dimensions, data, csv_read_errors = slycat.pandas_util.parse_file(file)

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

# Copyright 2013 National Technology & Engineering Solutions of Sandia, LLC (NTESS). 
# Under the terms of Contract DE-NA0003525 with NTESS, the U.S. Government 
# retains certain rights in this software.
#
# This parser loads the four movie-plex files and puts them into
# the slycat server database.
#
# S. Martin
# 4/7/2017

import cherrypy
import slycat.web.server
import time

# to separate actual parsing code from code called by slycat
import imp
import os

# this is the parse code actually called by slycat
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

    # this version of parse is designed to pass in the type of the artifcat as the
    # second entry in the aids array, so aids: ["variable", "table"] is the standard
    #  behavior (table with header row), and ["variable", "matrix"] is the new behavior
    # (matrix or vector with no header row).

    # if nothing extra is passed in, the behavior defaults to "table".

    # set default to table
    table = True

    # change defaults for two parameters
    if len(aids) == 2:
        table = (aids[1] == "table")

    # revert aids to what is expected in original code
    aids = [aids[0]]

    if len(files) != len(aids):
        raise Exception("Number of files and artifact ids must match.")

    # parse file as either table or matrix
    if table:

        # call slycat-csv-parser directly
        slycat.web.server.plugin.manager.parsers["slycat-csv-parser"] \
            ["parse"](database, model, input, files, aids, **kwargs)

    else:

        # matrix parser (newer parser)
        attributes, dimensions, data = vs_parse.parse_mat_file(files[0])
        slycat.web.server.put_model_arrayset(database, model, aids[0], input)
        slycat.web.server.put_model_array(database, model, aids[0], 0, attributes, dimensions)
        slycat.web.server.put_model_arrayset_data(database, model, aids[0], "0/.../...", [data])

    end = time.time()
    model["db_creation_time"] = (end - start)
    database.save(model)

# import parse code module from source by hand
vs_parse = imp.load_source('vs-parse-files',
    os.path.join(os.path.dirname(__file__), 'vs-parse-files.py'))

def register_slycat_plugin(context):
    context.register_parser("vs-parser", "VideoSwarm Files", ["mp-files"], parse)


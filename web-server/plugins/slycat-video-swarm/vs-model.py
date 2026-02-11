# Copyright 2013 National Technology & Engineering Solutions of Sandia, LLC (NTESS).
# Under the terms of Contract DE-NA0003525 with NTESS, the U.S. Government
# retains certain rights in this software.
#
#
# This file contains the python code which registers the movie-plex
# plugin with slycat.  It then registers the actual python and
# javascript code (in the /py and /js directories) so that slycat
# knows where to find things.
#
# S. Martin, J. Gittinger
# 3/31/2017
def register_slycat_plugin(context):

    import os
    import io
    import datetime
    import slycat.web.server
    import re
    import numpy
    import cherrypy
    import json
    import imp

    # identify media columns in table data
    def media_columns(database, model, verb, type, command, **kwargs):
        """Identify columns in the input data that contain media URIs (image or video).
        :param kwargs:
        :param command:
        :param type:
        :param verb:
        :param model:
          model ID in the data base
        :param database:
          our connection to couch db
        """
        expression = re.compile("file://|http")
        search = numpy.vectorize(lambda x: bool(expression.search(x)))

        columns = []
        metadata = slycat.web.server.get_model_arrayset_metadata(
            database, model, "movies.meta", "0"
        )["arrays"][0]
        for index, attribute in enumerate(metadata["attributes"]):
            if attribute["type"].decode(encoding="UTF-8") != "string":
                continue
            column = slycat.web.server.get_model_arrayset_data(
                database, model, "movies.meta", "0/%s/..." % index
            )
            if not numpy.any(search(column)):
                continue
            columns.append(index)

        cherrypy.response.headers["content-type"] = "application/json"
        return json.dumps(columns).encode()

    # read log file and return relevant for display -- launches
    # a thread which monitors the log file
    def read_log(database, model, verb, type, command, **kwargs):

        # get remote session information
        filename = kwargs["0"]
        hostname = kwargs["1"]
        if "2" in kwargs:
            debug = True
        else:
            debug = False

        # check for open session
        sid = None
        session = database.get("session", cherrypy.request.cookie["slycatauth"].value)
        for host_session in session["sessions"]:
            if host_session["hostname"] == hostname:
                sid = host_session["sid"]
                break

        # read contents of log file (if this fails it fails back to the JS call)
        log_file = slycat.web.server.get_remote_file(sid, filename)

        # parse log file
        user_log, progress, finished = parse_log_file(log_file, debug)

        # return data using content function
        def content():
            yield json.dumps(
                {
                    "user_log": user_log,
                    "progress": progress,
                    "finished": finished,
                    "error": False,
                    "error_message": "none.",
                }
            )

        return content()

    # helper function to parse the log file (looking for tags "[USER]" and "[PROGRESS]"
    def parse_log_file(log_file, debug=False):

        # get each line of log file
        lines = log_file.splitlines()
        if debug:
            cherrypy.log.error("[VS-LOG-FILE]\n" + str(log_file))
        # record user log, progress, job done
        user_log = []
        progress = 0
        finished = False

        # look through lines for [VS-LOG], [VS-PROGRESS], or [VS-FINISHED] tags
        for line in lines:
            line = line.decode(encoding="UTF-8")

            # split first word
            tokens = line.split(" ", 1)

            # check for [USER]
            if tokens[0] == "[VS-LOG]":
                user_log.append(tokens[1])

            # check for [PROGRESS] -- use last occurence
            if tokens[0] == "[VS-PROGRESS]":
                progress = int(float(tokens[1]))

            # check for finished token
            if tokens[0] == "[VS-FINISHED]":
                finished = True

        # return user log and progress
        return "\n".join(user_log), progress, finished

    # read csv file and upload to database
    def read_csv(database, model, verb, type, command, **kwargs):

        # get parameters
        workdir = kwargs["0"]
        hostname = kwargs["1"]

        # file is called "movies.csv"
        filename = workdir + "/movies.csv"

        cherrypy.log.error("VS: Reading CSV file.")

        # check for open session
        sid = None
        session = database.get("session", cherrypy.request.cookie["slycatauth"].value)
        for host_session in session["sessions"]:
            if host_session["hostname"] == hostname:
                sid = host_session["sid"]
                break

        # read csv file
        csv_file = slycat.web.server.get_remote_file(sid, filename)

        # parse file and upload to server
        slycat.web.server.plugin.manager.parsers["slycat-csv-parser"]["parse"](
            database,
            model,
            False,
            [csv_file.decode("utf-8")],
            ["movies.meta"],
            **kwargs
        )

        return json.dumps({"error": False, "error_message": "none."})

    # read trajectories file and upload to database
    def read_mat_file(database, model, verb, type, command, **kwargs):

        # get parameters
        workdir = kwargs["0"]
        hostname = kwargs["1"]
        aid = kwargs["2"]

        # file is called "movies.trajectories"
        filename = workdir + "/" + aid

        cherrypy.log.error("VS: Reading " + aid + " file.")

        # check for open session
        sid = None
        session = database.get("session", cherrypy.request.cookie["slycatauth"].value)
        for host_session in session["sessions"]:
            if host_session["hostname"] == hostname:
                sid = host_session["sid"]
                break

        # read trajectories file
        mat_file = slycat.web.server.get_remote_file(sid, filename)

        # parse file and upload to server
        attributes, dimensions, data = vs_parse.parse_mat_file(mat_file.decode("utf-8"))
        slycat.web.server.put_model_arrayset(database, model, aid)
        slycat.web.server.put_model_array(
            database, model, aid, 0, attributes, dimensions
        )
        slycat.web.server.put_model_arrayset_data(
            database, model, aid, "0/.../...", [data]
        )

        return json.dumps({"error": False, "error_message": "none."})

    # extract links column and put it into movies.links artifact
    def extract_links(database, model, verb, type, command, **kwargs):
        if kwargs["0"] == "remote":
            # column to extract
            workdir = kwargs["1"]
            hostname = kwargs["2"]
            link_column = kwargs["3"]

            filename = workdir + "/movies.csv"

            sid = None
            session = database.get(
                "session", cherrypy.request.cookie["slycatauth"].value
            )
            for host_session in session["sessions"]:
                if host_session["hostname"] == hostname:
                    sid = host_session["sid"]
                    break

            # Get movies.csv so that the movie links can be extracted
            csv_file = slycat.web.server.get_remote_file(sid, filename)
            csv_file = csv_file.decode("utf-8")
            rows = csv_file.split("\n")

            # Extract movie links
            movie_column = []
            movie_column_index = None
            for i in range(0, (len(rows) - 1)):
                if i > 0:
                    split_column = rows[i].split(",")

                    if link_column == "":
                        movie_path = split_column[len(split_column) - 1]
                    else:
                        movie_path = split_column[int(link_column)]

                    if "\r" in movie_path:
                        movie_path = movie_path.split("\r")[0]
                    movie_column.append(movie_path)

            movie_column = numpy.asarray(movie_column)

            # set up links as an artifact
            attributes = [dict(name="value", type="string")]
            dimensions = [dict(name="row", end=len(movie_column))]

            # push to "movies.links" artifact in database
            slycat.web.server.put_model_arrayset(database, model, "movies.links", input)
            slycat.web.server.put_model_array(
                database, model, "movies.links", 0, attributes, dimensions
            )
            slycat.web.server.put_model_arrayset_data(
                database, model, "movies.links", "0/.../...", [movie_column]
            )

            return json.dumps("Extracted video links.")

        else:
            links_col = int(kwargs["1"])
            data = slycat.web.server.get_model_arrayset_data(
                database, model, "movies.meta", "0/.../..."
            )
            links_col_data = data[links_col]
            attributes = [dict(name="value", type="string")]
            dimensions = [dict(name="row", end=len(links_col_data))]

            slycat.web.server.put_model_arrayset(database, model, "movies.links", input)
            slycat.web.server.put_model_array(
                database, model, "movies.links", 0, attributes, dimensions
            )
            slycat.web.server.put_model_arrayset_data(
                database, model, "movies.links", "0/.../...", [links_col_data]
            )

            return json.dumps("Extracted video links.")

    def finish(database, model):
        slycat.web.server.update_model(
            database,
            model,
            state="finished",
            result="succeeded",
            finished=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            progress=1.0,
            message="",
        )

    # import parse code module from source by hand
    vs_parse = imp.load_source(
        "vs-parse-files", os.path.join(os.path.dirname(__file__), "vs-parse-files.py")
    )
    # register the new model
    context.register_model("VS", finish)

    # Register custom commands for use by wizards.
    context.register_model_command("GET", "VS", "media-columns", media_columns)
    context.register_model_command("GET", "VS", "extract-links", extract_links)
    context.register_model_command("GET", "VS", "read_log", read_log)
    context.register_model_command("GET", "VS", "read_csv", read_csv)
    context.register_model_command("GET", "VS", "read_mat_file", read_mat_file)

    # register a wizard for creating instances of the new model
    context.register_wizard(
        "VS", "New VideoSwarm Model", require={"action": "create", "context": "project"}
    )

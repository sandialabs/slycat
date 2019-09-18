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
        expression = re.compile('file://|http')
        search = numpy.vectorize(lambda x:bool(expression.search(x)))

        columns = []
        metadata = slycat.web.server.get_model_arrayset_metadata(database, model, "movies.meta", "0")["arrays"][0]
        for index, attribute in enumerate(metadata["attributes"]):
          if attribute["type"] != "string":
            continue
          column = slycat.web.server.get_model_arrayset_data(database, model, "movies.meta", "0/%s/..." % index)
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
            yield json.dumps({"user_log": user_log, "progress": progress,
                              "finished": finished, "error": False,
                              "error_message": "none."})
        return content()


    # helper function to parse the log file (looking for tags "[USER]" and "[PROGRESS]"
    def parse_log_file (log_file, debug=False):

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
        filename = workdir + '/movies.csv'

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
        slycat.web.server.plugin.manager.parsers["slycat-csv-parser"] \
            ["parse"](database, model, False, [csv_file], ["movies.meta"], **kwargs)

        return json.dumps({"error": False,
                           "error_message": "none."})


    # read trajectories file and upload to database
    def read_mat_file (database, model, verb, type, command, **kwargs):

        # get parameters
        workdir = kwargs["0"]
        hostname = kwargs["1"]
        aid = kwargs["2"]

        # file is called "movies.trajectories"
        filename = workdir + '/' + aid

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
        attributes, dimensions, data = vs_parse.parse_mat_file(mat_file)
        slycat.web.server.put_model_arrayset(database, model, aid)
        slycat.web.server.put_model_array(database, model, aid, 0, attributes, dimensions)
        slycat.web.server.put_model_arrayset_data(database, model, aid, "0/.../...", [data])

        return json.dumps({"error": False,
                           "error_message": "none."})


    # extract links column and put it into movies.links artifact
    def extract_links(database, model, verb, type, command, **kwargs):

        # column to extract
        links_col = int(kwargs["0"])

        # load table data
        data = slycat.web.server.get_model_arrayset_data(database, model, "movies.meta", "0/.../...")

        # get links column
        links_col_data = data[links_col]

        # set up links as an artifact
        attributes = [dict(name="value", type="string")]
        dimensions = [dict(name="row", end=len(links_col_data))]

        # push to "movies.links" artifact in database
        slycat.web.server.put_model_arrayset(database, model, "movies.links", input)
        slycat.web.server.put_model_array(database, model, "movies.links", 0, attributes, dimensions)
        slycat.web.server.put_model_arrayset_data(database, model, "movies.links", "0/.../...", [links_col_data])

        return json.dumps("Extracted video links.")


    def finish(database, model):
        slycat.web.server.update_model(database, model, state="finished",
            result="succeeded", finished=datetime.datetime.utcnow().isoformat(),
            progress=1.0, message="")


    def page_html(database, model):
        return open(os.path.join(os.path.dirname(__file__),
                    "html/vs-ui.html"), "r").read()

    # import parse code module from source by hand
    vs_parse = imp.load_source('vs-parse-files',
                               os.path.join(os.path.dirname(__file__), 'vs-parse-files.py'))
    # register the new model
    context.register_model("VS", finish)

    # register a default page for displaying the model
    context.register_page("VS", page_html)

    # registry css resources with slycat
    # context.register_page_bundle("VS", "text/css", [
    #
    #     # jquery ui
    #     os.path.join(os.path.dirname(__file__), "css/jquery-ui/jquery-ui.css"),
    #     os.path.join(os.path.dirname(__file__), "css/jquery-ui/jquery.ui.theme.css"),
    #     os.path.join(os.path.dirname(__file__), "css/jquery-ui/jquery.ui.resizable.css"),
    #     # slickgrid
    #     os.path.join(os.path.dirname(__file__), "css/slickGrid/slick.grid.css"),
    #     os.path.join(os.path.dirname(__file__), "css/slickGrid/slick-default-theme.css"),
    #     os.path.join(os.path.dirname(__file__), "css/slickGrid/slick.headerbuttons.css"),
    #     os.path.join(os.path.dirname(__file__), "css/slickGrid/slick-slycat-theme.css"),
    #     # movie-plex
    #     os.path.join(os.path.dirname(__file__), "css/vs-ui.css"),
    #
    #     ])
    #
    # # register js resources with slycat
    # # (note that js files which depend on other js files
    # # need to be listed first)
    # context.register_page_bundle("VS", "text/javascript", [
    #
    #     # jquery
    #     os.path.join(os.path.dirname(__file__), "js/jquery-ui-1.10.4.custom.min.js"),
    #     os.path.join(os.path.dirname(__file__), "js/jquery.layout-latest.min.js"),
    #
    #     # knob
    #     os.path.join(os.path.dirname(__file__), "js/jquery.knob.js"),
    #
    #     # d3
    #     os.path.join(os.path.dirname(__file__), "js/d3.min.js"),
    #
    #     # slickgrid
    #     os.path.join(os.path.dirname(__file__), "js/slickGrid/jquery.event.drag-2.2.js"),
    #     os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.core.js"),
    #     os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.grid.js"),
    #     os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.rowselectionmodel.js"),
    #     os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.headerbuttons.js"),
    #     os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.dataview.js"),
    #     os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.autotooltips.js"),
    #
    #     # movie-plex
    #     os.path.join(os.path.dirname(__file__), "js/slycat-scrubber.js"),
    #     os.path.join(os.path.dirname(__file__), "js/color-switcher.js"),
    #     os.path.join(os.path.dirname(__file__), "js/vs-controls.js"),
    #     os.path.join(os.path.dirname(__file__), "js/vs-request-data.js"),
    #     os.path.join(os.path.dirname(__file__), "js/vs-table.js"),
    #     os.path.join(os.path.dirname(__file__), "js/vs-scatter-plot.js"),
    #     os.path.join(os.path.dirname(__file__), "js/vs-layout.js"),
    #     os.path.join(os.path.dirname(__file__), "js/vs-trajectories.js"),
    #     os.path.join(os.path.dirname(__file__), "js/vs-movies.js"),
    #     os.path.join(os.path.dirname(__file__), "js/vs-ui.js"),
    #
    #     ])

    context.register_page_resource("VS", "images", os.path.join(os.path.dirname(__file__), "images"))
    # Register images and other resources
    images = [
        'ui-bg_glass_75_e6e6e6_1x400.png',
    ]
    for image in images:
        context.register_page_resource("VS", image, os.path.join(os.path.dirname(__file__), "images", image))

    context.register_page_resource("VS", "slycat-scrubber.html", os.path.join(os.path.dirname(__file__), "html/slycat-scrubber.html"))
    
    # Register custom commands for use by wizards.
    context.register_model_command("GET", "VS", "media-columns", media_columns)
    context.register_model_command("GET", "VS", "extract-links", extract_links)
    context.register_model_command("GET", "VS", "read_log", read_log)
    context.register_model_command("GET", "VS", "read_csv", read_csv)
    context.register_model_command("GET", "VS", "read_mat_file", read_mat_file)

    # register a wizard for creating instances of the new model
    context.register_wizard("VS", "New VideoSwarm Model", require={"action":"create", "context":"project"})
    context.register_wizard_resource("VS", "ui.js", os.path.join(os.path.dirname(__file__), "js/vs-wizard.js"))
    context.register_wizard_resource("VS", "ui.html", os.path.join(os.path.dirname(__file__), "html/vs-wizard.html"))

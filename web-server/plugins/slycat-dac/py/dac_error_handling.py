# this file contains routines used for error handling, logging, and reporting
# common to the file parsers and web-services
#
# S. Martin
# 4/4/2020

# slycat server and web server
import slycat.web.server
import cherrypy


# logs a message to the cherrypy error log with the [DAC] tag
def log_dac_msg(msg_string):

    # print to cherrypy error log with dac tag
    cherrypy.log.error("[DAC] " + msg_string)


# update dac-parse-log
def update_parse_log (database, model, parse_error_log, error_type, error_string):

    parse_error_log.append(error_string)
    slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                          [error_type, "\n".join(parse_error_log)])

    return parse_error_log


# if model fails to load, logs a python exception to the
# cherrypy error log and also reports it to the DAC ui
def report_load_exception (database, model, parse_error_log, traceback_msg):

    # print error to cherrypy.log.error
    log_dac_msg(traceback_msg)

    # report failure to load model
    update_parse_log(database, model, parse_error_log, "No Data",
                     "Server error -- could not create model.")

    # done polling
    slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
        ["Error", "no data could be imported (see Info > Parse Log for details)"])


# log an error and raise exception
def quit_raise_exception(database, model, parse_error_log, error_msg):

    # record quit message
    parse_error_log = update_parse_log(database, model, parse_error_log, "Progress", error_msg)

    # stop upload
    report_load_exception (database, model, parse_error_log, error_msg)

    raise Exception(error_msg)
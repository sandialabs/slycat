# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

# This script read and processes a dac generic .zip file before pushing
# it to the Slycat server

# S. Martin
# 10/24/22

# file checks
import os

# connect to slycat server
import slycat.web.client

# DAC UI defaults
from slycat.web.client.dac_defaults import dac_model_defaults

# DAC error handling
class DACUploadError (Exception):

    # exception for DAC upload problems
    def __init__(self, message):
        self.message = message

# parse command line arguments
def parser():

    parser = slycat.web.client.ArgumentParser(description=
        "Create Slycat Dial-A-Cluster model from dac generic .zip file.")

    # input file
    parser.add_argument("dac_gen_zip", help="DAC generic .zip file.")

    # model and project names/descriptions
    parser.add_argument("--marking", default="cui", 
        help="Marking type.  Default: %(default)s")
    parser.add_argument("--model-description", default="", 
        help="New model description.  Default: %(default)s")
    parser.add_argument("--model-name", default="DAC Model", 
        help="New model name.  Default: %(default)s")
    parser.add_argument("--project-description", default="", 
        help="New project description.  Default: %(default)s")
    parser.add_argument("--project-name", default="DAC Models", 
        help="New project name.  Default: %(default)s")
        
    return parser

# logging is just printing to the screen
def log (msg):
    print(msg)

# create DAC model, show progress by default, arguments 
# include the command line connection parameters
# and project/model information
# create TDMS model, show progress by default, arguments 
# include the command line connection parameters
# and project/model information
def upload_model (arguments, log, progress=True):

    # setup a connection to the Slycat Web Server.
    connection = slycat.web.client.connect(arguments)

    # create a new project to contain our model.
    pid = connection.find_or_create_project(arguments.project_name, arguments.project_description)

    # create the new, empty model.
    mid = connection.post_project_models(pid, "DAC", arguments.model_name, arguments.marking, 
        arguments.model_description)

    # assign model UI defaults
    connection.put_model_parameter(mid, "dac-ui-parms", dac_model_defaults())
    
    # upload data to new model
    connection.upload_files(mid, [arguments.dac_gen_zip], 
        "dac-gen-zip-parser", [["Null"], ["DAC"]], progress)

    # mark model as finished
    connection.post_model_finish(mid)

    # wait until the model is ready
    connection.join_model(mid)

    return mid

# check arguments and create model
def create_model (arguments, log):

    # check that file is .zip file
    if not arguments.dac_gen_zip.endswith('.zip'):
        raise DACUploadError ('Must supply a DAC generic format file ending with ".zip".')
    
    # check that file exists
    if not os.path.isfile(arguments.dac_gen_zip):
        raise DACUploadError ('File "' + arguments.dac_gen_zip + '" does not exist.')

    # echo back user input, starting with .zip file
    log('*********** Creating DAC Model ***********')
    log("Input file: " + arguments.dac_gen_zip)

    # upload model
    mid = upload_model (arguments, log)

    # supply direct link to model
    host = arguments.host
    if arguments.port:
        host = host + ":" + arguments.port
    log("Your new model is located at %s/models/%s" % (host, mid))
    log('***** DAC Model Successfully Created *****')

# main entry point
def main():

    # set up argument parser
    ps_parser = parser()  

    # get user arguments
    arguments = ps_parser.parse_args()

    # check arguments and create model
    create_model(arguments, log)

# command line version
if __name__ == "__main__":

    main()
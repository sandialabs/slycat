# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC. 
# Under the terms of Contract DE-NA0003525 with National Technology and Engineering 
# Solutions of Sandia, LLC, the U.S. Government retains certain rights in this software.

# Creates a batch of dial-a-cluster models by uploading TDMS and TMDS .zip 
# formatted files to the Slycat server.  Once uploaded the models are created 
# on the server using the TDMS parser.
#
# The files used to create the models are recorded in a file (see 
# web-client-readme.txt) and passed to this script on the command line.
#
# S. Martin
# 10/22/2020

# use a separate argument parser
import argparse

# log file & errors
import logging
import traceback

# tdms upload
import slycat.web.client.dac_tdms as tdms

# sets up logging to screen or file, depending on user input
def setup_logging(log_file):

    # set up log file, or print to screen (default)
    if log_file:

        log = logging.getLogger()
        log.setLevel(logging.INFO)

        # set up log file
        log.addHandler(logging.FileHandler(log_file))

        # restart log, in case log file already exists
        with open(log_file, 'w'):
            pass

        # log to file and screen
        def logger(msg):
            log.log(logging.INFO, msg)
            print(msg)

    else:

        # log to screen only
        def logger(msg):
            print(msg)

    return logger

# tdms batch entry point
def main():

    # provide additional command line arguments 
    batch_parser = argparse.ArgumentParser(description=
        "Creates a batch of Dial-A-Cluster models from links to TDMS data " +
        "provided in a file.")

    # actual files to upload
    batch_parser.add_argument("batch_file", 
        help='TDMS batch file, providing comma separated command line arguments ' +
             'for TDMS upload script.  Line 1 contains authentication flags, ' +
             'line 2 contains project information, subsequent lines provide ' + 
             'TDMS file names and model flags.')

    # optional flag to log results to file
    batch_parser.add_argument('--log_file', default=None,
        help="Optional file to log results of TDMS uploads.  Note that if a model " +
             "fails to upload, the script will not terminate, but will carry on " + 
             "trying to upload the remaaining data.  Log file will be overwritten " +
             "if it already exists.")

    # get command line arguments
    batch_args = batch_parser.parse_args()

    # set up logging, always to screen, to file if requested
    log = setup_logging(batch_args.log_file)

    # parse batch file
    auth_args = []
    proj_args = []
    model_args = []
    with open(batch_args.batch_file, 'r') as batch:

        # first line has authentication flags
        line1 = batch.readline().strip()
        if line1 != '':
            auth_args = line1.split(",")

        # second line has project flags
        line2 = batch.readline().strip()
        if line2 != '':
            proj_args = line2.split(",")

        # following lines have model data
        for line in batch:

            # skip empty lines
            if line.strip() != '':
                model_args.append(line.strip().split(","))

    # set up TDMS parser
    tdms_parser = tdms.parser()

    # upload each model
    for model in model_args:

        # combine arguments (and remove empty strings)
        args = auth_args + proj_args + model

        # parse arguments using tdms parser
        arguments = tdms_parser.parse_args(args)

        # check arguments and create model
        try:
            tdms.create_model(arguments, log)

        # if there is a problem, skip this model and continue
        except:
            log('Could not upload model with arguments: ' + ' '.join(args))
            log(traceback.format_exc())

# command line entry point
if __name__ == "__main__":

    main()
# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC. 
# Under the terms of Contract DE-NA0003525 with National Technology and Engineering 
# Solutions of Sandia, LLC, the U.S. Government retains certain rights in this software.

# Creates a batch of tdms files.

# S. Martin
# 5/31/2023

# connection to Slycat server
import slycat.web.client

# dac tdms parser options
import slycat.web.client.dac_tdms_util as dac_tdms_util
from slycat.web.client.dac_tdms_util import TDMSUploadError

# dac tdms upload
import slycat.web.client.dac_tdms as dac_tdms

# logger
import logging

# file manipulation
import os

# the tdms file types allowed
TDMS_MATCHES = ['Factory_Trigger', 'Acceptance_Trigger', 'PL', 'Pulse_Life', 
                'Extended_Pulse_Life', 'Probe_Age']

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

# find batches
def catalog_batches(arguments, log):

    # read all meta data before further run chart specific filtering
    metadata = dac_tdms_util.catalog_tdms_files(arguments, log, TDMS_MATCHES)

    # get batches discovered (we will create a model for each batch)
    batches = []
    part_numbers = []
    lot_numbers = []
    for tdms_file in metadata:

        # collate part, lot, batch information
        if tdms_file['batch'] not in batches:
            batches.append(tdms_file['batch'])
        if tdms_file['part'] not in part_numbers:
            part_numbers.append(tdms_file['part'])
        if tdms_file['lot'] not in lot_numbers:
            lot_numbers.append(tdms_file['lot'])

    batches.sort()

    # check that part number remains constant
    if len(part_numbers) > 1:
        log('Cannot have more than one part number for batch uploads.')
        raise TDMSUploadError('Cannot have more than one part number for batch uploads.')
    part_number = part_numbers[0]

    # check that lot number remains constant
    if len(lot_numbers) > 1:
        log('Cannot have more than one lot number for batch uploads.')
        raise TDMSUploadError('Cannot have more than one lot number for batch uploads.')
    lot_number = lot_numbers[0]
    
    # create a dictionary of files in each batch
    batch_data = {}
    for batch in batches:
        data_inds = []
        for data_ind in range(len(metadata)):
            if metadata[data_ind]['batch'] == batch:
                data_inds.append(data_ind)
        batch_data[batch] = data_inds
    
    return metadata, part_number, lot_number, batches, batch_data

# create model batches
def create_models(arguments):

    # can't have both overvoltage and sprytron
    if arguments.overvoltage and arguments.sprytron:
        raise TDMSUploadError("Can't use both overvoltage and sprytron options " +
              "together. Please select one or the other and try again.")

    # set up logging, always to screen, to file if requested
    log = setup_logging(arguments.log_file)

    # organize tdms files
    metadata, part_number, lot_number, batches, batch_data = \
        catalog_batches(arguments, log)
    
    # alter agruments for dac tdms
    arguments.model_description = str(arguments.tdms_file_matches)
    del arguments.tdms_file_matches
    del arguments.input_data_dir
    del arguments.part_num_match
    del arguments.log_file

    for i in range(len(batches)):

        # keep track of model we are uploading
        log('Processing DAC Batch ' + batches[i] + ': (' + str(i) + '/' + str(len(batches)) + ').')

        # change project name, model name, description to describe batch
        arguments.project_name = str(part_number)
        arguments.model_name = str(part_number) + '_' + str(lot_number) + '_' + batches[i]

        # add batch files
        batch_files = []
        for j in batch_data[batches[i]]:
            for file in metadata[j]['tdms_files']:
                batch_files.append(os.path.join(metadata[j]['source'], file))
        arguments.files = batch_files

        # run dac
        dac_tdms.create_model(arguments, log)

# set up argument parser
def parser ():

    # provide additional command line arguments for TDMS files
    parser = slycat.web.client.ArgumentParser(description=
        "Creates a batch of Dial-A-Cluster models using specified .tdms files.")

    # input data directory
    parser.add_argument("input_data_dir", 
        help='Directory containing .tdms output files, organized ' +
             'according to part number.')

    # part number specification
    parser.add_argument("part_num_match",
        help='Part number to match when creating batch models, can included wildcards, ' +
             'e.g. "XXXXXX_XX_*".  Note that part and lot numbers should be constant, ' +
             'and you should use "" in Unix to pass wildcards.')

    # optional flag to log results to file
    parser.add_argument('--log-file', default=None,
        help="Optional file to log results of TDMS uploads.  Note that if a model " +
             "fails to upload, the script will not terminate, but will carry on " + 
             "trying to upload the remaaining data.  Log file will be overwritten " +
             "if it already exists.")

    # TDMS types to use
    parser.add_argument('--tdms-file-matches', nargs="+", choices=TDMS_MATCHES,
        help='Use specified file matches to filter TDMS files, ' + 
             'defaults to full list of choices.')
    
    # model and project names/descriptions
    parser.add_argument("--marking", default="cui", 
        help="Marking type.  Default: %(default)s")
    parser.add_argument("--model-description", default="", 
        help="New model description.  Default: %(default)s")
    parser.add_argument("--model-name", default="TDMS DAC Model", 
        help="New model name.  Default: %(default)s")
    parser.add_argument("--project-description", default="", 
        help="New project description.  Default: %(default)s")
    parser.add_argument("--project-name", default="TDMS DAC Models", 
        help="New project name.  Default: %(default)s")
    
    # add tmds options
    parser = dac_tdms_util.add_options (parser)

    return parser

# dac generate batch entry point
def main():

    # set up argument parser
    batch_parser = parser()  

    # get user arguments
    arguments = batch_parser.parse_args()

    # create models
    create_models(arguments)

# command line version
if __name__ == "__main__":

    main()
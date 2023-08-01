# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC. 
# Under the terms of Contract DE-NA0003525 with National Technology and Engineering 
# Solutions of Sandia, LLC, the U.S. Government retains certain rights in this software.

# Module defining Dial-A-Cluster .tdms parser, options, and a utility for
# enumerating .tdms files.

# S. Martin
# 5/31/2023

# file manipulation
import os
import fnmatch

# arrays
import numpy as np

# TDMS error handling
class TDMSUploadError (Exception):

    # exception for TDMS upload problems
    def __init__(self, message):
        self.message = message

# add tdms parser options for any dac model
def add_options(parser):

    # parsing parameters
    parser.add_argument("--min-time-points", default=10, type=int, 
        help="Minimum number of time points per channel, integer >= 2. " +
             "Default: %(default)s.")
    parser.add_argument("--min-channels", default=2, type=int,
        help="Minimum number of channels per text, integer >= 1. " +
             "Default: %(default)s.")
    parser.add_argument("--min-num-shots", default=1, type=int,
        help="Channels must occur in at least this many shots, integer >= 0. " +
             "Use zero to indicate that channel must occur in every shot. " +
             "Default: %(default)s.")
    parser.add_argument("--num-landmarks", default=None, type=int,
        help="Number of landmarks to use, integer >= 3.  Can also use zero " +
             "to indicate use of full dataset (no landmarks).  Default: %(default)s.")
    parser.add_argument("--num-PCA-comps", default=10, type=int,
        help="Number of PCA components to use, integer >= 2.  Note --num-landmarks " + 
             "over-rides --num-PCA-comps.  Default: %(default)s.")
    parser.add_argument("--overvoltage", action="store_true",
        help="Expecting overvoltage data.")
    parser.add_argument("--sprytron", action="store_true",
        help="Expecting sprytron data.")
    parser.add_argument("--intersection", action="store_true", 
        help="Combine mismatched time steps using intersection. " +
             "Default is to combine using union.")
    parser.add_argument("--do-not-infer-channel-units", action="store_true",
        help="Do not infer channel units. Default is to infer channel units " +
             "from channel name.")
    parser.add_argument("--do-not-infer-time-units", action="store_true",
        help="Do not infer time units. Default is to assume unspecified units " +
             "are seconds.")

    return parser

# parse tmds input parameters
def get_parms(arguments):

    # set shot type
    shot_type = 'General'
    if arguments.overvoltage:
        shot_type = 'Overvoltage'
    if arguments.sprytron:
        shot_type = 'Sprytron'

    # set union type
    union_type = "Union"
    if arguments.intersection:
        union_type = "Intersection"

    # populate parameters
    parser_parms = [arguments.min_time_points, arguments.min_channels, 
                    arguments.min_num_shots, arguments.num_landmarks,
                    arguments.num_PCA_comps,
                    shot_type, union_type, 
                    not arguments.do_not_infer_channel_units,
                    not arguments.do_not_infer_time_units]
    
    return parser_parms

# check dac tdms parser parameters
def check_parms (arguments, parms):

    check_parser_msg = []

    # first parameter is minimum number of time points
    if parms[0] < 2:
        check_parser_msg.append ("Each channel must have at least two values. " + \
            "Please use a larger value for min-time-points and try again.")
    
    # second parameter is minimum number of channels
    if parms[1] < 1:
        check_parser_msg.append ("Each test must have at least one channel. " + \
            "Please use a larger value for min-channels and try again.")
    
    # third parameter is minimum number of shots
    if parms[2] < 0:
        check_parser_msg.append("Each channel must occur in at least one channel " + \
            "(use 0 to indicate every channel).  Please use a non-negative value " + \
            "for min-num-shots and try again.")

    # fourth parameter is number of landmarks
    if parms[3] is not None:
        if not (parms[3] == 0 or parms[3] >= 3):
            check_parser_msg.append("Number of landmarks must be zero or >= 3.  Please " + \
                "provide a valid number of landmarks and try again.")

    # fifth parameter is number of PCA components
    if parms[4] < 2:
        check_parser_msg.append("Number of PCA components must be >= 2.  Please provide " + \
            "a valid number of PCA components and try again.")

    # sixth parameter is expected type
    if parms[5] != "General" and \
       parms[5] != "Overvoltage" and \
       parms[5] != "Sprytron":
        check_parser_msg.append ('Expected data type must be one of "General", ' + \
            '"Overvoltage" or "Sprytron". Please use one of those options ' + \
            'and try again.')

    # seventh parameter is union or intersection (combination of time series)
    if parms[6] != "Union" and \
       parms[6] != "Intersection":
        check_parser_msg.append ('Available methods for combining mismatched, ' + \
            'time points are "Union" and "Intersection". Please use one of those options ' + \
            'and try again.')

    # seventh and eighth parameters are boolean, so either option is OK 

    # landmarks over-rides PCA comps, adjust parms
    if arguments.num_landmarks is not None:
        parms[4] = False
    else:
        parms[4] = True
        parms[3] = arguments.num_PCA_comps

    return parms, "\n".join(check_parser_msg)

# parse test data subdirectory
def parse_run_chart (run_chart):

    # default return is None
    run_chart_id = None

    # split run_chart string on "_" to get identifiers
    run_chart_id = run_chart.split("_")

    # there should be four identifiers
    if len(run_chart_id) != 4:
        run_chart_id = None
    
    return run_chart_id

# enumerate tdms files based on command line inputs
# TDMS_MATCHES gives a list of TDMS file type for filtering
def catalog_tdms_files (arguments, log, TDMS_MATCHES):

    # gather data directories for given part number
    root_dir = arguments.input_data_dir
    part_num_match = arguments.part_num_match

    # check that root dir exists
    if not os.path.isdir(root_dir):
        raise TDMSUploadError("Input data directory does not exist.  Please provide " +
              "a different directory and try again.")
    
    # look for directories containing data for part number provided
    root_subdirs = os.listdir(root_dir)
    part_subdirs = fnmatch.filter(root_subdirs, part_num_match)
    
    # are there any subdirectories?
    if len(part_subdirs) == 0:
        raise TDMSUploadError('Could not find any subdirectories for part number matching "' +
              part_num_match + '".')

    # put subdirectories in order
    part_subdirs.sort()

    # get list of .tdms file matches
    tdms_matches = TDMS_MATCHES
    if arguments.tdms_file_matches is not None:
        tdms_matches = arguments.tdms_file_matches
    tdms_matches = [file_match.replace('_', ' ') for file_match in tdms_matches]

    # report on tdms file being used
    log("Using .tdms file matches in: " + str(tdms_matches))

    # look through each subdirectory for run chart data
    metadata = []
    for subdir in part_subdirs:

        # look for test data directory
        test_data_dir = os.path.join(root_dir, subdir, 'Test Data')

        # skip if run_chart_dir is not an actual directory
        if not os.path.isdir(test_data_dir):
            log('Skipping "' + test_data_dir + '" because it''s not a directory.')
            continue

        # each of the subdirectories of run_chart_dir will be a row in the 
        # metadata table for the run chart model
        possible_run_chart_dirs = os.listdir(test_data_dir)

        # sort according to data ids
        possible_run_chart_dirs.sort()

        # check that we found data directories
        if len(possible_run_chart_dirs) == 0:
            raise TDMSUploadError('No data subdirectories found for part number match "' + 
                  part_num_match + '".')

        # check that data directories conform to expected format
        for run_chart_dir in possible_run_chart_dirs:

            # check that directory is expected format for a run chart
            run_chart_ids = parse_run_chart(run_chart_dir)

            # if it's not a run chart then skip it
            if run_chart_ids is None:
                log('Skipping run chart subdirectory "' + run_chart_dir + 
                    '" because it does not conform to "part_lot_batch_serial" string format.')
                continue
        
            # find .tdms files in run chart directory
            run_chart_files = os.listdir(os.path.join(test_data_dir, run_chart_dir))
            run_chart_tdms_files = [run_chart_file for run_chart_file in run_chart_files 
                                    if run_chart_file.endswith('.tdms')]
        
            # check that we have .tdms files
            if len(run_chart_tdms_files) == 0:
                log ('Skipping subdirectory "' + run_chart_ids[0] + '" -- does not ' +
                      'contain any TDMS files.')
                continue

            # screen for .tdms files according to argument parameters
            run_chart_tdms_matches = []
            run_chart_tdms_types = []
            for run_chart_file in run_chart_tdms_files:
                for match in tdms_matches:
                    if match in run_chart_file:

                        # check that .tdms file has matching part_lot_batch_sn
                        if not run_chart_file.startswith(
                            run_chart_ids[0] + "_" + 
                            run_chart_ids[1] + "_" + 
                            run_chart_ids[2] + "_" + 
                            run_chart_ids[3]):
                            continue
                        
                        # keep track of files and types
                        run_chart_tdms_types.append(match)
                        run_chart_tdms_matches.append(run_chart_file)

            # check that we have matching .tdms files
            if len(run_chart_tdms_matches) == 0:
                log ('Skipping subdirectory "' + run_chart_ids[0] + '" -- does not ' +
                      'contain any TDMS files with file matches.')
                continue

            # store in metadata structure
            metadata.append({"part": run_chart_ids[0],
                             "lot": run_chart_ids[1],
                             "batch": run_chart_ids[2],
                             "sn": run_chart_ids[3],
                             "source": os.path.join(os.path.abspath(test_data_dir), 
                                                    run_chart_dir),
                             "tdms_files": run_chart_tdms_matches,
                             "tdms_types": run_chart_tdms_types})

    # check that files were found
    if metadata == []:
        raise TDMSUploadError("No TDMS files matching selection criterion were found.")

    return metadata

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

    # exclude .tdms files
    parser.add_argument("--exclude", nargs="+",
        help='TDMS file suffixes to exclude. ' + 
             'If you want suffixes that include spaces, use quotes, ' +
             'e.g. "suffix with space".')

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

    # split run_chart string on "_" to get identifiers
    run_chart_split = run_chart.split("_")

    # keep first four, if less than four use None
    run_chart_id = [None, None, None, None]
    if len(run_chart_split) >= 4:
        run_chart_id = run_chart_split[0:4]

    return run_chart_id

# helper function for catalog_tmds_files, converts string specifying batch
# numbers into a python list, e.g. 1-3,5 -> [1,2,3,5]
def convert_batches(batch_str, log):

    # an asterisk indicates any match is OK
    if batch_str == '*': 
        return None

    batches = set()
    try:
        for part in batch_str.split(','):
            x = part.split('-')
            batches.update(range(int(x[0]), int(x[-1]) + 1))
    except:
        log('Input batches = "' + batch_str + '" is an invalid batch specifier.')
        raise ValueError('Input batches = "' + batch_str + '" is an invalid batch specifier.')

    return sorted(batches)

# get suffix from a single file
def get_suffix (file):

    # get file name and extension
    head, tail = os.path.split(file)
    ext = tail.split(".")[-1].lower()

    # is it a tdms file?
    suffix = None
    if ext == 'tdms' or ext =='tdm':

        # get suffix
        suffix = tail.split("_")[-1].split(".")[0]

    return suffix

# get file suffixes for file list
def get_suffixes (file_list):

    # save results as a set
    tdms_suffixes = set()

    # go through each file and parse out suffix
    for file in file_list:

        # add suffix to set
        tdms_suffixes.add(get_suffix(file))

    return tdms_suffixes

# exclude any suffixes not desired
def exclude_suffixes (arguments, file_list):

    # get all suffixes
    include_suffixes = get_suffixes(file_list)

    # exclude suffixes as requested
    if arguments.exclude:

        # exclude and print list of excluded suffixes
        for suffix in arguments.exclude:
            include_suffixes.discard(suffix)

    # sort suffixes
    list_suffixes = list(include_suffixes)
    list_suffixes.sort()

    return list_suffixes

# catalog tdms types and matches
def list_tdms_types (file_list, list_suffixes, run_chart_ids, part_lot_batch_sn=True):

    # do not match part_lot_batch_sn if not present in directory name
    if run_chart_ids[3] is None:
        part_lot_batch_sn = False

    # screen for .tdms files according to argument parameters
    run_chart_tdms_matches = []
    run_chart_tdms_types = []
    for run_chart_file in file_list:

        # get file suffix
        suffix = get_suffix(run_chart_file)
        
        # check if we want to include that suffix
        if suffix not in list_suffixes:
            continue

        # check that .tdms file has matching part_lot_batch_sn
        if part_lot_batch_sn == True:
            if not run_chart_file.startswith(
                run_chart_ids[0] + "_" + 
                run_chart_ids[1] + "_" + 
                run_chart_ids[2] + "_" + 
                run_chart_ids[3]):
                continue

        # keep track of files and types
        run_chart_tdms_types.append(suffix)
        run_chart_tdms_matches.append(run_chart_file)

    return run_chart_tdms_types, run_chart_tdms_matches

# enumerate all tdms subdirectories with files in a given directory
def catalog_tdms_dir (arguments, log):

    # gather data directories
    root_dir = arguments.input_tdms_dir[0]
    
    # check that root dir exists
    if not os.path.isdir(root_dir):
        raise TDMSUploadError("Input data directory does not exist.  Please provide " +
            "a different directory and try again.")

    # look for subdirectories with tdms files
    possible_run_chart_dirs = set()
    for dirpath, dirnames, filenames in os.walk(root_dir):
        tdms_files = [f for f in filenames if f.lower().endswith(".tdms") or f.lower().endswith(".tdm")]
        for filename in tdms_files:
            possible_run_chart_dirs.add(dirpath)
    possible_run_chart_dirs = list(possible_run_chart_dirs)
    possible_run_chart_dirs.sort()

    # check that we found data directories
    if len(possible_run_chart_dirs) == 0:
        raise TDMSUploadError('No data subdirectories found for root dir "' + root_dir + '".')

    # go through each run chart directory
    metadata = []
    for run_chart_dir in possible_run_chart_dirs:

        # get file name (ignore path)
        base_dir = os.path.basename(os.path.realpath(run_chart_dir))

        # check for part_lot_batch_sn format
        run_chart_ids = parse_run_chart(base_dir)

        # find .tdms files in run chart directory
        run_chart_files = os.listdir(run_chart_dir)
        run_chart_tdms_files = [run_chart_file for run_chart_file in run_chart_files 
                                if run_chart_file.lower().endswith('.tdms') or
                                    run_chart_file.lower().endswith('.tdm')]
    
        # check that we have .tdms files
        if len(run_chart_tdms_files) == 0:
            log ('Skipping subdirectory "' + str(run_chart_dir) + '" -- does not ' +
                    'contain any TDMS files.')
            continue

        # get all suffixes
        list_suffixes = exclude_suffixes(arguments, run_chart_tdms_files)

        # check for tdms types and matches
        run_chart_tdms_types, run_chart_tdms_matches = \
            list_tdms_types(run_chart_tdms_files, list_suffixes, run_chart_ids)

        # check that we have matching .tdms files
        if len(run_chart_tdms_matches) == 0:
            log ('Skipping subdirectory "' + str(run_chart_dir) + '" -- does not ' +
                    'contain any TDMS files with file matches.')
            continue

        # check for unstructed directory name
        if run_chart_ids[0] is None:
            if not arguments.unstructured:
                raise TDMSUploadError('Found unstructed directory, to force generation of ' +
                    'run chart use --unstructured option.')
            else:

                # split according to part/lot/batch/sn in file names
                [split_ids, split_files, split_types] = \
                    split_tdms_file_names(run_chart_tdms_matches, run_chart_tdms_types, log)

                # store each split according to part/lot/batch/sn
                for i in range(len(split_ids)):
                    metadata.append({"part": str(split_ids[i][0]),
                                    "lot": str(split_ids[i][1]),
                                    "batch": str(split_ids[i][2]),
                                    "sn": str(split_ids[i][3]),
                                    "source": os.path.abspath(run_chart_dir),
                                    "tdms_files": split_files[i],
                                    "tdms_types": split_types[i],
                                    "include_suffixes": list_suffixes})
        else:

            # store in metadata structure
            metadata.append({"part": str(run_chart_ids[0]),
                            "lot": str(run_chart_ids[1]),
                            "batch": str(run_chart_ids[2]),
                            "sn": str(run_chart_ids[3]),
                            "source": os.path.abspath(run_chart_dir),
                            "tdms_files": run_chart_tdms_matches,
                            "tdms_types": run_chart_tdms_types,
                            "include_suffixes": list_suffixes})

    return metadata

# split a list of tdms files into groups by part-lot-batch-sn in file names
def split_tdms_file_names(tdms_matches, tdms_types, log):
    
    # get unique file name prefixes
    match_prefixes = []
    match_ids = []
    for match in tdms_matches:
        run_chart_ids = parse_run_chart(match)

        # skip if bad part-lot-batch-sn
        if run_chart_ids[0] is None:
            log('Skipping file "' + match + '" -- Could not find part/lot/batch/sn from file name.')
            continue

        # sort by prefix
        match_prefix = '_'.join(run_chart_ids)
        if match_prefix not in match_prefixes:
            match_prefixes.append (match_prefix)
            match_ids.append(run_chart_ids)

    
    # group by prefixes
    tdms_groups = []
    type_groups = []
    for prefix in match_prefixes:
        prefix_group = []
        tdms_type_group= []
        for i in range(len(tdms_matches)):
            if prefix in tdms_matches[i]:
                prefix_group.append(tdms_matches[i])
                tdms_type_group.append(tdms_types[i])
        tdms_groups.append(prefix_group)
        type_groups.append(tdms_type_group)

    return match_ids, tdms_groups, type_groups

# enumerate tdms files based on command line inputs, according to directory list
def catalog_tdms_files (arguments, log):

    # check for directory list style inputs
    if arguments.input_tdms_batches is not None:

        # gather data directories for given part number
        root_dir = arguments.input_tdms_batches[0]
        part_num_match = arguments.input_tdms_batches[1]

        # convert specified batches to python list
        batches = convert_batches(arguments.input_tdms_batches[2], log)

        # check that root dir exists
        if not os.path.isdir(root_dir):
            raise TDMSUploadError("Input data directory does not exist.  Please provide " +
                "a different directory and try again.")
        
        # look for directories containing data for part number provided
        root_subdirs = os.listdir(root_dir)
        part_subdirs = fnmatch.filter(root_subdirs, part_num_match + "_*")

        # look for directories containing batches
        batch_subdirs = []
        for subdir in part_subdirs:
            subdir_nums = subdir.split('_')        
            try:
                subdir_batch = int(subdir_nums[2])
                if batches == None:
                    batch_subdirs.append(subdir)
                elif subdir_batch in batches:
                    batch_subdirs.append(subdir)
            except:
                pass
    
    # check for glob style input with part_num match
    elif arguments.input_tdms_glob is not None:

        # gather data directories for given part number
        root_dir = arguments.input_tdms_glob[0]
        part_num_match = arguments.input_tdms_glob[1]

        # check that root dir exists
        if not os.path.isdir(root_dir):
            raise TDMSUploadError("Input data directory does not exist.  Please provide " +
                "a different directory and try again.")

        # look for directories containing data for part number provided
        root_subdirs = os.listdir(root_dir)
        batch_subdirs = fnmatch.filter(root_subdirs, part_num_match)
        
    # check for directory input where subdirectories are run charts
    elif arguments.input_tdms_dir is not None:
        return catalog_tdms_dir (arguments, log)

    # are there any subdirectories?
    if len(batch_subdirs) == 0:
        raise TDMSUploadError('Could not find any subdirectories for part, number matching "' +
              part_num_match + '".')

    # put subdirectories in order
    batch_subdirs.sort()

    # look through each subdirectory for run chart data
    metadata = []
    for subdir in batch_subdirs:

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
            if run_chart_ids[0] is None:
                log('Skipping subdirectory "' + run_chart_dir + 
                    '" because it does not conform to "part_lot_batch_serial" string format.')
                continue
        
            # find .tdms files in run chart directory
            run_chart_files = os.listdir(os.path.join(test_data_dir, run_chart_dir))
            run_chart_tdms_files = [run_chart_file for run_chart_file in run_chart_files 
                                    if run_chart_file.lower().endswith('.tdms') or
                                       run_chart_file.lower().endswith('.tdm')]
        
            # check that we have .tdms files
            if len(run_chart_tdms_files) == 0:
                log ('Skipping subdirectory "' + str(run_chart_ids[0]) + '" -- does not ' +
                      'contain any TDMS files.')
                continue

            # get all suffixes
            list_suffixes = exclude_suffixes(arguments, run_chart_tdms_files)

            # check for tdms types and matches
            run_chart_tdms_types, run_chart_tdms_matches = \
                list_tdms_types(run_chart_tdms_files, list_suffixes, run_chart_ids)

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
                             "tdms_types": run_chart_tdms_types,
                             "include_suffixes": list_suffixes})
            
    # check that files were found
    if metadata == []:
        raise TDMSUploadError("No TDMS files matching selection criterion were found.")

    return metadata
    
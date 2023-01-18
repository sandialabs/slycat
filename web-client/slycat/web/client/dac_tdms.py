# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC. 
# Under the terms of Contract DE-NA0003525 with National Technology and Engineering 
# Solutions of Sandia, LLC, the U.S. Government retains certain rights in this software.

# Creates dial-a-cluster models by uploading TDMS and TMDS .zip formatted 
# files to the Slycat server.  Once uploaded the models are created on the
# server using the TDMS parser.
#
# This code can be run independently or used as a module to batch processs
# TDMS files.
#
# S. Martin
# 10/21/2020

# connection to Slycat server
import slycat.web.client

# DAC UI defaults
from slycat.web.client.dac_defaults import dac_model_defaults

# file name manipulation
import os

# get suffixes from zip file
import zipfile

# TDMS error handling
class TDMSUploadError (Exception):

    # exception for TDMS upload problems
    def __init__(self, message):
        self.message = message

# check for .TDM, .tdms, or a single .zip file extension
# returns "not-tdms" for wrong extension, "tdms" for correct extensions,
# "zip" for a single .zip file
def check_file_extensions (file_list):

    # a single file can end with .zip, .TDM, or .tdms
    if len(file_list) == 1:

        # check for .zip file
        if file_list[0].lower().endswith(".zip"):
            return "zip"
        
        # check for .tdm or .tdms file
        if file_list[0].lower().endswith('.tdm') or \
           file_list[0].lower().endswith('.tdms'):
            return "tdms"

    # multiple files can only end with .TDM or .tdms
    ext_OK = "tdms"

    for file in file_list:
        if not file.lower().endswith('.tdm') and \
           not file.lower().endswith('.tdms'):
            ext_OK = "not-tdms"

    return ext_OK

# check that files exist on local file system
def check_files_exist (file_list):

    files_exist = True

    for file in file_list:
        if not os.path.isfile(file):
            files_exist = False

    return files_exist

# check the parser parameters
def check_parser_parms (parms):

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

    return "\n".join(check_parser_msg)

# get file suffixes for .zip file
def get_suffixes (zip_file):

    # save results as a set
    tdms_suffixes = set()

    # look through zip file for suffixes
    with zipfile.ZipFile(zip_file, 'r') as zid:

        # get zip file content list
        zip_contents = zid.namelist()

        for file in zip_contents:

            # get file name and extension
            head, tail = os.path.split(file)
            ext = tail.split(".")[-1].lower()

            # is it a tdms file?
            if ext == 'tdms' or ext =='tdm':

                # get suffix
                suffix = tail.split("_")[-1].split(".")[0]

                # add suffix to set
                tdms_suffixes.add(suffix)

    return tdms_suffixes

# test that a string converts to an integer
def is_int(s):
    try: 
        int(s)
        return True
    except ValueError:
        return False

# create TDMS model, show progress by default, arguments 
# include the command line connection parameters
# and project/model information
def upload_model (arguments, parser, parms, file_list, progress=True):

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
    connection.upload_files(mid, file_list, parser, [parms, ["DAC"]], progress)

    # mark model as finished
    connection.post_model_finish(mid)

    # wait until the model is ready
    connection.join_model(mid)

    return mid

# check arguments and create model
def create_model (arguments, log):

    # can't have both overvoltage and sprytron
    if arguments.overvoltage and arguments.sprytron:
        raise TDMSUploadError("Can't use both overvoltage and sprytron options " +
              "together. Please select one or the other and try again.")

    # check file name extensions
    file_list = arguments.files
    file_type = check_file_extensions (file_list)
    if file_type == "not-tdms":
        log("One or more files had the wrong extension (note that if using .zip " +
              "only one file can be uploaded). Please revise the file list " +
              "and try again.")
        exit()

    # check that files exist
    if not check_files_exist (file_list):
        raise TDMSUploadError("One or more input files did not exist. Please make " +
              "sure the file names are correct and try again.")

    # check that zip file is valid
    if file_type == 'zip':
        if not zipfile.is_zipfile(file_list[0]):
            raise TDMSUploadError("Zip file is invalid or corrupt. Please fix the " + 
                  "file and try again.")

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

    # check common parameters
    check_parser_error = check_parser_parms (parser_parms)
    if check_parser_error != "":
        raise TDMSUploadError(check_parser_error)

    # landmarks over-rides PCA comps
    if arguments.num_landmarks is not None:
        parser_parms[4] = False
    else:
        parser_parms[4] = True
        parser_parms[3] = arguments.num_PCA_comps

    # compile suffixes to include if .zip file
    dac_parser = "dac-tdms-file-parser"
    if file_type == "zip":

        # get all possible suffixes
        include_suffixes = get_suffixes (file_list[0])

        # make sure there is at least one suffix
        if len(include_suffixes) == 0:
            raise TDMSUploadError("No valid .tdms files were found in .zip file. " +
                  "A valid .tdms file has to have a .tdms extension and " +
                  "a recognizable suffix. Please fix .zip file and try again.")

        # exclude suffixes as requested
        if arguments.exclude:

            # exclude and print list of excluded suffixes
            for suffix in arguments.exclude:
                include_suffixes.discard(suffix)

        # sort suffixes
        list_suffixes = list(include_suffixes)
        list_suffixes.sort()

        # add to parameters
        parser_parms.append(list_suffixes)

        # set parser type to zip
        dac_parser = "dac-tdms-zip-file-parser"

    # add file list if not zip file
    else:
        parser_parms.append(file_list)

    # echo back user input, starting with files
    log('*********** Creating DAC Model ***********')
    log("Input files:")
    for file in file_list:
        log("\t%s" % file)
    
    # next list included/excluded suffixes
    if file_type == "zip":

        if arguments.exclude:
            log("Excluding TDMS file suffixes:")
            for suffix in arguments.exclude:
                log("\t%s" % suffix)

        log("Including TDMS file suffixes:")
        for suffix in parser_parms[9]:
            log("\t%s" % suffix)

    # next list common parameters
    log("Minimum number of time steps per channel: %s" % parser_parms[0])
    log("Minumum number of channels: %s" % parser_parms[1])
    log("Minimum number of shots: %s" % parser_parms[2])
    log("Number of landmarks: %s" % parser_parms[3])
    log("Number of PCA components: %s" % parser_parms[4])
    log("Expecting TDMS data type: %s" % parser_parms[5])
    log("Combining mismatched time steps using: %s" % parser_parms[6])
    log("Infer channel units: %s" % parser_parms[7])
    log("Infer time units: %s" % parser_parms[9])

    # upload model file(s)
    mid = upload_model (arguments, dac_parser, parser_parms, file_list, progress=True)

    # supply the user with a direct link to the new model.
    host = arguments.host
    if arguments.port:
        host = host + ":" + arguments.port
    log("Your new model is located at %s/models/%s" % (host, mid))
    log('***** DAC Model Successfully Created *****')

# logging is just printing to the screen
def log (msg):
    print(msg)

# set up argument parser
def parser ():

    # provide additional command line arguments for TDMS files
    parser = slycat.web.client.ArgumentParser(description=
        "Creates a Dial-A-Cluster model from one or more .tdms files, " +
        "or from a .zip archive containing .tdms files.")

    # actual files to upload
    parser.add_argument("files", nargs='+', 
        help='TDMS file(s) or TDMS .zip files. If ' +
             'file names include spaces, use quotes, ' +
             'e.g. "file name with spaces.tdms".')

    # model and project names/descriptions
    parser.add_argument("--marking", default="ouo3", 
        help="Marking type.  Default: %(default)s")
    parser.add_argument("--model-description", default="", 
        help="New model description.  Default: %(default)s")
    parser.add_argument("--model-name", default="TDMS DAC Model", 
        help="New model name.  Default: %(default)s")
    parser.add_argument("--project-description", default="", 
        help="New project description.  Default: %(default)s")
    parser.add_argument("--project-name", default="TDMS DAC Models", 
        help="New project name.  Default: %(default)s")

    # exclude .tdms files from .zip upload
    parser.add_argument("--exclude", nargs="+",
        help='TDMS file suffixes to exclude within .zip files. ' + 
             'If you want suffixes that include spaces, use quotes, ' +
             'e.g. "suffix with space".')

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

# tdms entry point
def main():

    # set up argument parser
    tdms_parser = parser()  

    # get user arguments
    arguments = tdms_parser.parse_args()

    # check arguments and create model
    create_model(arguments, log)

# command line version to load a single DAC model
if __name__ == "__main__":

    main()
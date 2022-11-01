# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC. 
# Under the terms of Contract DE-NA0003525 with National Technology and Engineering 
# Solutions of Sandia, LLC, the U.S. Government retains certain rights in this software.

# Creates dial-a-cluster run chart models by processing TDMS formatted 
# files and creating a dial-a-cluster model.  The model can be saved
# in the dac genric format and/or pushed directly to a Slycat server.

# S. Martin
# 8/30/2022

# connection to Slycat server
import slycat.web.client

# DAC upload
import slycat.web.client.dac_gen as dac_gen

# file name manipulation
import os

# manipulating command line arguments
from argparse import Namespace

# processing tables
import numpy as np

# compute PCA with sklearn
from sklearn.decomposition import PCA

# reading tdms files
import nptdms
import pandas as pd

# output zip file
from zipfile import ZipFile

# the tdms file types allowed
TDMS_MATCHES = ['Factory_Trigger', 'Acceptance_Trigger', 'Pulse_Life', 
                'Extended_Pulse_Life', 'Probe_Age']

# the group run chart variables allowed
RUN_CHART_MATCHES = ['TAD', 'Rp', 'Ip', 'DBV']
RUN_CHART_UNITS = ['nsec', 'kOhms', 'Amps', 'V']

# TDMS error handling
class TDMSUploadError (Exception):

    # exception for TDMS upload problems
    def __init__(self, message):
        self.message = message

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

# organize tdms files based on command line inputs
def catalog_tdms_files (arguments, log):

    # gather data directories for given part number
    root_dir = arguments.input_data_dir
    part_num = arguments.part_num

    # check that root dir exists
    if not os.path.isdir(root_dir):
        raise TDMSUploadError("Input data directory does not exist.  Please provide " +
              "a different directory and try again.")
    
    # look for directories containing data for part number provided
    root_subdirs = os.listdir(root_dir)
    part_subdirs = []
    for subdir in root_subdirs:
        if part_num in subdir:
            if os.path.isdir(os.path.join(root_dir, subdir)):
                part_subdirs.append(subdir)
    
    # are there any subdirectories?
    if len(part_subdirs) == 0:
        raise TDMSUploadError('Could not find any subdirectories for part number "' +
              part_num + '".')

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

        # double check that run_chart_dir exists
        if not os.path.isdir(test_data_dir):
            raise TDMSUploadError('Unexpected subdirectory format for part number "' + 
                  part_num + '".')
        
        # each of the subdirectories of run_chart_dir will be a row in the 
        # metadata table for the run chart model
        possible_run_chart_dirs = os.listdir(test_data_dir)

        # sort according to data ids
        possible_run_chart_dirs.sort()

        # check that we found data directories
        if len(possible_run_chart_dirs) == 0:
            raise TDMSUploadError('No data subdirectories found for part number "' + 
                  part_num + '".')

        # check that data directories conform to expected format
        for run_chart_dir in possible_run_chart_dirs:

            # check that directory is expected format for a run chart
            run_chart_ids = parse_run_chart(run_chart_dir)

            # if it's not a run chart then skip it
            if run_chart_ids is None:
                log('Skipping run chart subdirectory "' + run_chart_dir + 
                    '" because it does not conform to "part_lot_batch_serial" string format.')
                continue

            # check that first id matches part number
            if run_chart_ids[0] != part_num:
                raise TDMSUploadError('Subdirectory "' + run_chart_ids[0] + '" prefix does not ' +
                      'match part number "' + part_num + '".')
        
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

    # get common set of tdms types
    common_tdms_types = set(metadata[0]["tdms_types"])
    intersection_flag = False
    for row in range(len(metadata)):

        # set intersection
        common_tdms_types = common_tdms_types.intersection(set(metadata[row]["tdms_types"]))

        # set flag if intersection reduced number of files
        if set(metadata[row]["tdms_types"]) != common_tdms_types:
            intersection_flag = True

    # remove files with uncommon types
    if intersection_flag:
        for row in range(len(metadata)):
            for tdms_ind in reversed(range(len(metadata[row]["tdms_types"]))):
                if metadata[row]["tdms_types"][tdms_ind] not in common_tdms_types:

                    # warn user we are ignoring this file
                    log('Ignoring file "' + metadata[row]["tdms_files"][tdms_ind] +
                        '" because type "' + metadata[row]["tdms_types"][tdms_ind] +
                        '" is not present in all runs.')

                    # remove files from catalog
                    metadata[row]["tdms_types"].pop(tdms_ind)
                    metadata[row]["tdms_files"].pop(tdms_ind)

    # sort catalog by tdms type
    for row in range(len(metadata)):

        # get tmds types and files
        row_tdms_types = metadata[row]["tdms_types"]
        row_tdms_files = metadata[row]["tdms_files"]

        # get indices of sorted tdms types
        tdms_inds = np.argsort(row_tdms_types)

        # sort and re-store types and files
        metadata[row]["tdms_types"] = list(np.asarray(row_tdms_types)[tdms_inds])
        metadata[row]["tdms_files"] = list(np.asarray(row_tdms_files)[tdms_inds])

    return metadata 

# read all tdms run chart data
def read_tdms_files(metadata, run_chart_matches, log):

    # go through each row in the table
    skipped_rows = np.zeros(len(metadata))
    for row in range(len(metadata)):

        root_properties = []
        run_charts = []
        run_chart_headers = []
        tdms_types = []
        for tdms_file_ind in range(len(metadata[row]["tdms_files"])):

            # report progress
            log('Reading .tdms file: "' + metadata[row]["tdms_files"][tdms_file_ind] + '".')

            # save run chart type
            tdms_types.append(metadata[row]["tdms_types"][tdms_file_ind])

            # open tdms file
            tdms_file_name = metadata[row]["tdms_files"][tdms_file_ind]
            tdms_file_path = os.path.join(metadata[row]["source"], tdms_file_name)
            with nptdms.TdmsFile.open(tdms_file_path) as tdms_file:

                # save the root properties for the .tdms file
                root_properties.append(pd.DataFrame(tdms_file.properties, index=[0]))

                # get group properties
                group_header = None
                group_rows = []
                for group in tdms_file.groups():

                    # check that header is the same
                    if group_header is None:
                        group_header = list(group.properties.keys())

                    # this should never happen
                    elif group_header != list(group.properties.keys()):
                        TDMSUploadError('Group headers in file "' + tdms_file_name + 
                                        '" do not match.')

                    # keep track of table values
                    group_rows.append(list(group.properties.values()))

                # create pandas dataframe for group properies
                group_df = pd.DataFrame(data=group_rows, columns=group_header)

                # find numeric columns
                numeric_group_df = group_df.select_dtypes('float64')

                # select headers that with matching run charts
                header_matches = []
                rc_matches = []
                for header in numeric_group_df.head():
                    for run_chart in run_chart_matches:
                        if run_chart in header:
                            header_matches.append(header)
                            rc_matches.append(run_chart)

                # get indices of sorted tdms types
                rc_inds = np.argsort(rc_matches)

                # re-order run charts and headers alphabetically
                rc_matches = list(np.asarray(rc_matches)[rc_inds])
                header_matches = list(np.asarray(header_matches)[rc_inds])

                # check that run chart data is non-empty
                if rc_matches == []:
                    log('No run chart data found for "' + tdms_file_path + '" --' +
                        'skipping directory "' + metadata[row]["source"] +'".')
                    skipped_rows[row] = 1
                
                else:
                    # get sub dataframe with matching headers
                    run_charts.append(numeric_group_df[header_matches])

                    # also save run chart header matches
                    run_chart_headers.append(rc_matches)

        # add to metadata
        metadata[row]["root_properties"] = root_properties
        metadata[row]["run_charts"] = run_charts
        metadata[row]["run_chart_headers"] = run_chart_headers
    
    # remove skipped rows
    for row in reversed(range(len(metadata))):
        if skipped_rows[row]:
            metadata.pop(row)

    # check that data is still non-empty
    if metadata == []:
        raise TDMSUploadError("Too many run charts were missing.  " + 
            "No data remaining to be processed.")

    # go through metadata and check that run charts are the same, per tdms_type
    run_charts = metadata[0]["run_chart_headers"]
    for row in range(len(metadata)):
        for tdms_type in range(len(metadata[row]["tdms_types"])):
            if metadata[row]["run_chart_headers"][tdms_type] != run_charts[tdms_type]:
                raise TDMSUploadError('Found non-matching run chart data in directory"' +
                    metadata[row]["source"] + '", can not continue.')

    return metadata

# fill in metadata table
def read_metadata_table (metadata, arguments, log):

    # go through once to check that column names are the same
    root_head = list(metadata[0]["root_properties"][0].columns)
    for i in range(len(metadata)):
        root_props = metadata[i]["root_properties"]
        
        # check if root properties have same header
        for j in range(len(root_props)):
            if list(root_props[j].columns) != root_head:
                raise TDMSUploadError('Found inconsistent root property header in "' + 
                    metadata[i]["source"] + '" for "' + metadata[i]["tdms_types"][j] + '".')

    # go through and get constant values
    constants = np.ones(len(root_head))
    for i in range(len(metadata)):
        root_props = metadata[i]["root_properties"]

        # check for constant values
        for k in range(len(root_head)):
            const_val = root_props[0].iloc[0][root_head[k]]
            for j in range(len(root_props)):
                if root_props[j].iloc[0][root_head[k]] != const_val:
                    constants[k] = 0

    # collect constant/variable columns
    const_cols = list(np.asarray(root_head)[np.where(constants)[0]])
    var_cols = list(np.asarray(root_head)[np.where(constants==0)[0]])

    # exclude "Configuration Data XML" column by default
    if not arguments.include_configuration_XML:

        # remove "Configuration DATA XML" from headers
        try:
            const_cols.remove("Configuration Data XML")
        except:
            pass
    
        try:
            var_cols.remove("Configuration Data XML")
        except:
            pass

    # construct metadata table header
    meta_column_names = ['Part', 'Lot', 'Batch', 'Serial Number', 'Source'] + const_cols
    for tmds_type in metadata[0]["tdms_types"]:
        meta_column_names = meta_column_names + \
            [header + " [" + tmds_type + "]" for header in var_cols]
    
    # construct metadata table rows
    meta_rows = []
    for row in range(len(metadata)):

        # data from file names
        meta_row = [metadata[row]["part"], metadata[row]["lot"], metadata[row]["batch"],
            metadata[row]["sn"], metadata[row]["source"]]
        
        # data from tdms files
        root_props = metadata[row]["root_properties"]

        # constant root properties
        meta_row = meta_row + list(root_props[0].iloc[0][const_cols].values)

        # variable root properties
        for i in range(len(root_props)):
            meta_row = meta_row + list(root_props[i].iloc[0][var_cols].values)

        # add to table
        meta_rows.append(meta_row)

    # log results
    log("Collated metadata table with " + str(len(meta_column_names)) + " columns and " +
        str(len(meta_rows)) + " rows.")

    return meta_column_names, meta_rows

# construct units table
def read_units_table (metadata, arguments, log):

    # header is always the same for DAC units table
    meta_var_names = ['Name', 'Time Units', 'Units', 'Plot Type']

    # fill in variables.meta table
    meta_vars = []
    for tdms_type in range(len(metadata[0]["tdms_types"])):
        for run_chart in metadata[0]["run_chart_headers"][tdms_type]:

            # name of run chart
            rc_name = run_chart + " [" + metadata[0]["tdms_types"][tdms_type] + "]"

            # units, default inferred
            units = "Not Given"
            if not arguments.do_not_infer_chart_units:
                units = RUN_CHART_UNITS[RUN_CHART_MATCHES.index(run_chart)]
            
            # construct row of table
            meta_vars.append([rc_name, 'Run', units, 'Curve'])

    # note if we inferred units
    if not arguments.do_not_infer_chart_units:
        log('Inferred run chart units from names.')

    return meta_var_names, meta_vars

# construct time step vectors
def read_timesteps (metadata):

    # go through data and find maximum length of each run chart
    time_steps_max = []
    for row in range(len(metadata)):

        # gather time steps per row
        time_steps_row = []
        for tdms_type in range(len(metadata[0]["tdms_types"])):
            time_steps_row = time_steps_row + \
                [metadata[row]["run_charts"][tdms_type].shape[0]] * \
                len(metadata[0]["run_chart_headers"][tdms_type])

        # get maximum time steps for all rows
        if row == 0:
            time_steps_max = time_steps_row
        else:
            time_steps_max = np.maximum(time_steps_max, time_steps_row)
  
    # construct time steps matrix
    time_steps = []
    for max in time_steps_max:
        time_steps.append(list(np.asarray(range(max)) + 1))

    return time_steps

# construct variable matrices
def read_variable_matrices (metadata, time_steps, arguments, log):
    
    # put maximum number of time steps
    # in format of run chart data
    max_time_steps = []
    k = 0
    for i in range(len(metadata[0]["tdms_types"])):
        run_chart_max_time_steps = []
        for j in range(len(metadata[0]["run_charts"])):
            run_chart_max_time_steps.append(len(time_steps[k]))
            k = k + 1
        max_time_steps.append(run_chart_max_time_steps)

    # vartiable matrices are a list of matrices, one for each varible
    # rows are variable values, columns are time
    var_data = []
    inferred_variables = False
    for tdms_type in range(len(metadata[0]["tdms_types"])):
        for run_chart in range(len(metadata[0]["run_charts"])):
            variable_i = []
            for row in range(len(metadata)):
                
                # get run chart data
                run_chart_data = list(metadata[row]["run_charts"][tdms_type].iloc[:,run_chart])

                # extend run chart data by last value
                if len(run_chart_data) < max_time_steps[tdms_type][run_chart]:
                    if arguments.infer_last_value:
                        run_chart_data = run_chart_data + [run_chart_data[-1]] * \
                            (max_time_steps[tdms_type][run_chart] - len(run_chart_data))
                        inferred_variables = True
                    else:
                        print(metadata[row]["tdms_files"][tdms_type])
                        raise TDMSUploadError('Found run chart length discrepancy in file "' +
                            metadata[row]["tdms_files"][tdms_type] + '".  Use inference options' +
                            ' (e.g. --infer-last-value) to correct lengths by inferring data.')
    
                # add run chart to current variable
                variable_i.append(run_chart_data)

            # add variable matrix to list
            var_data.append(variable_i)

    if inferred_variables:
        log("Variables inferred to correct run chart length discrepancies.")

    return var_data

# compute PCA for variables
def compute_PCA (var_data, arguments, log):

    # create pairwise distance matrix, using PCA or landmarks if available
    var_dist = []
    for i in range(len(var_data)):

        # compute PCA using sklearn
        pca = PCA(n_components=arguments.num_PCA_comps)
        try:
            dist_i = pca.fit_transform(var_data[i])
        except ValueError:
            raise TDMSUploadError("Could not perform PCA, too few components.")

        # save PCA projections
        var_dist.append(dist_i)

    return var_dist

# write data to given output directory
def write_dac_gen(meta_col_names, meta_rows, meta_var_names, meta_vars, 
            time_steps, var_data, var_dist, arguments):

    # create output directory if it doesn't already exist
    if os.path.exists(arguments.output_zip_file):
        log('Warning: overwriting .zip file "' + arguments.output_zip_file + '".')

    # write out zip file
    with ZipFile(arguments.output_zip_file, "w") as zip_file:

        # convert metadata table to string
        metadata_table = ','.join(meta_col_names) + "\n" + mat2str(meta_rows)

        # write out metadata table as "datapoints.dac"
        zip_file.writestr("datapoints.dac", metadata_table)

        # convert units table to string
        units_table = ','.join(meta_var_names) + '\n' + mat2str(meta_vars)

        # write out variables units table
        zip_file.writestr(os.path.join("var","variables.meta"), units_table)
        
        # write out pca.csv file with number of components
        zip_file.writestr("pca.csv", str(arguments.num_PCA_comps))
        
        # write out times/variables/distances
        num_vars = len(time_steps)
        for i in range(num_vars):

            # convert time steps to string
            time_i = time_steps[i]
            time_i = ','.join([str(time_i[j]) for j in range(len(time_i))])

            # write out to zip file as time/variable_i
            zip_file.writestr(os.path.join("time","variable_" + str(i+1) + ".time"), time_i)

            # write out variable data to zip file
            zip_file.writestr(os.path.join("var","variable_" + str(i+1) + ".var"), 
                mat2str(var_data[i]))

            # write out variable distances to zip file
            zip_file.writestr(os.path.join("dist","variable_" + str(i+1) + ".dist"), 
                mat2str(var_dist[i]))

    log('Output written to .zip file "' + arguments.output_zip_file + '".')

# helper function to convert a matrix to a comma separatedstring
def mat2str (mat):

    return '\n'.join([','.join([str(mat[j][k]).strip()
        for k in range(len(mat[j]))])
        for j in range(len(mat))])

# check arguments and create model
def create_model(arguments, log):

    # can't have both overvoltage and sprytron
    if arguments.overvoltage and arguments.sprytron:
        raise TDMSUploadError("Can't use both overvoltage and sprytron options " +
              "together. Please select one or the other and try again.")

    # check if zip file is correctly
    if not arguments.output_zip_file.endswith(".zip"):
        raise TDMSUploadError ('Must use .zip extension on output file name.')

    # organize tdms files
    metadata = catalog_tdms_files(arguments, log)

    # screen columns according to user input
    run_chart_matches = RUN_CHART_MATCHES
    if arguments.use_run_charts is not None:
        run_chart_matches = arguments.use_run_charts

    # report on run charts being used
    log("Using run charts in: " + str(run_chart_matches))

    # read tdms data
    metadata = read_tdms_files(metadata, run_chart_matches, log)

    # construct metadata table
    meta_col_names, meta_rows = read_metadata_table(metadata, arguments, log)

    # construct units table
    meta_var_names, meta_vars = read_units_table(metadata, arguments, log)

    # construct time matrix
    time_steps = read_timesteps (metadata)
    
    # construct variable matrices
    var_data = read_variable_matrices (metadata, time_steps, arguments, log)

    # compute PCA representation
    var_dist = compute_PCA (var_data, arguments, log)
    
    # save files
    write_dac_gen(meta_col_names, meta_rows, meta_var_names, meta_vars, 
                  time_steps, var_data, var_dist, arguments)

    # add output file for dac_gen script
    dac_gen_args = Namespace(**vars(arguments), **{'dac_gen_zip': arguments.output_zip_file})

    # push model using dac_gen
    dac_gen.upload_model(dac_gen_args, log)

    # should we erase the .zip file created
    if arguments.clean_up_output:
        os.remove(arguments.output_zip_file)
        log('Deleted file "' + arguments.output_zip_file + '".')

# logging is just printing to the screen
def log (msg):
    print(msg)

# set up argument parser
def parser ():

    # provide additional command line arguments for TDMS files
    parser = slycat.web.client.ArgumentParser(description=
        "Creates a Dial-A-Cluster model using run charts from .tdms files.")

    # input data directory
    parser.add_argument("input_data_dir", 
        help='Directory containing .tdms output files, organized ' +
             'according to part number.')
    parser.add_argument("part_num",
        help='Part number to use when creating run chart model.')

    # output file for dac generic format, mandatory
    parser.add_argument("output_zip_file",
        help="Output file name for writing dac generic format of the run " +
             " chart model.  If it already exists it will be overwritten.")

    # delete output file after successful model creation
    parser.add_argument("--clean-up-output", action="store_true",
        help="Delete output .zip file after successful model creation).")

    # model and project names/descriptions
    parser.add_argument("--marking", default="ouo3", 
        help="Marking type.  Default: %(default)s")
    parser.add_argument("--model-description", default="", 
        help="New model description.  Default: %(default)s")
    parser.add_argument("--model-name", default="DAC Run Chart Model", 
        help="New model name.  Default: %(default)s")
    parser.add_argument("--project-description", default="", 
        help="New project description.  Default: %(default)s")
    parser.add_argument("--project-name", default="DAC Run Chart Models", 
        help="New project name.  Default: %(default)s")

    # spyrton/overvoltage parameters
    parser.add_argument("--overvoltage", action="store_true",
        help="Expecting overvoltage data.")
    parser.add_argument("--sprytron", action="store_true",
        help="Expecting sprytron data.")

    # run-chart file selection
    parser.add_argument('--tdms-file-matches', nargs="+", choices=TDMS_MATCHES,
        help='Use specified file matches to filter TDMS files, ' + 
             'defaults to full list of choices.')
    parser.add_argument("--use-run-charts", nargs="+", choices=RUN_CHART_MATCHES,
        help="Use specified variables for run-charts, otherwise run-charts " + 
             "are inferred from non-constant values.")

    # inferring data
    parser.add_argument("--do-not-infer-chart-units", action="store_true",
        help="Do not infer run chart units. Default is to infer units " +
             "from variable name.")
    parser.add_argument("--infer-last-value", action="store_true", 
        help="Fill out short run charts with last given value.")

    # exclude XML by default
    parser.add_argument("--include_configuration_XML", action="store_true",
        help='Include "Configuration Data XML" if present in data.')

    # compute using PCA model
    parser.add_argument("--num-PCA-comps", default=10, type=int,
        help="Number of PCA components to use, integer >= 2.  " +
             "Default: %(default)s")

    return parser

# tdms entry point
def main():

    # set up argument parser
    run_chart_parser = parser()  

    # get user arguments
    arguments = run_chart_parser.parse_args()

    # check arguments and create model
    create_model(arguments, log)

# command line version to load a single DAC model
if __name__ == "__main__":

    main()
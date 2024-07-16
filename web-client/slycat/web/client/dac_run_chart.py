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

# common tdms operations
import slycat.web.client.dac_tdms_util as dac_tdms_util
from slycat.web.client.dac_tdms_util import TDMSUploadError

# file name manipulation
import os

# manipulating command line arguments
from argparse import Namespace

# processing tables
import numpy as np
from natsort import natsorted
from copy import deepcopy

# compute PCA with sklearn
from sklearn.decomposition import PCA

# reading tdms files
import nptdms
import pandas as pd

# output zip file
from zipfile import ZipFile

# the group run chart variables allowed
RUN_CHART_MATCHES = ['TAD', 'Rp', 'Ip', 'DBV']
RUN_CHART_UNITS = ['nsec', 'kOhms', 'Amps', 'V']

# organize tdms files based on command line inputs
def catalog_tdms_files (arguments, log):

    # read all meta data before further run chart specific filtering
    metadata = dac_tdms_util.catalog_tdms_files(arguments, log)

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

    # tally suffixes used
    suffixes = set()
    for data in metadata:
        for suffix in data['include_suffixes']:
            suffixes.add(suffix)

    # sort suffixes
    suffixes = list(suffixes)
    suffixes.sort()

    # check any combined suffixes
    if arguments.combine:
        for i in range(len(arguments.combine)):
            combine_i = arguments.combine[i]

            # check that each combined run chart is at least a pair
            if len(combine_i) < 2:
                raise TDMSUploadError("--combine flag used with less than two TDMS suffixes, " + 
                    "please try again with at least two suffixes.")

            # check that combinations are in list of suffixes
            for j in range(len(combine_i)):
                if combine_i[j] not in suffixes:
                    raise TDMSUploadError('TDMS file suffix "' + combine_i[j] +
                        '" to combine was not found in the data directory.')
                
    # keep track of what we are including/excluding
    if arguments.exclude:
        log("Excluding TDMS file suffixes:")
        for suffix in arguments.exclude:
            log("\t%s" % suffix)

    log("Including TDMS file suffixes:")
    for suffix in suffixes:
        log("\t%s" % suffix)

    return metadata 

# read all tdms run chart data
def read_tdms_files(metadata, run_chart_matches, log):

    # go through each row in the table
    skipped_rows = np.zeros(len(metadata))
    for row in range(len(metadata)):

        root_properties = []
        run_charts = []
        shot_numbers = []
        module_ID = []
        module_SN = []
        module_ID_SN = []
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
                        raise TDMSUploadError('Group headers in file "' + tdms_file_name + 
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

                # check that run charts have enough data
                if any(pd.notna(numeric_group_df[header_matches]).sum()==0):
                    log('Incomplete run chart data found for "' + tdms_file_path + '" -- ' +
                        'skipping directory "' + metadata[row]["source"] + '".')
                    skipped_rows[row] = 1

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

                    # also save shot numbers
                    shot_numbers.append(group_df["Shot Number"])

                    # check for module SN
                    module_ID_i = check_module_col(group_df, "Module ID", tdms_file_path, log)
                    module_ID.append(module_ID_i)
                    module_SN_i = check_module_col(group_df, "Module SN", tdms_file_path, log)
                    module_SN.append(module_SN_i)
                    module_ID_SN.append("/".join([str(module_ID_i), str(module_SN_i)]))

        # add to metadata
        metadata[row]["root_properties"] = root_properties
        metadata[row]["run_charts"] = run_charts
        metadata[row]["run_chart_headers"] = run_chart_headers
        metadata[row]["shot_numbers"] = shot_numbers
        metadata[row]["module_ID"] = module_ID
        metadata[row]["module_SN"] = module_SN
        metadata[row]["module_ID_SN"] = module_ID_SN

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

# check for constant module ID/SN column
def check_module_col (group_df, header, tdms_file_path, log):

    # check for module ID
    if header not in group_df.columns:
        log(header + ' not found for "' + tdms_file_path + '" -- using NaN value.')
        module_ID_i = "NaN"

    # check that module ID is constant
    else:
        module_ID_i = group_df[header][0]
        for module_ID_j in group_df[header]:
            if module_ID_i != module_ID_j:
                log('Inconsistent ' + header + ' for "' + tdms_file_path + 
                    '" -- using NaN value.')
                module_ID_i = "NaN"

    return module_ID_i

# fill in metadata table
def read_metadata_table (metadata, arguments, log):

    # go through once to check that column names are the same
    root_head = list(metadata[0]["root_properties"][0].columns)
    for i in range(len(metadata)):
        root_props = metadata[i]["root_properties"]
        
        # check if root properties have same header
        for j in range(len(root_props)):
        
            root_props_j = list(root_props[j].columns)
            if root_props_j != root_head:
                
                # switch to longer root header
                if len(root_props_j) > len(root_head):
                    root_head = root_props_j
                    
    # remove shorter root headers?
    for i in reversed(range(len(metadata))):
        root_props = metadata[i]["root_properties"]

        # is it a short root header?
        delete_i = False
        for j in range(len(root_props)):
        
            root_props_j = list(root_props[j].columns)
            if root_props_j != root_head:
               
                # fill in missing columns with NaNs
                for k in range(len(root_head)):
                    if root_head[k] not in root_props_j:
                        root_props[j][root_head[k]] = np.nan

                log ('Found TDMS file with inconsistent root property header: "' +
                     metadata[i]["source"] + '" for "' + metadata[i]["tdms_types"][j] + 
                    '" -- using NaN values for missing columns.')
                delete_i = True
        
        # delete entry for any short headers
        # if delete_i:
        #     metadata.pop(i)

    # go through and get constant values
    constants = np.ones(len(root_head))
    for i in range(len(metadata)):
        root_props = metadata[i]["root_properties"]

        # check for constant values/nans
        for k in range(len(root_head)):
        
            const_val = root_props[0].iloc[0][root_head[k]]     
            for j in range(len(root_props)):
            
                # check for constant value
                curr_val = root_props[j].iloc[0][root_head[k]]
                if curr_val != const_val:
                    constants[k] = 0

    # collect constant/variable/nan columns
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
    meta_column_names = ['Part', 'Lot', 'Batch', 'Serial Number', 'Source']
    for tdms_type in metadata[0]["tdms_types"]:
        meta_column_names += ['Module ID [' + tdms_type + ']']
    for tdms_type in metadata[0]["tdms_types"]:
        meta_column_names += ['Module SN [' + tdms_type + ']']
    for tdms_type in metadata[0]["tdms_types"]:
        meta_column_names += ['Module ID/SN [' + tdms_type + ']']
    meta_column_names += const_cols
    for tdms_type in metadata[0]["tdms_types"]:
        meta_column_names += [header + " [" + tdms_type + "]" for header in var_cols]

    # construct metadata table rows
    meta_rows = []
    for row in range(len(metadata)):

        # data from file names
        meta_row = [metadata[row]["part"], metadata[row]["lot"], metadata[row]["batch"],
            metadata[row]["sn"], metadata[row]["source"]]
        
        # module IDs/SNs
        meta_row += metadata[row]["module_ID"] + metadata[row]["module_SN"] + \
                    metadata[row]["module_ID_SN"]

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
    meta_units = dict()
    var_inds = dict()
    ind = 0
    for tdms_type in range(len(metadata[0]["tdms_types"])):
        for run_chart in metadata[0]["run_chart_headers"][tdms_type]:

            # name of run chart
            rc_name = run_chart + " [" + metadata[0]["tdms_types"][tdms_type] + "]"

            # units, default inferred
            units = "Not Given"
            if not arguments.do_not_infer_chart_units:
                units = RUN_CHART_UNITS[RUN_CHART_MATCHES.index(run_chart)]
            
            # construct row of table
            if arguments.curve:
                meta_vars.append([rc_name, 'Shot', units, 'Curve'])
            else:
                meta_vars.append([rc_name, 'Shot', units, 'Scatter'])

            # keep track of units for each tdms type
            meta_units[metadata[0]["tdms_types"][tdms_type]] = units

            # keep track of indices for variables
            var_inds[rc_name] = ind

            # next row
            ind = ind + 1

    # add any combined curves
    rc_inds = []
    if arguments.combine:

        # go through each combination and construct each run chart
        for i in range(len(arguments.combine)):

            # document combinations
            log("Combining TDMS types: " + str([j for j in arguments.combine[i]]))
            
            # get units
            combine_i = arguments.combine[i]
            units = meta_units[combine_i[0]]

            # check that units are the same for each TDMS type in combination
            combined_headers = []
            for j in range(len(combine_i)):
                if meta_units[combine_i[j]] != units:
                    raise TDMSUploadError('Inconsistent units found between combined TDMS types "' +
                        str(combine_i) + ".")
                combined_headers.append(combine_i[j])
            
            # truncate headers to first word or combine_length
            trunc_headers = []
            for j in range(len(combined_headers)):
                trunc_header = combined_headers[j].split()[0]
                trunc_header = trunc_header[0:arguments.combine_length]
                trunc_headers.append(trunc_header)
            combined_header = '/'.join(trunc_headers)

            # make a row for each run chart
            for run_chart in metadata[0]["run_chart_headers"][tdms_type]:
                rc_name = run_chart + " [" + combined_header + "]"
                if arguments.curve:
                    meta_vars.append([rc_name, 'Shot', units, 'Curve'])
                else:
                    meta_vars.append([rc_name, 'Shot', units, 'Scatter'])
                
                # keep track of indices into variables for combinations
                rc_inds_row = []
                for j in range(len(combined_headers)):
                    rc_inds_row.append(var_inds[run_chart + " [" + combined_headers[j] + "]"])
                rc_inds.append(rc_inds_row)

    # note if we inferred units
    if not arguments.do_not_infer_chart_units:
        log('Inferred run chart units from names.')

    return meta_var_names, meta_vars, rc_inds

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

# construct shot numbers vectors instead of time steps
def read_shot_numbers (metadata):

    # go through data and construct shot number unions
    shot_numbers = []
    for row in range(len(metadata)):

        # combine shot numbers (union)
        if row == 0:
            shot_numbers = [set(metadata[row]["shot_numbers"][tdms_type]) for
            tdms_type in range(len(metadata[0]['tdms_types']))]
        else:
            shot_numbers = [shot_numbers[tdms_type].union(
                set(metadata[row]["shot_numbers"][tdms_type])) for
                tdms_type in range(len(metadata[0]['tdms_types']))]

    # sort resulting shot numbers using natural sort
    shot_numbers = [[natsorted(list(shot_numbers[tdms_type]))] * 
        len(metadata[0]["run_chart_headers"][tdms_type]) for 
        tdms_type in range(len(metadata[0]['tdms_types']))]

    return shot_numbers

# construct variable matrices
def read_variable_matrices (metadata, time_steps, arguments, log):

    # put maximum number of time steps
    # in format of run chart data
    max_time_steps = []
    k = 0
    for i in range(len(metadata[0]["tdms_types"])):
        run_chart_max_time_steps = []
        for j in range(len(metadata[0]["run_chart_headers"][i])):
            run_chart_max_time_steps.append(len(time_steps[k]))
            k = k + 1
        max_time_steps.append(run_chart_max_time_steps)

    # variable matrices are a list of matrices, one for each variable
    # rows are variable values, columns are time
    var_data = []
    var_data_nan = []
    inferred_variables = False
    for tdms_type in range(len(metadata[0]["tdms_types"])):
        for run_chart in range(len(metadata[0]["run_chart_headers"][tdms_type])):
            variable_i = []
            variable_i_nan = []
            for row in range(len(metadata)):
                
                # get run chart data
                run_chart_data = list(metadata[row]["run_charts"][tdms_type].iloc[:,run_chart])
                run_chart_data_nan = list(metadata[row]["run_charts"][tdms_type].iloc[:,run_chart])

                # check for NaN values
                if np.isnan(run_chart_data).any():
                    log('Skipping NaN values in file "' + metadata[row]["tdms_files"][tdms_type] +
                        '" run chart "' + metadata[row]["run_charts"][tdms_type].columns[run_chart] + '".')
                    
                    # skip NaN values (we already checked that there 
                    # are some non-nan values when first reading tdms files)
                    run_chart_data = [x for x in run_chart_data if not np.isnan(x)]
                    run_chart_data_nan = [x for x in run_chart_data_nan if not np.isnan(x)]

                # extend run chart data by last value
                if len(run_chart_data) < max_time_steps[tdms_type][run_chart]:
                    if arguments.infer_last_value:
                        run_chart_data = run_chart_data + [run_chart_data[-1]] * \
                            (max_time_steps[tdms_type][run_chart] - len(run_chart_data))
                        run_chart_data_nan = run_chart_data_nan + [np.nan] * \
                            (max_time_steps[tdms_type][run_chart] - len(run_chart_data_nan))
                        inferred_variables = True
                    else:
                        raise TDMSUploadError('Found run chart length discrepancy in file "' +
                            metadata[row]["tdms_files"][tdms_type] + '".  Use inference options' +
                            ' (e.g. --infer-last-value) to correct lengths by inferring data.')
    
                # add run chart to current variable
                variable_i.append(run_chart_data)
                variable_i_nan.append(run_chart_data_nan)

            # add variable matrix to list
            var_data.append(variable_i)
            var_data_nan.append(variable_i_nan)

    if inferred_variables:
        log("Variables inferred to correct run chart length discrepancies.")

    return var_data, var_data_nan

# get variables for shot numbers
def read_variable_shot_matrices (metadata, shot_numbers, combined_inds, arguments, log):

    # put maximum number of shots
    # in format of run chart data
    max_shot_numbers = []
    for i in range(len(shot_numbers)):
        run_chart_max_shot_numbers = []
        for j in range(len(shot_numbers[i])):
            run_chart_max_shot_numbers.append(len(shot_numbers[i][j]))
        max_shot_numbers.append(run_chart_max_shot_numbers)

    # variable matrices are number variables by number files by number shots
    # when using shot numbers var data will almost certainly contain NaNs
    # however, we still need inferred variables for PCA
    var_data = []
    var_data_nan = []
    inferred_variables = False
    for tdms_type in range(len(metadata[0]["tdms_types"])):
        for run_chart in range(len(metadata[0]["run_chart_headers"][tdms_type])):

            variable_i = []
            variable_i_nan = []
            for row in range(len(metadata)):

                # get run chart data
                run_chart_data = list(metadata[row]["run_charts"][tdms_type].iloc[:,run_chart])
                run_chart_shots = metadata[row]["shot_numbers"][tdms_type]

                # fill out run chart data with NaNs
                run_chart_data_nan = np.empty ((max_shot_numbers[tdms_type][run_chart]))
                run_chart_data_nan[:] = np.nan

                # replace known entries with numbers
                for i in range(len(run_chart_shots)):
                    run_chart_data_nan[shot_numbers[tdms_type][run_chart].index(
                        run_chart_shots[i])] = run_chart_data[i]

                # infer variables for NaN values
                run_chart_data = np.copy(run_chart_data_nan)
                mask = np.isnan(run_chart_data)
                if any(mask):
                    if arguments.infer_last_value:
                        run_chart_data[mask] = np.interp(np.flatnonzero(mask), 
                            np.flatnonzero(~mask), run_chart_data[~mask])
                        inferred_variables = True
                    else:
                        raise TDMSUploadError('Found run chart length discrepancy in file "' +
                            metadata[row]["tdms_files"][tdms_type] + '".  Use inference options' +
                            ' (e.g. --infer-last-value) to correct lengths by inferring data.')

                # add run chart to current variable
                variable_i.append(run_chart_data.tolist())
                variable_i_nan.append(run_chart_data_nan.tolist())

            # add variable matrix to list
            var_data.append(variable_i)
            var_data_nan.append(variable_i_nan)

    # we also have to convert time steps to numbers (e.g. strip a/b/c values)
    if not arguments.highlight_shot_numbers:
        shot_numbers = strip_abc(shot_numbers)
    
    # otherwise we convert as nan values 
    else:
        shot_numbers = convert_abc(shot_numbers)

    time_steps = []
    for i in range(len(shot_numbers)):
        time_steps = time_steps + shot_numbers[i]

    if inferred_variables:
        log("Variables inferred to correct run chart shot number discrepancies.")
    
    # add combined variables, if requested
    if arguments.combine:

        # go through each combination to extend matrices
        for i in range(len(combined_inds)):
            combined_time_steps = []
            combine_i = combined_inds[i]

            # check that time steps are non-intersecting
            for j in range(len(combine_i)):
                if time_steps[combine_i[j]] not in combined_time_steps:
                    combined_time_steps += time_steps[combine_i[j]]
                else:
                    raise TDMSUploadError('Shot number intersection for combined TDMS types, ' +
                        'please try a different combination.')

            # check that time steps are in order
            if sorted(combined_time_steps) != combined_time_steps:
                raise TDMSUploadError('Shot numbers are out of order for combined TDMS types, ' +
                    'please try a different combination order.')

            # add combined_time_steps to time steps matrix
            time_steps.append(combined_time_steps)

            # add variables to variable matrices
            combined_var_data = deepcopy(var_data[combine_i[0]])
            combined_var_data_nan = deepcopy(var_data_nan[combine_i[0]])
            for j in range(1, len(combine_i)):
                for k in range(len(combined_var_data)):
                    combined_var_data[k] = combined_var_data[k] + var_data[combine_i[j]][k]
                    combined_var_data_nan[k] = combined_var_data_nan[k] + var_data_nan[combine_i[j]][k]
                                                                                       
            # append combined matrix to variable matrices
            var_data.append(combined_var_data)
            var_data_nan.append(combined_var_data_nan)

    return var_data, var_data_nan, time_steps

# helper function for read_variable_shot_matrices
# converts strings to integers and converts a/b/c to fractions
# for example '31' would be 31 and '31a' would be 31.25
def strip_abc(item):

    if isinstance(item, list):
        return [strip_abc(x) for x in item]
    
    else:
        if item[-1] in ['a', 'b', 'c']:

            # convert 'a' to 1/4, 'b' to 1/2, 'c' to 3/4
            suffix = (['a', 'b', 'c'].index(item[-1]) + 1)/4

            try:
                return int(item[:-1]) + suffix
            except:
                raise ValueError ("Shot number not an integer.")
        else:

            try:
                return int(item)
            except:
                raise ValueError ("Shot number not an integer.")

# helper function for read_variable_shot_matrices
# converts strings to integers and converts a/b/c to nan
def convert_abc(item):

    if isinstance(item, list):
        return [convert_abc(x) for x in item]
    
    else:
        if item[-1] in ['a', 'b', 'c']:
            return np.nan
        
        else:

            try:
                return int(item)
            except:
                raise ValueError ("Shot number not an integer.")

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

    return '\n'.join([','.join([str(mat[j][k]).replace('\n', ' ').replace('\r', '').strip()
        for k in range(len(mat[j]))])
        for j in range(len(mat))])

# check arguments and create model
def create_model(arguments, log):

    # if you have --curve, you must also have --plot-last-value
    if arguments.curve:
        if not arguments.plot_last_value:
            raise TDMSUploadError('Must use "--plot-last-value" with "--curve".')
        
    # if you have --highlight-shot-numbers, you also have to have --use-shot-numbers
    if arguments.highlight_shot_numbers:
        if not arguments.use_shot_numbers:
            raise TDMSUploadError('Must use "--use-shot-numbers" with "--highlight-shot-numbers".')
    
    # if you have --combine, you must also have --use-shot-numbers
    if arguments.combine:
        if not arguments.use_shot_numbers:
            raise TDMSUploadError('Must use "--use-shot-numbers" with "--combine".')

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
    meta_var_names, meta_vars, combined_inds = read_units_table(metadata, arguments, log)

    # construct time/variable data
    if arguments.use_shot_numbers:
        shot_numbers = read_shot_numbers(metadata)
        var_data, var_data_nan, time_steps = \
            read_variable_shot_matrices (metadata, shot_numbers, combined_inds, arguments, log)
    else:
        time_steps = read_timesteps(metadata)
        var_data, var_data_nan = read_variable_matrices (metadata, time_steps, arguments, log)

    # compute PCA representation
    var_dist = compute_PCA (var_data, arguments, log)
    
    # save files, use nans in plot if requested
    if arguments.plot_last_value:
        write_dac_gen(meta_col_names, meta_rows, meta_var_names, meta_vars, 
                    time_steps, var_data, var_dist, arguments)
    else:
        write_dac_gen(meta_col_names, meta_rows, meta_var_names, meta_vars, 
                    time_steps, var_data_nan, var_dist, arguments)

    # add output file for dac_gen script
    dac_gen_args = Namespace(**vars(arguments), **{'dac_gen_zip': arguments.output_zip_file})

    # push model using dac_gen
    if not arguments.do_not_upload:
        mid = dac_gen.upload_model(dac_gen_args, log)

        # supply the user with a direct link to the new model.
        host = arguments.host
        if arguments.port:
            host = host + ":" + arguments.port
        log("Your new model is located at %s/models/%s" % (host, mid))
        log('***** DAC Model Successfully Created *****')

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

    # input consists of tdms batch format or tdms file
    group = parser.add_mutually_exclusive_group(required=True)

    group.add_argument("--input-tdms-glob", nargs=2,
        help="Use tdms directory glob format as input, first argument is directory, organized by " +
             "part and lot as on the production server; second argument is part_num_match, speficied with " +
             'a unix glob using wildcards, for example "XXXXXX*", or "XXXXXX_XX*". ' + 
             'Note you should use "" in Unix to pass wildcards. Produces one run chart per directory.')

    # input tdms batches
    group.add_argument("--input-tdms-batches", nargs=3, 
        help="Use tdms batch format as input, first argument is directory, organized by part and lot " +
             'as on the production server; second argument is part_lot, e.g. "XXXXXX_XX", ' +
             'where part and lot numbers should be constant; and third argument is batches, ' +
             'e.g. "1,3,4-6,11-24".  Use "*" to designate all batches. Produces ' + 
             "one run chart per directory.")

    # input tdms directory
    group.add_argument("--input-tdms-dir", nargs=1,
        help="Use all .tdms files in root directory as input. Produces one run chart per " +
             "subdirectory found containing .tdms files.")

    # output file for dac generic format, mandatory
    parser.add_argument("output_zip_file",
        help="Output file name for writing dac generic format of the run " +
             " chart model.  If it already exists it will be overwritten.")

    # delete output file after successful model creation
    parser.add_argument("--clean-up-output", action="store_true",
        help="Delete output .zip file after successful model creation.")

    # do not upload to slycat
    parser.add_argument("--do-not-upload", action="store_true",
        help="Do not upload to slycat server.")

    # model and project names/descriptions
    parser.add_argument("--marking", default="cui", 
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
    parser.add_argument("--use-run-charts", nargs="+", choices=RUN_CHART_MATCHES,
        help="Use specified variables for run-charts, otherwise run-charts " + 
             "are inferred from non-constant values.")

    # inferring data
    parser.add_argument("--do-not-infer-chart-units", action="store_true",
        help="Do not infer run chart units. Default is to infer units " +
             "from variable name.")
    parser.add_argument("--infer-last-value", action="store_true", 
        help="Fill out short run charts with last given value.")
    parser.add_argument("--plot-last-value", action="store_true",
        help="Plot filled values in run charts.")
    
    # exclude XML by default
    parser.add_argument("--include_configuration_XML", action="store_true",
        help='Include "Configuration Data XML" if present in data.')

    # compute using PCA model
    parser.add_argument("--num-PCA-comps", default=10, type=int,
        help="Number of PCA components to use, integer >= 2.  " +
             "Default: %(default)s")

    # exclude .tdms files
    parser.add_argument("--exclude", nargs="+",
        help='TDMS file suffixes to exclude. ' + 
             'If you want suffixes that include spaces, use quotes, ' +
             'e.g. "suffix with space".')

    # use curve plots for run charts
    parser.add_argument("--curve", action="store_true",
        help="Use curves for run charts instead of scatter plots.")

    # use shot numbers to line up plots
    parser.add_argument('--use-shot-numbers', action="store_true",
        help="Use actual shot numbers (default is to use shot number order only).")
    
    # add vertical lines to indicate non-numeric time steps
    parser.add_argument('--highlight-shot-numbers', action="store_true",
        help="Highlight non-numeric a/b/c shot numbers using vertical lines, otherwise they "+
             "are converted to values of (.25, .5, .75).")
    
    
    # combination time series
    parser.add_argument('--combine', nargs="+", action="append",
        help="Concatenate TDMS suffixes into a single run chart, e.g. " +
             '--combine "Acceptance Trigger Operation" "Factory Trigger Operation" ' +
             "would concatenate the run charts from those two TDMS shots into " +
             "a single run chart.  Can be use multiple times with different TDMS files.")
    parser.add_argument('--combine-length', default=10, type=int,
        help="Truncation length for each header in combined header.  Truncates to first " +
              'word or "--combine-length", whichever is less).')
    
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
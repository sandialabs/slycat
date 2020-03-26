# This script imports PTS zip files for DAC.  It is modified from
# the slycat-csv-parser.  This parser uploads a PTS CSV/META zip
# file then pushes the stored files to the previous CSV/META parsers.
#
# S. Martin
# 7/14/2017

import csv
import numpy
from scipy import spatial
import slycat.web.server
import slycat.email
import cherrypy

# zip file manipulation
import io
import zipfile
import os

# background thread does all the work on the server
import threading
import sys
import traceback

# for dac_compute_coords.py and dac_upload_model.py
import imp

# CSV file parser
def parse_csv(file):

    """
    parses out a csv file into numpy array by column (data), the dimension meta data(dimensions),
    and sets attributes (attributes)
    :param file: csv file to be parsed
    :returns: attributes, dimensions, data
              this version parses in memory so only returns data, no attributes or dimensions
    """

    def isfloat(value):
        try:
            float(value)
            return True
        except ValueError:
            return False

    rows = [row for row in csv.reader(file.decode().splitlines(), delimiter=",", doublequote=True,
            escapechar=None, quotechar='"', quoting=csv.QUOTE_MINIMAL, skipinitialspace=True)]

    if len(rows) < 2:

        # use a row of zeros for an empty file
        # attributes = []
        data = []
        for column in zip(*rows):
            # attributes.append({"name":column[0], "type":"float64"})
            data.append([0])
        # dimensions = [{"name":"row", "type":"int64", "begin":0, "end":1}]

        # old code:
        # slycat.email.send_error("slycat-csv-parser.py parse_file", "File must contain at least two rows.")
        # raise Exception("File must contain at least two rows.")

    else:

        # attributes = []
        # dimensions = [{"name":"row", "type":"int64", "begin":0, "end":len(rows[1:])}]
        data = []

        # go through the csv by column
        for column in zip(*rows):
            column_has_floats = False

            # start from 1 to avoid the column name
            for value in column[1:]:
                if isfloat(value):
                    column_has_floats = True
                try: # note NaN's are floats
                    output_list = ['NaN' if x=='' else x for x in column[1:]]
                    data.append(numpy.array(output_list).astype("float64"))
                    # attributes.append({"name":column[0], "type":"float64"})

                # could not convert something to a float defaulting to string
                except Exception as e:
                    column_has_floats = False
                    cherrypy.log.error("found floats but failed to convert, switching to string types Trace: %s" % e)
                break

            if not column_has_floats:
                data.append(numpy.array(column[1:]))
                # attributes.append({"name":column[0], "type":"string"})

        # if len(attributes) < 1:
        #     slycat.email.send_error("slycat-csv-parser.py parse_file", "File must contain at least one column.")
        #     raise Exception("File must contain at least one column.")

    return data # attributes, dimensions, data


# this is the parser for the very specific format of the .ini files in the META directory
def parse_meta(file):

    """
    parses out a csv file into numpy array by column (data), the dimension meta data(dimensions),
    and sets attributes (attributes)
    :param file: csv file to be parsed
    :returns: attributes, dimensions, data
    """

    # parse file one row at a time
    rows = file.decode().splitlines()
    data = []
    for i in range(0,len(rows)):

        # keep prefixes
        if "[" in rows[i]:
            prefix = rows[i][0:5] + "]"

        # check line for one equal sign
        row_data = rows[i].split("=")
        if (len(row_data) == 2):
            row_data[0] = row_data[0].translate(str.maketrans('','','"'))
            row_data[1] = row_data[1].translate(str.maketrans('','','"'))
            data.append((prefix + row_data[0], row_data[1]))

        # discard waveform_conversion information
        if rows[i] == "[waveform_conversion]":
            break

    # however many rows by 2 columns
    # dimensions = [dict(name="row", end=len(data)),
    #     dict(name="column", end=2)]

    # attributes are the same for matrices and vectors
    # attributes = [dict(name="value", type="string")]

    return data # attributes, dimensions, data


# update dac-parse-log
def update_parse_log (database, model, parse_error_log, error_type, error_string):

    parse_error_log.append(error_string)
    slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                          [error_type, "\n".join(parse_error_log)])

    return parse_error_log


def parse_zip(database, model, input, files, aids, **kwargs):

    """
    uploads a PTS CSV/META zip file and passes the CSV/META files
    to the previous CSV/META parsers to be uploaded to the database
    :param database: slycat.web.server.database.couchdb.connect()
    :param model: database.get("model", self._mid)
    :param input: boolean
    :param files: files to be parsed
    :param aids: normally artifact ID, but we are using it as [csv parms, dig parms],
                 where csv parms is number of csv files to require, and digitizer parms
                 is number of digitizers to require (see wizard)
    :param kwargs:
    """

    cherrypy.log.error("DAC PTS Zip parser started.")

    # keep a parsing error log to help user correct input data
    # (each array entry is a string)
    parse_error_log = update_parse_log(database, model, [], "Progress", "Notes:")

    # get parameters to eliminate likely unusable PTS files
    CSV_MIN_SIZE = int(aids[0])
    MIN_NUM_DIG = int(aids[1])

    # push progress for wizard polling to database
    slycat.web.server.put_model_parameter(database, model, "dac-polling-progress", ["Extracting ...", 10.0])

    # treat uploaded file as bitstream
    try:

        file_like_object = io.BytesIO(files[0])
        zip_ref = zipfile.ZipFile(file_like_object)
        zip_files = zip_ref.namelist()

    except Exception as e:

        # couldn't open zip file, report to user
        slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                              ["Error", "couldn't read .zip file (too large or corrupted)"])

        # record no data message in front of parser log
        parse_error_log = update_parse_log(database, model, parse_error_log, "No Data",
                                           "Error -- couldn't read .zip file (too large or corrupted).")

        # print error to cherrypy.log.error
        cherrypy.log.error(traceback.format_exc())

    # loop through zip files and make a list of CSV/META files

    csv_files = []
    csv_no_ext = []

    meta_files = []
    meta_no_ext = []

    for zip_file in zip_files:

        # parse files in list
        head, tail = os.path.split(zip_file)

        # check for CSV or META file
        if head == "CSV":

            # check for .csv extension
            if tail != "":

                ext = tail.split(".")[-1]
                if ext == "csv":
                    csv_files.append(zip_file)
                    csv_no_ext.append(tail.split(".")[0])
                else:
                    slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                                         ["Error", "CSV files must have .csv extension"])

                    update_parse_log(database, model, parse_error_log, "No Data",
                                     "Error -- CSV files must have .csv extension.")

                    raise Exception("CSV files must have .csv extension.")

        elif head == "META":

            # check for .ini extension
            if tail != "":

                ext = tail.split(".")[-1]
                if ext == "ini":
                    meta_files.append(zip_file)
                    meta_no_ext.append(tail.split(".")[0])
                else:
                    slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                                         ["Error", "META files must have .ini extension"])

                    update_parse_log(database, model, parse_error_log, "No Data",
                                     "Error -- META files must have .ini extension.")

                    raise Exception("META files must have .ini extension.")

        else:

            # not CSV or META file
            slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                                  ["Error", "unexpected file (not CSV/META) found in .zip file"])

            update_parse_log(database, model, parse_error_log, "No Data",
                             "Error -- unexpected file (not CSV/META) found in .zip file.")

            raise Exception("Unexpected file (not CSV/META) found in .zip file.")

    # check that CSV and META files have a one-to-one correspondence
    meta_order = []
    if len(csv_no_ext) == len(meta_no_ext):

        # go through CSV files and look for corresponding META file
        for csv_file in csv_no_ext:

            # get META file index of CSV file
            if csv_file in meta_no_ext:
                meta_order.append(meta_no_ext.index(csv_file))

            else:
                slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                                      ["Error", "CSV and META files do not match."])

                update_parse_log(database, model, parse_error_log, "No Data",
                                 "Error -- CSV and META files do not match.")

                raise Exception("CSV and META files do not match.")

    else:

        # different number of CSV and META files
        slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                              ["Error", "PTS .zip file must have same number of CSV and META files"])

        update_parse_log(database, model, parse_error_log, "No Data",
                         "Error -- PTS .zip file must have same number of CSV and META files.")

        raise Exception("PTS .zip file must have same number of CSV and META files.")

    # re-order meta files to match csv files
    meta_files = [meta_files[i] for i in meta_order]

    stop_event = threading.Event()
    thread = threading.Thread(target=parse_pts_thread, args=(database, model, zip_ref,
                                                             csv_files, meta_files, csv_no_ext, parse_error_log,
                                                             CSV_MIN_SIZE, MIN_NUM_DIG, stop_event))
    thread.start()

def parse_pts_thread (database, model, zip_ref, csv_files, meta_files, files_no_ext, parse_error_log,
                      CSV_MIN_SIZE, MIN_NUM_DIG, stop_event):
    """
    Extracts CSV/META data from the zipfile uploaded to the server
    and processes it/combines it into data in the DAC generic format,
    finally pushing that data to the server.  Problems are described
    and returned to the calling function.
    """

    # put entire thread into a try-except block in order to print
    # errors to cherrypy.log.error
    try:

        # import dac_upload_model from source
        push = imp.load_source('dac_upload_model',
                               os.path.join(os.path.dirname(__file__), 'py/dac_upload_model.py'))

        cherrypy.log.error("DAC PTS Zip thread started.")

        num_files = len(csv_files)

        # get meta/csv data, store as arrays of dictionaries
        # (skip bad/empty files)
        wave_data = []
        table_data = []
        csv_data = []
        dig_id = []
        test_op_id = []
        file_name = []
        table_keys = []
        for i in range(0, num_files):

            # push progress for wizard polling to database
            slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                                  ["Extracting ...", 10.0 + 40.0 * (i + 1.0) / num_files])

            # extract csv file from archive and parse
            data = parse_csv(zip_ref.read(csv_files[i]))
            csv_data_i = data[2:4]

            # check for an empty csv file
            if len(csv_data_i[0]) < CSV_MIN_SIZE:
                parse_error_log = update_parse_log(database, model, parse_error_log, "Progress",
                                       "CSV data file has less than " + str(CSV_MIN_SIZE) +
                                       " entries -- skipping " + files_no_ext[i] + ".")
                continue

            # extract meta file from archive and parse
            data = parse_meta(zip_ref.read(meta_files[i]))

            # make dictionary for wave, table data
            meta_data_i = data
            meta_dict_i = dict(meta_data_i)

            # split into wave/table data
            wave_data_i = {}
            table_data_i = {}
            for j in range(len(meta_data_i)):

                key = meta_data_i[j][0]

                # strip off key prefix to obtain new key
                prefix = key[0:6]
                key_no_prefix = key[6:]

                # ignore [wave] prefix
                if prefix == "[wave]":
                    wave_data_i[key_no_prefix] = meta_dict_i[key]
                else:
                    table_data_i[key_no_prefix] = meta_dict_i[key]

                    # add key to set of all table keys
                    if not key_no_prefix in table_keys:
                        table_keys.insert(j, key_no_prefix)

            # record relevant information for organizing data
            test_op_id.append (int(meta_dict_i["[oper]test_op_inst_id"]))
            dig_id.append (int(meta_dict_i["[wave]WF_DIG_ID"]))

            # record csv data
            csv_data.append(csv_data_i)

            # record meta data as table and wave data
            wave_data.append(wave_data_i)
            table_data.append(table_data_i)

            # record file name origin
            file_name.append(files_no_ext[i])

            # update read progress
            slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                                     ["Extracting ...", 10.0 + 40.0 * (i + 1.0) / num_files])

        # close archive
        zip_ref.close()

        # look for unique test-op ids (these are the rows in the metadata table)
        uniq_test_op, uniq_test_op_clusts = numpy.unique(test_op_id, return_inverse = True)

        # loaded CSV/META data (50%)
        slycat.web.server.put_model_parameter(database, model, "dac-polling-progress", ["Computing ...", 50.0])

        cherrypy.log.error("DAC: screening for consistent digitizer IDs.")

        # screen for consistent digitizer ids
        test_inds = []
        test_dig_ids = []
        dig_id_keys = []
        for i in range(len(uniq_test_op)):

            # get indices for test op clusters
            test_i_inds = numpy.where(uniq_test_op_clusts == i)[0]

            # order indices according to digitizer id
            dig_ids_i = numpy.array(dig_id)[test_i_inds]
            dig_ids_i_sort_inds = numpy.argsort(dig_ids_i)

            test_i_inds = numpy.array(test_i_inds)[dig_ids_i_sort_inds]
            dig_ids_i = numpy.array(dig_id)[test_i_inds]

            # if too few digitizer signals ignore data
            if len(dig_ids_i) < MIN_NUM_DIG:
                parse_error_log = update_parse_log(database, model, parse_error_log, "Progress",
                                       "Less than " + str(MIN_NUM_DIG) +
                                       " time series -- skipping test-op id #"
                                       + str(uniq_test_op[i]) + ".")
                continue

            # store test inds for each row and digitizer ids (sorted)
            test_inds.append(test_i_inds)
            test_dig_ids.append(dig_ids_i)

            # keep track of total number of digitizers
            for j in range(len(dig_ids_i)):
                if not dig_ids_i[j] in dig_id_keys:
                    dig_id_keys.append(dig_ids_i[j])

        cherrypy.log.error("DAC: getting intersecting IDs.")

        # screen for intersecting digitizer ids
        keep_dig_ids = dig_id_keys
        for i in range(len(test_dig_ids)):
            keep_dig_ids = list(set(keep_dig_ids) & set(test_dig_ids[i]))

        # add removed ids to parse error log
        for i in range(len(dig_id_keys)):
            if not dig_id_keys[i] in keep_dig_ids:
                parse_error_log = update_parse_log(database, model, parse_error_log, "Progress",
                                       "Not found in all test ops --- skipping digitizer #" +
                                       str(dig_id_keys[i])+ ".")

        # sort and keep consistent, intersecting digitizer ids
        dig_id_keys = sorted(keep_dig_ids)

        # trim test_inds and dig_ids to according to new ids
        for i in range(len(test_inds)):

            # get previously unculled digitizer ids
            old_dig_ids_i = test_dig_ids[i]
            old_test_inds_i = test_inds[i]

            # construct new indices
            new_test_i_inds = []
            new_dig_ids_i = []

            # remove unused digitizers indices
            for j in range(len(old_dig_ids_i)):
                if old_dig_ids_i[j] in dig_id_keys:
                    new_dig_ids_i.append(old_dig_ids_i[j])
                    new_test_i_inds.append(old_test_inds_i[j])

            # replace in list of indices
            test_inds[i] = new_test_i_inds
            test_dig_ids[i] = new_dig_ids_i

        cherrypy.log.error("DAC: constructing meta data table and variable/time matrices.")

        # screened CSV/META data (55%)
        slycat.web.server.put_model_parameter(database, model, "dac-polling-progress", ["Computing ...", 55.0])

        # construct meta data table and variable/time dictionaries
        meta_column_names = table_keys
        meta_rows = []
        var_data = [[] for key in dig_id_keys]
        time_data = [[] for key in dig_id_keys]
        for i in range(len(test_inds)):

            # get indices for test op
            test_i_inds = test_inds[i]

            # check that table data/wave form data is consistent
            for j in range(len(test_i_inds)):
                if table_data[test_i_inds[j]] != table_data[test_i_inds[0]]:
                    parse_error_log = update_parse_log(database, model, parse_error_log, "Progress",
                                        "Inconsistent meta data for test-op id #" + str(uniq_test_op[i]) + ".")

            # use first row for table entry
            meta_row_i = []
            meta_dict_i = table_data[test_i_inds[0]]
            for j in range(len(meta_column_names)):
                if meta_column_names[j] in meta_dict_i:
                    meta_row_i.append(meta_dict_i[meta_column_names[j]])
                else:
                    meta_row_i.append("")
            meta_rows.append (meta_row_i)

            # store variable/time information (should be in dig id order)
            for j in range(len(test_i_inds)):

                # get digitizer j variable and time information
                time_data[j].append(csv_data[test_i_inds[j]][0])
                var_data[j].append(csv_data[test_i_inds[j]][1])

        cherrypy.log.error ("DAC: constructing variables.meta table and data matrices.")

        # construct variables.meta table, variable/distance matrices, and time vectors
        meta_var_col_names = ["Name", "Time Units", "Units", "Plot Type"]
        meta_vars = []
        time_steps = []
        variable = []
        var_dist = []
        for i in range(len(dig_id_keys)):

            # row i for variables.meta table
            if "WF_DIG_LABEL" in wave_data[test_inds[0][i]]:
                name_i = wave_data[test_inds[0][i]]["WF_DIG_LABEL"] + " (" + str(dig_id_keys[i]) + ")"
            else:
                name_i = "WF_DIG_ID " + str(dig_id_keys[i])
            units_i = wave_data[test_inds[0][i]].get("WF_Y_UNITS", "Not Given")
            time_units_i = wave_data[test_inds[0][i]].get("WF_X_UNITS", "Not Given")
            plot_type_i = "Curve"

            # time vector for digitizer i
            time_i = time_data[i][0]
            max_time_i_len = len(time_i)

            # look through each set of test indices to see if units are unchanged
            for j in range(len(test_inds)):

                # get units from next set of test indices
                units_j = wave_data[test_inds[j][i]].get("WF_Y_UNITS", "Not Given")
                time_units_j = wave_data[test_inds[j][i]].get("WF_X_UNITS", "Not Given")

                # issue warning if units are not the same
                if units_i != units_j:
                    parse_error_log = update_parse_log(database, model, parse_error_log, "Progress",
                                           "Units for test op #" + str(test_op_id[test_inds[j][i]])
                                           + " inconsistent with test op #" + str(test_op_id[test_inds[0][i]])
                                           + " for " + name_i + ".")

                # issue warning if time units are not the same
                if time_units_i != time_units_j:
                    parse_error_log = update_parse_log(database, model, parse_error_log, "Progress",
                                           "Time units for test op #" + str(test_op_id[test_inds[j][i]])
                                           + " inconsistent with test op #" + str(test_op_id[test_inds[0][i]])
                                           + " for " + name_i + ".")

                # intersect time vector
                time_i = list(set(time_i) & set(time_data[i][j]))
                max_time_i_len = max(max_time_i_len, len(time_data[i][j]))

            # check if time vectors were inconsistent
            if len(time_i) < max_time_i_len:
                parse_error_log = update_parse_log(database, model, parse_error_log, "Progress",
                                       "Inconsistent time points for digitizer #" + str(dig_id_keys[i])
                                       + " -- reduced from " + str(max_time_i_len) + " to "
                                       + str(len(time_i)) + " time points.")

            # check if reduction is below minimum threshold
            if len(time_i) < CSV_MIN_SIZE:

                # log as an error
                parse_error_log = update_parse_log(database, model, parse_error_log, "Progress",
                                       "Common time points are less than " + str(CSV_MIN_SIZE)
                                       + " -- skipping digitizer #" + str(dig_id_keys[i]) + ".")

            else:

                # populate variables.meta table
                meta_vars.append([name_i, time_units_i, units_i, plot_type_i])

                # push time vector to list of time vectors
                time_i.sort()
                time_steps.append (time_i)

                # intersect variable data
                variable_i = numpy.zeros((len(test_inds),len(time_i)))
                for j in range(0,len(test_inds)):
                    dict_time_j = dict((val, ind) for ind, val in enumerate(time_data[i][j]))
                    time_j_inds = [dict_time_j[val] for val in time_i]
                    variable_i[j:] = var_data[i][j][time_j_inds]
                variable.append (variable_i)

                # distance computations progress
                slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                                      ["Computing ...", (i + 1.0)/len(dig_id_keys) * 10.0 + 55.0])

                # create pairwise distance matrix
                dist_i = spatial.distance.pdist(variable_i)
                var_dist.append(spatial.distance.squareform (dist_i))

        # show which digitizers were parsed
        num_vars = len(meta_vars)
        for i in range(num_vars):
            parse_error_log.append("Digitizer " + str(meta_vars[i][0]) + " parsed successfully.")

        # check that we still have enough digitizers
        if num_vars < MIN_NUM_DIG:
            parse_error_log = update_parse_log(database, model, parse_error_log, "Progress",
                                   "Total number of digitizers parsed less than " + str(MIN_NUM_DIG) +
                                   " -- no data remaining.")
            meta_rows = []

        # if no parse errors then inform user
        if len(parse_error_log) == 1:
            parse_error_log = update_parse_log(database, model, parse_error_log, "Progress",
                                               "No parse errors.")

        # summarize results for user
        parse_error_log.insert(0, "Summary:")
        parse_error_log.insert(1, "Total number of tests parsed: " + str(len(meta_rows)) + ".")
        parse_error_log.insert(2, "Each test has " + str(num_vars) + " digitizer time series.\n")

        # if no data then return failed result
        if len(meta_rows) == 0:

            # record no data message in front of parser log
            slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                  ["No Data", "\n".join(parse_error_log)])

            # done polling
            slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                                  ["Error", "no data could be imported (see Info > Parse Log for details)"])

            # quit early
            stop_event.set()

        else:

            # upload model to slycat database
            push.init_upload_model (database, model, parse_error_log,
                                    meta_column_names, meta_rows,
                                    meta_var_col_names, meta_vars,
                                    variable, time_steps, var_dist)

            # done -- destroy the thread
            stop_event.set()

    except Exception as e:

        # print error to cherrypy.log.error
        cherrypy.log.error(traceback.format_exc())


def register_slycat_plugin(context):
    context.register_parser("dac-zip-file-parser", "PTS CSV/META .zip file", ["dac-zip-file"], parse_zip)


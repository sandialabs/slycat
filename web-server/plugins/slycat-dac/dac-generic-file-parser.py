# This script imports the .dac index file.  It is modified from
# the slycat-csv-parser.
#
# S. Martin
# 4/4/2017

import csv
import numpy
import slycat.web.server

# zip file manipulation
import io
import zipfile
import os

# background thread does all the work on the server
import threading
import traceback

# for dac_compute_coords.py and dac_upload_model.py
import imp

# for error logging
import cherrypy

# note this version assumes the first row is a header row, and keeps only the header
# and data (called by the generic zip parser)
def parse_table_file(file):

    """
    parses out a csv file into numpy array by column (data), the dimension meta data(dimensions),
    and sets attributes (attributes)
    :param file: csv file to be parsed
    :returns: attributes, data
    """

    rows = [row for row in csv.reader(file.decode().splitlines(), delimiter=",",
                                      doublequote=True, escapechar=None, quotechar='"',
                                      quoting=csv.QUOTE_MINIMAL, skipinitialspace=True)]

    if len(rows) < 2:
        raise Exception("File must contain at least two rows.")

    # get header
    attributes = rows[0]

    # go through the csv by row
    data = []
    for row in rows[1:]:
        data.append(row)

    if len(attributes) < 1:
        raise Exception("File must contain at least one column.")

    return attributes, data


# note this version assumes the first row is a header row, and saves the header values
# as attributes (obfuscated, but leaving here to preserve backwards compatibility)
def parse_file(file):

    """
    parses out a csv file into numpy array by column (data), the dimension meta data(dimensions),
    and sets attributes (attributes)
    :param file: csv file to be parsed
    :returns: attributes, dimensions, data
    """

    def isfloat(value):
        try:
            float(value)
            return True
        except ValueError:
            return False

    rows = [row for row in csv.reader(file.splitlines(), delimiter=",", doublequote=True, escapechar=None, quotechar='"', quoting=csv.QUOTE_MINIMAL, skipinitialspace=True)]
    if len(rows) < 2:
        raise Exception("File must contain at least two rows.")

    attributes = []
    dimensions = [{"name":"row", "type":"int64", "begin":0, "end":len(rows[1:])}]
    data = []

    # go through the csv by column
    for column in zip(*rows):
        column_has_floats = False

        # start from 1 to avoid the column name
        for value in column[1:]:
            if isfloat(value):
                column_has_floats = True
            try:# note NaN's are floats
                output_list = ['NaN' if x=='' else x for x in column[1:]]
                data.append(numpy.array(output_list).astype("float64"))
                attributes.append({"name":column[0], "type":"float64"})

            # could not convert something to a float defaulting to string
            except Exception as e:
                column_has_floats = False
            break

        if not column_has_floats:
            data.append(numpy.array(column[1:]))
            attributes.append({"name":column[0], "type":"string"})

    if len(attributes) < 1:
        raise Exception("File must contain at least one column.")

    return attributes, dimensions, data


# note this version assumes there is no header row and the file is a matrix
# note that we are assuming floats in our matrices
def parse_mat_file(file):

    """
    parses out a csv file into numpy array by column (data), the dimension meta data(dimensions),
    and sets attributes (attributes)
    :param file: csv file to be parsed
    :returns: attributes, dimensions, data
    """

    # parse file using comma delimiter
    rows = [row for row in csv.reader(file.decode().splitlines(), delimiter=",", doublequote=True,
            escapechar=None, quotechar='"', quoting=csv.QUOTE_MINIMAL, skipinitialspace=True)]
    
    # check that we have a matrix
    num_rows = len(rows)
    num_cols = len(rows[0])
    is_a_matrix = True
    for i in range(0, num_rows):
        if len(rows[i]) != num_cols:
            is_a_matrix = False

    # fill a numpy matrix with matrix from file (assumes floats, fails otherwise)
    data = numpy.zeros((len(rows[0:]), len(rows[0])))
    for j in range(len(rows[0:])):
        try:
            data[j,:] = numpy.array([float(name) for name in rows[j]])
        except:
            is_a_matrix = False

    # for a vector we strip off the outer python array []
    if int(data.shape[0]) == 1:

        data = data[0]
        dimensions = [dict(name="row", end=len(data))]

    else:

        # for a matrix we need the number of columns too
        dimensions = [dict(name="row", end=int(data.shape[0])),
            dict(name="column", end=int(data.shape[1]))]

    # attributes are the same for matrices and vectors
    attributes = [dict(name="value", type="float64")]

    # return matrix, if found
    if is_a_matrix:
        return attributes, dimensions, data

    else:
        return [], [], []


def parse_list_file(file):
    """
    parses a text file with a list, one string per row
    :param file: list file to be parsed (strings, one per row)
    :return: a list of strings
    """

    # get rows of file
    rows = [row.strip() for row in file.splitlines()]

    # remove any empty rows
    rows = [_f for _f in rows if _f]

    # return only unique rows
    rows = list(set(rows))

    return rows


def parse(database, model, input, files, aids, **kwargs):

    """
    parses a file as a csv and then uploads the parsed data to associated storage for a
    model
    :param database: slycat.web.server.database.couchdb.connect()
    :param model: database.get("model", self._mid)
    :param input: boolean
    :param files: files to be parsed
    :param aids: artifact ID
    :param kwargs:
    """

    # this version of parse is designed to pass in the column of the aid as the second
    # part of the aids array, so aids: ["variable", "0"] is the previous behavior.
    # if nothing extra is passed in, the array column defaults to 0.

    # also passed in via the aids array is a third variable, which indicates
    # whether or not the file is a table or a matrix, "table" for table and
    # "matrix" for matrix.  for example, aids: ["variable", "0", "table"] is
    # the default, while aids: ["variable", "1", "mat"] indicates that the
    # file is the 2nd matrix in the aid and should be parsed with no header row.
    # ["variable", "0", "list"] indicates a text file with a list, one per row.

    # set defaults (table, array 0)
    table = True
    list_file = False
    array_col = 0

    # change defaults for three parameters
    if len(aids) == 3:
        table = (aids[2] == "table")
        list_file = (aids[2] == "list")
        array_col = int(aids[1])

    # change defaults for two parameters
    if len(aids) == 2:
        array_col = int(aids[1])

    # revert aids to what is expected in original code
    aids = [aids[0]]

    if len(files) != len(aids):
        raise Exception("Number of files and artifact ids must match.")

    # parse file as either table or matrix
    if table:

        # table parser (original csv parser)
        parsed = [parse_file(file) for file in files]
        for (attributes, dimensions, data), aid in zip(parsed, aids):
            slycat.web.server.put_model_arrayset(database, model, aid, input)
            slycat.web.server.put_model_array(database, model, aid, array_col, attributes, dimensions)
            slycat.web.server.put_model_arrayset_data(database, model, aid, "%s/.../..." % array_col, data)

    elif list_file:
         # list file (one string per row)

         # get strings in list
        list_data = parse_list_file(files[0])

         # put list in slycat database as a model parameter
        slycat.web.server.put_model_parameter(database, model, aids[0], list_data, input)

    else:

        # matrix parser (newer parser)
        attributes, dimensions, data = parse_mat_file(files[0])
        aid = aids[0]
        if (array_col == 0):
            slycat.web.server.put_model_arrayset(database, model, aid, input)

        slycat.web.server.put_model_array(database, model, aid, array_col, attributes, dimensions)
        slycat.web.server.put_model_arrayset_data(database, model, aid, "%s/0/..." % array_col, [data])


# DAC generic .zip file parser
def parse_gen_zip(database, model, input, files, aids, **kwargs):

    # import error handling from source
    dac_error = imp.load_source('dac_error_handling',
                           os.path.join(os.path.dirname(__file__), 'py/dac_error_handling.py'))

    dac_error.log_dac_msg("Gen Zip parser started.")

    # push progress for wizard polling to database
    slycat.web.server.put_model_parameter(database, model, "dac-polling-progress", ["Extracting ...", 10.0])

    # keep a parsing error log to help user correct input data
    # (each array entry is a string)
    parse_error_log = dac_error.update_parse_log (database, model, [], "Progress", "Notes:")

    # treat uploaded file as bitstream
    try:

        file_like_object = io.BytesIO(files[0])
        zip_ref = zipfile.ZipFile(file_like_object)
        zip_files = zip_ref.namelist()

    except Exception as e:

        dac_error.quit_raise_exception(database, model, parse_error_log,
                             "Couldn't read zip file (too large or corrupted).")

    # look for one occurrence (only) of .dac file and var, dist, and time directories
    dac_file = ""
    landmarks_file = ""
    pca_file = ""
    var_meta_file = ""
    var_files = []
    dist_files = []
    time_files = []
    for zip_file in zip_files:

        # parse into directory and/or file
        head, tail = os.path.split(zip_file)

        # found a file
        if head == "":

            # is it .dac file?
            ext = tail.split(".")[-1]
            if ext == "dac":
                dac_file = zip_file

            # is it "landmarks.csv"?
            if zip_file == "landmarks.csv":
                landmarks_file = zip_file

            # is is "pca.csv"?
            if zip_file == "pca.csv":
                pca_file = zip_file

        # found a directory -- is it "var/"?
        elif head == "var":

            # check for variables.meta file
            if tail == "variables.meta":

                var_meta_file = zip_file

            # check for .var extension
            elif tail != "":

                ext = tail.split(".")[-1]
                if ext == "var":
                    var_files.append(zip_file)

                else:

                    dac_error.quit_raise_exception(database, model, parse_error_log,
                                         "Variable files must have .var extension.")

        # is it "time/" directory?
        elif head == "time":

            # ignore directory
            if tail != "":

                ext = tail.split(".")[-1]
                if ext == "time":
                    time_files.append(zip_file)

                else:

                    dac_error.quit_raise_exception(database, model, parse_error_log,
                                         "Time series files must have .time extension.")

        # is it "dist/" directory?
        elif head == "dist":

            # ignore directory
            if tail != "":

                ext = tail.split(".")[-1]
                if ext == "dist":
                    dist_files.append(zip_file)

                else:

                    dac_error.quit_raise_exception(database, model, parse_error_log,
                        "Distance matrix files must have .dist extension.")

    parse_error_log = dac_error.update_parse_log(database, model, parse_error_log, "Progress",
                                       "Successfully identified DAC generic format files.")

    # prepare to upload data
    meta_var_col_names = []
    meta_vars = []

    # load variables.meta file
    if var_meta_file != "":

        # push progress for wizard polling to database
        model = database.get('model', model["_id"])
        slycat.web.server.put_model_parameter(database, model, "dac-polling-progress", ["Extracting ...", 20.0])

        # parse variables.meta file
        meta_var_col_names, meta_vars = parse_table_file(zip_ref.read(var_meta_file))

        # check variable meta data header
        headers_OK = True
        if len(meta_var_col_names) == 4:

            if meta_var_col_names[0] != "Name": headers_OK = False
            if meta_var_col_names[1] != "Time Units": headers_OK = False
            if meta_var_col_names[2] != "Units": headers_OK = False
            if meta_var_col_names[3] != "Plot Type": headers_OK = False

        else:
            headers_OK = False

        # quit if headers are un-recognized
        if not headers_OK:

            dac_error.quit_raise_exception(database, model, parse_error_log,
                                 "Variables.meta file has incorrect headers.")

        # check var file names
        num_vars = len(meta_vars)
        check_file_names(database, model, dac_error, parse_error_log,
                        "var/variable_", ".var", num_vars, var_files,
                        "missing variable_*.var file(s).")

        parse_error_log = dac_error.update_parse_log (database, model, parse_error_log, "Progress",
                                            "Checked DAC variable file names.")

        # check time file names
        check_file_names(database, model, dac_error, parse_error_log,
                         "time/variable_", ".time", num_vars, time_files,
                         "missing variable_*.time file(s).")

        parse_error_log = dac_error.update_parse_log (database, model, parse_error_log, "Progress",
                                            "Checked DAC time file names.")

        # check dist file names
        check_file_names(database, model, dac_error, parse_error_log,
                         "dist/variable_", ".dist", num_vars, dist_files,
                         "missing variable_*.dist file(s).")

        parse_error_log = dac_error.update_parse_log (database, model, parse_error_log, "Progress",
                                            "Checked DAC distance file names.")


    else:

        dac_error.quit_raise_exception(database, model, parse_error_log,
                             "Variables.meta file not found.")

    # load landmarks file
    landmarks = None
    if landmarks_file != "":

        # parse landmarks.csv file
        attr, dim, landmarks = parse_mat_file(zip_ref.read(landmarks_file))

    else:

        parse_error_log = dac_error.update_parse_log (database, model, parse_error_log, "Progress",
            "No landmarks.csv file found, using all data points.")

    # load pca-comps file
    pca_comps = None
    if pca_file != "":

        # parse pca.csv file
        attr, dim, pca_comps = parse_mat_file(zip_ref.read(pca_file))

    else:

        parse_error_log = dac_error.update_parse_log (database, model, parse_error_log, "Progress",
            "No pca.csv file found, using MDS algorithm.")

    # now start thread to prevent timing out on large files
    stop_event = threading.Event()
    thread = threading.Thread(target=parse_gen_zip_thread,
                              args=(database, model, zip_ref, dac_error, parse_error_log,
                              meta_var_col_names, meta_vars, landmarks, pca_comps, 
                              dac_file, stop_event))
    thread.start()


# helper function which checks file names
# note error message shouldn't end with a "."
def check_file_names (database, model, dac_error, parse_error_log,
                      root, ext, num_files, files, error_msg):

    files_found = True
    for i in range(0, num_files):
        file_i = root + str(i + 1) + ext
        if not file_i in files:
            files_found = False

    # quit if files do not match
    if not files_found:

        dac_error.quit_raise_exception(database, model, parse_error_log, error_msg)


# gen zip parsing thread to prevent time outs by browser
def parse_gen_zip_thread(database, model, zip_ref, dac_error, parse_error_log,
                         meta_var_col_names, meta_vars, landmarks, pca_comps,
                         dac_file, stop_event):

    # put entire thread into a try-except block in order report errors
    try:

        # import dac_upload_model from source
        push = imp.load_source('dac_upload_model',
                               os.path.join(os.path.dirname(__file__), 'py/dac_upload_model.py'))

        num_vars = len(meta_vars)

        # parse meta file
        meta_column_names, meta_rows = parse_table_file(zip_ref.read(dac_file))

        # number of data points
        num_datapoints = len(meta_rows)

        # do pca check (pca over-rides landmarks)
        use_coordinates=False
        if pca_comps is not None:

            num_pca_comps = int(numpy.round(pca_comps[0]))

            # check that pca comps is at least two
            if num_pca_comps < 2:
                
                dac_error.quit_raise_exception(database, model, parse_error_log,
                            'Number of PCA components must be at least two.')

            # set as number of landmarks
            num_landmarks = num_pca_comps
            use_coordinates = True

            parse_error_log = dac_error.update_parse_log (database, model, parse_error_log, "Progress", 
                                    "Using " + str(num_pca_comps) + " PCA components.")

        # do landmark checks
        elif landmarks is not None:
        
            num_landmarks = len(landmarks)

            # check that number of landmarks is at least three
            if num_landmarks < 3:

                dac_error.quit_raise_exception(database, model, parse_error_log,
                            'Number of landmarks must be at least three.')

            # make landmarks integer by rounding
            landmarks = numpy.around(landmarks)

            # check that landmarks in are correct range 
            if numpy.amin(landmarks) < 1 or numpy.amax(landmarks) > num_datapoints:

                dac_error.quit_raise_exception(database, model, parse_error_log,
                            'Landmarks are out of range of data points.')

            parse_error_log = dac_error.update_parse_log (database, model, parse_error_log, "Progress", 
                                    "Read " + str(num_landmarks) + " landmarks.")

        # if no landmarks, it's the same as all landmarks,
        # at least for the purposes of check dist matrix size
        else:
            num_landmarks = num_datapoints

        parse_error_log = dac_error.update_parse_log (database, model, parse_error_log, "Progress",
                                            "Read " + str(num_datapoints) + " datapoints.")

        # push progress for wizard polling to database
        slycat.web.server.put_model_parameter(database, model, "dac-polling-progress", ["Extracting ...", 30.0])

        # parse var files
        variable = []
        for i in range(0, num_vars):

            attr, dim, data = parse_mat_file(zip_ref.read("var/variable_" + str(i+1) + ".var"))
            variable.append(numpy.array(data))

        parse_error_log = dac_error.update_parse_log (database, model, parse_error_log, "Progress",
                                            "Parsed " + str(num_vars) + " DAC variable files.")

        # push progress for wizard polling to database
        model = database.get('model', model["_id"])
        slycat.web.server.put_model_parameter(database, model, "dac-polling-progress", ["Extracting ...", 45.0])

        # parse time files
        time_steps = []
        for i in range(0, num_vars):

            attr, dim, data = parse_mat_file(zip_ref.read("time/variable_" + str(i + 1) + ".time"))

            # check that time steps match variable length
            if len(variable[i][0]) != len(data):

                dac_error.quit_raise_exception(database, model, parse_error_log,
                                     'Time steps do not match variable data for variable ' + str(i+1) + ".")

            time_steps.append(list(data))

        parse_error_log = dac_error.update_parse_log (database, model, parse_error_log, "Progress",
                                            "Parsed " + str(num_vars) + " DAC time files.")

        # push progress for wizard polling to database
        model = database.get('model', model["_id"])
        slycat.web.server.put_model_parameter(database, model, "dac-polling-progress", ["Extracting ...", 60.0])

        # parse distance files
        var_dist = []
        for i in range(0, num_vars):

            attr, dim, data = parse_mat_file(zip_ref.read("dist/variable_" + str(i + 1) + ".dist"))

            # check that distance matrix is (num_datapoint, num_landmarks)
            if data.shape[0] != num_datapoints or data.shape[1] != num_landmarks:

                dac_error.quit_raise_exception(database, model, parse_error_log,
                                     'Distance matrix is incorrect shape for variable ' + str(i + 1) + '.')

            # check that distance matrix matches number of datapoints
            if len(data) != num_datapoints:

                dac_error.quit_raise_exception(database, model, parse_error_log,
                                     'Distance matrix size does not match number of datapoints for variable ' \
                                     + str(i + 1) + '.')

            var_dist.append(numpy.array(data))

        parse_error_log = dac_error.update_parse_log (database, model, parse_error_log, "Progress",
                                            "Parsed " + str(num_vars) + " DAC distance files.")

        # summarize results for user
        parse_error_log.insert(0, "Summary:")

        # list out final statistics
        num_tests = len(meta_rows)
        parse_error_log.insert(1, "Total number of tests: " + str(num_tests) + ".")
        parse_error_log.insert(2, "Each test has " + str(num_vars)
                               + " digitizer time series.\n")

        slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                              ["Progress", "\n".join(parse_error_log)])

        # upload model to slycat database
        push.init_upload_model(database, model, dac_error, parse_error_log,
                               meta_column_names, meta_rows,
                               meta_var_col_names, meta_vars,
                               variable, time_steps, var_dist, 
                               landmarks=landmarks, use_coordinates=use_coordinates)

        # done -- destroy the thread
        stop_event.set()

    except Exception as e:

        dac_error.log_dac_msg(traceback.format_exc())

        stop_event.set()


# register all generic file parsers (really just the same csv parser), so that they
# appear with different labels in the file picker.
def register_slycat_plugin(context):
    context.register_parser("dac-gen-zip-parser", "DAC generic .zip file", 
        ["dac-gen-zip-file"], parse_gen_zip)
    context.register_parser("dac-category-file-parser", 
        "DAC category list (text file, one category per line)", ["dac-cat-file"], parse)




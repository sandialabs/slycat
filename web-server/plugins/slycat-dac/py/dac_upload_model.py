# This script contains a function which will compute variable
# coordinates and alpha cluster values and then upload
# a model to the slycat database.
#
# Assumes progress bar starts at 65%.
#
# S. Martin
# 5/26/2019

# computations
import dac_compute_coords as dac
import numpy

import cherrypy

# slycat server
import slycat.web.server

# database, model are the slycat database and model to use for the upload
# parse_error_log is the progress so far to be reported in the dac upload window
# dac-uploading-progress starts at 70%
# meta_column_names are the names of the metadata columns
# meta_rows are the rows of the metadata table
# meta_var_col_names are the names of the variable metadata columns
# meta_vars are the variable metadata rows
# variable is a list of variable matrices
# time_steps is a list of time step vectors
# var_dist is a list of pairwise distance matrices
# landmarks is a list of integer indices (1 based) for landmarks
def init_upload_model (database, model, dac_error, parse_error_log, meta_column_names, meta_rows,
                       meta_var_col_names, meta_vars, variable, time_steps, var_dist, proj=None,
                       landmarks=None, use_coordinates=False):
    
    # convert from meta data from row-oriented to column-oriented data,
    # and convert to numeric columns where possible.
    meta_column_types = ["string" for name in meta_column_names]
    alpha_column_types = ["string" for name in meta_column_names]
    meta_columns = list(zip(*meta_rows))
    alpha_columns = list(zip(*meta_rows))
    for index in range(len(meta_columns)):
        try:

            meta_columns[index] = numpy.array(meta_columns[index], dtype="float64")
            alpha_columns[index] = numpy.array(meta_columns[index], dtype="float64")

            # if there are any nan values using strings instead
            if numpy.any(numpy.isnan(meta_columns[index])):

                # for alpha columns keep with float64
                alpha_column_types[index] = "float64"

                # for meta_columns use strings
                meta_columns[index] = numpy.array(meta_columns[index], dtype="str")

                # replace "nan" with better looking "NaN"
                for i in range(len(meta_columns[index])):
                    if meta_columns[index][i] == "nan":
                        meta_columns[index][i] = "NaN"

            else:
                meta_column_types[index] = "float64"
                alpha_column_types[index] = "float64"

        except:
            meta_columns[index] = numpy.array(meta_columns[index], dtype="str")
            alpha_columns[index] = meta_columns[index]

    # convert variable meta data from row-oriented to column-oriented data
    meta_var_cols = list(zip(*meta_vars))
    for index in range(len(meta_var_cols)):
        meta_var_cols[index] = numpy.array(meta_var_cols[index], dtype="str")

    # convert landmarks to mask
    if landmarks is not None:

        landmark_mask = numpy.zeros(len(meta_rows))
        landmark_mask[landmarks.astype(int)-1] = 1
        landmarks = landmark_mask

    # get total number of variables
    num_vars = len(meta_vars)

    # next compute initial MDS coordinates
    mds_coords, full_mds_coords = dac.init_coords(var_dist, proj=proj, 
        landmarks=landmarks, use_coordinates=use_coordinates)

    # finally compute alpha cluster values
    alpha_cluster_mat = dac.compute_alpha_clusters(var_dist, alpha_columns, alpha_column_types, 
        landmarks=landmarks, use_coordinates=use_coordinates)

    dac_error.log_dac_msg("Pushing data to database.")

    # Push DAC variables to slycat server
    # -----------------------------------

    # starting uploads (70%)
    slycat.web.server.put_model_parameter(database, model, "dac-polling-progress", ["Uploading ...", 70.0])

    # push error log to database
    slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                          ["Success", "\n".join(parse_error_log)])

    # create meta data table on server
    slycat.web.server.put_model_arrayset(database, model, "dac-datapoints-meta")

    # convert unicode to string, if necessary
    meta_column_str_names = []
    for name in meta_column_names:
        if isinstance(name, str):
            meta_column_str_names.append(name)
        else:
            meta_column_str_names.append(name.decode("utf-8"))

    # start our single "dac-datapoints-meta" array.
    dimensions = [dict(name="row", end=len(meta_rows))]
    attributes = [dict(name=name, type=type) for name, type in zip(meta_column_str_names, meta_column_types)]
    slycat.web.server.put_model_array(database, model, "dac-datapoints-meta", 0, attributes, dimensions)

    # upload data into the array
    for index, data in enumerate(meta_columns):
        slycat.web.server.put_model_arrayset_data(database, model, "dac-datapoints-meta", "0/%s/..." % index, [data])

    # create variables.meta table on server
    slycat.web.server.put_model_arrayset(database, model, "dac-variables-meta")

    # convert unicode to string, if necessary
    meta_var_col_str_names = []
    for name in meta_var_col_names:
        if isinstance(name, str):
            meta_var_col_str_names.append(name)
        else:
            meta_var_col_str_names.append(name.decode("utf-8"))

    # start our single "dac-datapoints-meta" array.
    dimensions = [dict(name="row", end=len(meta_vars))]
    attributes = [dict(name=name, type="string") for name in meta_var_col_str_names]
    slycat.web.server.put_model_array(database, model, "dac-variables-meta", 0, attributes, dimensions)

    # upload data into the array
    for index, data in enumerate(meta_var_cols):
        slycat.web.server.put_model_arrayset_data(database, model, "dac-variables-meta", "0/%s/..." % index, [data])

    # create time points matrix on server
    slycat.web.server.put_model_arrayset(database, model, "dac-time-points")

    # upload as a series of 1-d arrays
    for i in range(num_vars):

        # set up time points array
        time_points = time_steps[i]
        dimensions = [dict(name="row", end=len(time_points))]
        attributes = [dict(name="value", type="float64")]

        # upload to slycat at array i
        slycat.web.server.put_model_array(database, model, "dac-time-points", i, attributes, dimensions)
        slycat.web.server.put_model_arrayset_data(database, model, "dac-time-points", "%s/0/..." % i, [time_points])

        # progress bar update
        slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                              ["Uploading ...", (i + 1.0) / num_vars * 10.0 + 70.0])

    # create variable matrices on server
    slycat.web.server.put_model_arrayset(database, model, "dac-var-data")

    # store each .var file in a separate array in the arrayset
    for i in range(num_vars):
        # set up dist matrices
        data_mat = variable[i]
        dimensions = [dict(name="row", end=int(data_mat.shape[0])),
                      dict(name="column", end=int(data_mat.shape[1]))]
        attributes = [dict(name="value", type="float64")]

        # upload to slycat as separate arrays
        slycat.web.server.put_model_array(database, model, "dac-var-data", i, attributes, dimensions)
        slycat.web.server.put_model_arrayset_data(database, model, "dac-var-data", "%s/0/..." % i, [data_mat])

        # progress bar update
        slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                              ["Uploading ...", (i + 1.0) / num_vars * 10.0 + 80.0])

    # store landmarks on server
    if landmarks is not None:

        slycat.web.server.put_model_arrayset(database, model, "dac-landmarks")

        # store as vector
        dimensions = [dict(name="row", end=len(landmarks))]
        attributes = [dict(name="value", type="float64")]

        # upload as slycat array
        slycat.web.server.put_model_array(database, model, "dac-landmarks", 0, attributes, dimensions)
        slycat.web.server.put_model_arrayset_data(database, model, "dac-landmarks", "0/0/...", [landmarks])

    # store PCA use on server
    if use_coordinates == True:
        slycat.web.server.put_model_parameter(database, model, "dac-use-PCA-comps", use_coordinates)

    # create distance matrices on server
    slycat.web.server.put_model_arrayset(database, model, "dac-var-dist")

    # store each .dist file in a seperate array in the arrayset
    for i in range(num_vars):

        # set up dist matrices
        dist_mat = var_dist[i]

        dimensions = [dict(name="row", end=int(dist_mat.shape[0])),
                      dict(name="column", end=int(dist_mat.shape[1]))]
        attributes = [dict(name="value", type="float64")]

        # upload to slycat as seperate arrays
        slycat.web.server.put_model_array(database, model, "dac-var-dist", i, attributes, dimensions)
        slycat.web.server.put_model_arrayset_data(database, model, "dac-var-dist", "%s/0/..." % i, [dist_mat])

        # progress bar update
        slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                              ["Uploading ...", (i + 1.0) / num_vars * 10.0 + 90.0])

    # create array for MDS coordinates
    slycat.web.server.put_model_arrayset(database, model, "dac-mds-coords")

    # store as matrix
    dimensions = [dict(name="row", end=int(mds_coords.shape[0])),
                  dict(name="column", end=int(mds_coords.shape[1]))]
    attributes = [dict(name="value", type="float64")]

    # upload as slycat array
    slycat.web.server.put_model_array(database, model, "dac-mds-coords", 0, attributes, dimensions)
    slycat.web.server.put_model_arrayset_data(database, model, "dac-mds-coords", "0/0/...", [mds_coords])

    # create array for full-mds-coords
    slycat.web.server.put_model_arrayset(database, model, "dac-full-mds-coords")

    # store as matrix
    dimensions = [dict(name="row", end=int(full_mds_coords.shape[0])),
                  dict(name="column", end=int(full_mds_coords.shape[1]))]
    attributes = [dict(name="value", type="float64")]

    # upload as slycat array
    slycat.web.server.put_model_array(database, model, "dac-full-mds-coords", 0, attributes, dimensions)
    slycat.web.server.put_model_arrayset_data(database, model, "dac-full-mds-coords", "0/0/...", [full_mds_coords])

    # create array for alpha cluster parameters
    slycat.web.server.put_model_arrayset(database, model, "dac-alpha-clusters")

    # store as matrix
    dimensions = [dict(name="row", end=int(alpha_cluster_mat.shape[0])),
                  dict(name="column", end=int(alpha_cluster_mat.shape[1]))]
    attributes = [dict(name="value", type="float64")]

    # upload as slycat array
    slycat.web.server.put_model_array(database, model, "dac-alpha-clusters", 0, attributes, dimensions)
    slycat.web.server.put_model_arrayset_data(database, model, "dac-alpha-clusters", "0/0/...", [alpha_cluster_mat])

    # upload done indicator for polling routine
    slycat.web.server.put_model_parameter(database, model, "dac-polling-progress", ["Done", 100])
    dac_error.log_dac_msg("Done initializing MDS coords.")

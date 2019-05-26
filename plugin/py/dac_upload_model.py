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

# slycat server
import slycat.web.server
import cherrypy

# database, model are the slycat database and model to use for the upload
# parse_error_log is the progress so far to be reported in the dac upload window
# meta_column_names are the names of the metadata columns
# meta_rows are the rows of the metadata table
# meta_var_col_names are the names of the variable metadata columns
# meta_vars are the variable metadata rows
# variable is a list of variable matrices
# time_steps is a list of time step vectors
# var_dist is a list of pairwise distance matrices
def init_upload_model (database, model, parse_error_log, meta_column_names, meta_rows,
                       meta_var_col_names, meta_vars, variable, time_steps, var_dist):

    # convert from meta data from row-oriented to column-oriented data,
    # and convert to numeric columns where possible.
    meta_column_types = ["string" for name in meta_column_names]
    meta_columns = zip(*meta_rows)
    for index in range(len(meta_columns)):
        try:
            meta_columns[index] = numpy.array(meta_columns[index], dtype="float64")
            meta_column_types[index] = "float64"
        except:
            meta_columns[index] = numpy.array(meta_columns[index], dtype="string")

    # convert variable meta data from row-oriented to column-oriented data
    meta_var_cols = zip(*meta_vars)
    for index in range(len(meta_var_cols)):
        meta_var_cols[index] = numpy.array(meta_var_cols[index], dtype="string")

    # get total number of variables
    num_vars = len(meta_vars)

    # next compute initial MDS coordinates
    mds_coords, full_mds_coords = dac.init_coords(var_dist)

    # finally compute alpha cluster values
    alpha_cluster_mat = dac.compute_alpha_clusters(var_dist, meta_columns, meta_column_types)

    cherrypy.log.error("DAC: pushing data to database.")

    # Push DAC variables to slycat server
    # -----------------------------------

    # starting uploads (30%)
    slycat.web.server.put_model_parameter(database, model, "dac-polling-progress", ["Uploading ...", 70.0])

    # push error log to database
    slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                          ["Success", "\n".join(parse_error_log)])

    # create meta data table on server
    slycat.web.server.put_model_arrayset(database, model, "dac-datapoints-meta")

    # start our single "dac-datapoints-meta" array.
    dimensions = [dict(name="row", end=len(meta_rows))]
    attributes = [dict(name=name, type=type) for name, type in zip(meta_column_names, meta_column_types)]
    slycat.web.server.put_model_array(database, model, "dac-datapoints-meta", 0, attributes, dimensions)

    # upload data into the array
    for index, data in enumerate(meta_columns):
        slycat.web.server.put_model_arrayset_data(database, model, "dac-datapoints-meta", "0/%s/..." % index, [data])

    # create variables.meta table on server
    slycat.web.server.put_model_arrayset(database, model, "dac-variables-meta")

    # start our single "dac-datapoints-meta" array.
    dimensions = [dict(name="row", end=len(meta_vars))]
    attributes = [dict(name=name, type="string") for name in meta_var_col_names]
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
    cherrypy.log.error("DAC: done initializing MDS coords.")

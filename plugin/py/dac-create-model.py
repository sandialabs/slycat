# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

# Reads in dial-a-cluster data files from a directory.  Modified from
# slycat-csv-to-cca-model.py.
#
# S. Martin
# 11/12/2014

"""Uploads tab-delimited files from a dial-a-cluster data directory
to the Slycat Web Server."""

import dac_compute_coords as dac

import numpy
from scipy import optimize
import slycat.web.client
import sys
import os

parser = slycat.web.client.ArgumentParser()
parser.add_argument("dir", help="Input data directory containing tab-delimited Dial-A-Cluster files.")
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument("--model-description", default="", help="New model description.  Default: %(default)s")
parser.add_argument("--model-name", default="Model", help="New model name.  Default: %(default)s")
parser.add_argument("--no-join", default=False, action="store_true", help="Don't wait for the model to finish.")
parser.add_argument("--project-description", default="", help="New project description.  Default: %(default)s")
parser.add_argument("--project-name", default="DAC", help="New project name.  Default: %(default)s")
arguments = parser.parse_args()

# read in datapoints.meta file
##############################

with open(arguments.dir + '/datapoints.meta', 'r') as stream:
    meta_rows = [row.split('\t') for row in stream]
print "Reading datapoints.meta file ..."

# extract column names from the first line of the file, and assume that all columns contain string data.
meta_column_names = [name.strip() for name in meta_rows[0]]
meta_column_types = ["string" for name in meta_column_names]
meta_rows = meta_rows[1:]

# keep the number of time series per variable for more error-checking later
num_time_series = len(meta_rows)

# convert from row-oriented to column-oriented data, and convert to numeric columns where possible.
meta_columns = zip(*meta_rows)
for index in range(len(meta_columns)):
  try:
    meta_columns[index] = numpy.array(meta_columns[index], dtype="float64")
    meta_column_types[index] = "float64"
  except:
    meta_columns[index] = numpy.array(meta_columns[index], dtype="string")

# read in variables.meta file
#############################

# (this is just like reading the datapoints.meta file)
with open(arguments.dir + '/variables.meta', 'r') as stream:
    meta_vars = [row.split('\t') for row in stream]
print"Reading variables.meta file ..."

meta_var_col_names = [name.strip() for name in meta_vars[0]]
meta_var_col_types = ["string" for name in meta_var_col_names]
meta_vars = meta_vars[1:]

num_vars = len(meta_vars)

# convert from row-oriented to column-oriented data
meta_var_cols = zip(*meta_vars)
for index in range(len(meta_var_cols)):
    meta_var_cols[index] = numpy.array(meta_var_cols[index], dtype="string")

# check for 4 columns with proper headers
if len(meta_var_col_names) != 4:
    raise Exception ("variables.meta file doesn't have 3 columns!")
if meta_var_col_names[0] != "Name":
    raise Exception ('first column of variables.meta is not "Name".')
if meta_var_col_names[1] != "Time Units":
    raise Exception ('second column of varibles.meta is not "Time Units".')
if meta_var_col_names[2] != "Units":
    raise Exception ('third column of varibles.meta is not "Units".')
if meta_var_col_names[3] != "Plot Type":
    raise Exception ('fourth column of variables.meta is not "Plot Type".')

# read in alpha_parms.pref file, if not present assign defaults
###############################################################

# check to see if alpha_parms.pref file exists
if os.path.isfile(arguments.dir + '/alpha_parms.pref'):

	# load file
    with open(arguments.dir + '/alpha_parms.pref', 'r') as stream:
        alpha_file = [row.split('\t') for row in stream]
    print "Reading alpha_parms.pref file ..."
    
    # check column names
    alpha_file_col_names = [name.strip() for name in alpha_file[0]]
    if len(alpha_file_col_names) != 2:
        raise Exception ("alpha_parms.pref file doesn't have 2 columns!")
    if alpha_file_col_names[0] != "Alpha":
        raise Exception ('first column of alpha_parms.pref is not "Alpha".')
    if alpha_file_col_names[1] != "Order":
        raise Exception ('second column of alpha_parms.pref is not "Order".')
    
    # check number of rows of alpha_parms file
    alpha_file = alpha_file[1:]
    if len(alpha_file) != num_vars:
        raise Exception ("alpha_parms.pref file has incorrect number of rows.")
    
    # re-arrange alpha_parms into columns
    alpha_file_cols = zip(*alpha_file)
    for index in range(len(alpha_file_cols)):
        alpha_file_cols[index] = numpy.array(alpha_file_cols[index], dtype="float64")
    
    # put parameters into numpy variables
    alpha_parms = alpha_file_cols[0]
    alpha_order = alpha_file_cols[1].astype(numpy.int64) - 1
    
else:
	print "No alpha_parms.pref file, constructing defaults ..."
	alpha_parms = numpy.ones(num_vars)
	alpha_order = numpy.arange(0,num_vars)
	
# make sure parameters are lists (to push as model parameters)
alpha_parms = alpha_parms.tolist()
alpha_order = alpha_order.tolist()

# read in variable_defaults.pref file, if not present assign defaults
#####################################################################

# check to see if variable_defaults.pref file is present
if os.path.isfile(arguments.dir + '/variable_defaults.pref'):

    # load file
    with open(arguments.dir + '/variable_defaults.pref') as stream:
        defaults_file = [row.split('\t') for row in stream]
    print "Reading varible_defaults.pref file ..."
    
    # check for 3 integers
    default_row = [name.strip() for name in defaults_file[0]]
    if len(default_row) != 3:
        raise Exception ("number of integers in variable_defaults.pref file is not 3.")
        
    var_plot_order = numpy.array(default_row, dtype="int64") - 1
    
else:
	print "No variable_defaults.pref file found, constructing defaults ..."
	var_plot_order = numpy.arange(0,3)

# make sure parameters are lists (to push as model parameters)
var_plot_order = var_plot_order.tolist()

# read in dac_ui.pref file, if not present assign defaults
##########################################################

# first define defaults
dac_ui_parms = {'SLYCAT_HEADER': 50,   # slycat header is typically 50 pixels high
    'ALPHA_STEP': .001,                # step size for alpha sliders
    'ALPHA_SLIDER_WIDTH': 170,         # width in pixels for alpha slider
    'ALPHA_BUTTONS_HEIGHT': 33,        # height of alpha buttons pixels
    'MAX_POINTS_ANIMATE': 2500,        # number of points below which we animate
    'SCATTER_BORDER': .025,            # border around scatter plot (fraction)
    'SCATTER_BUTTONS_HEIGHT': 35,      # scatter plot toolbar height
    'POINT_COLOR': 'whitesmoke',       # css named color for non selected points
    'POINT_SIZE': 5,                   # d3 point size for scatter plot
    'NO_SEL_COLOR': 'gray',            # css named color border for scatter points
    'SELECTION_1_COLOR': 'red',        # css named color selection 1 border
    'SELECTION_2_COLOR': 'blue',       # css named color selection 2 border
    'COLOR_BY_LOW': 'yellow',          # css named color for low value colored points
    'COLOR_BY_HIGH': 'limegreen',      # color for high value colored points
    'OUTLINE_NO_SEL': 1,               # pixel width of non selected point
    'OUTLINE_SEL': 2,                  # pixel width of border for selected point
    'PLOTS_PULL_DOWN_HEIGHT': 35,      # time series spacing for pull downs
    'PADDING_TOP': 10,                 # padding for top of time series plot
    'PADDING_BOTTOM': 24,              # padding for bottom of time series plot
    'PADDING_LEFT': 37,                # padding for left of time series plot
    'PADDING_RIGHT': 10,               # padding for right of time series plot
    'X_LABEL_PADDING': 4,              # padding for time series x-label
    'Y_LABEL_PADDING': 13,             # padding for time series y-label
    'LABEL_OPACITY': .2,               # opacity for time series label
    'X_TICK_FREQ': 80,                 # pixel distance between x ticks
    'Y_TICK_FREQ': 40}                 # pixel distance between y ticks
      
# check to see if dac_ui.pref file exists
if os.path.isfile(arguments.dir + '/dac_ui.pref'):
    
    # load file
    with open(arguments.dir + '/dac_ui.pref') as stream:
        dac_ui_file = [row.split('\t') for row in stream]
    print "Reading dac_ui.pref file ..."
    
    # check for 2 columns
    dac_ui_row = [name.strip() for name in dac_ui_file[0]]

    
    # check for matching ui preferences in file
    for i in range(len(dac_ui_file)):
        
        # get row of file
        dac_ui_row = [name.strip() for name in dac_ui_file[i]]
        
        # check that it has two entries exactly
        if len(dac_ui_row) != 2:
            raise Exception ("found row in dac_ui.pref without two entries.")

        # check if name is in ui preferences dictionary, overwrite if found
        if dac_ui_row[0] in dac_ui_parms:
            dac_ui_parms[dac_ui_row[0]] = dac_ui_row[1]

# read in variable_*.time files
###############################

print "Reading variable_*.time files ..."
time_steps = []	# store as a list of numpy arrays
for i in range(num_vars):
       
    # read variable_i.time file
    with open(arguments.dir + '/variable_' + str(i + 1) + '.time') as stream:
       time_step_i_file = [row.strip().split('\t') for row in stream]
    
    # convert to numpy array
    time_steps_i = numpy.array([float(name.strip())
        for name in time_step_i_file[0]])
        
    # store in the list of variables
    time_steps.append(time_steps_i)
    
# read in variable_*.var files
##############################

print "Reading variable_*.var files ..."
variable = []	# store as a list of numpy matrices
for i in range(num_vars):
       
    # read variable_i.var file
    with open(arguments.dir + '/variable_' + str(i + 1) + '.var') as stream:
       variable_i_file = [row.strip().split('\t') for row in stream]
    
    # check that variable_i has the right number of data points
    if len(variable_i_file) != num_time_series:
	    raise Exception ('variable_' + str(i + 1) + 
	        '.var file has wrong number of data points.')
    
    # create a matrix each row has same number of time points
    variable_i = numpy.zeros((len(variable_i_file), len(time_steps[i])))
    for j in range(len(variable_i_file)):
        variable_i[j,:] = numpy.array([float(name) for name in variable_i_file[j]])
    
    # store in the list of matrices
    variable.append(variable_i)

# read in variable_*.dist files
###############################

print "Reading variable_*.dist files ..."
var_dist = []	# store as a list of numpy matrices
for i in range(num_vars):

    # read variable_i.dist file
    with open(arguments.dir + '/variable_' + str(i + 1) + '.dist') as stream:
        var_dist_i_file = [row.strip().split('\t') for row in stream]
    
    # check that var_dist file has the right number of data points
    if len(var_dist_i_file) != num_time_series:
        raise Exception ('variable_' + str(i + 1) + 
            '.dist file has wrong number of rows')
    
    # create a numpy matrix
    var_dist_i = numpy.zeros((len(var_dist_i_file), len(var_dist_i_file)))
    for j in range(len(var_dist_i_file)):
        var_dist_i[j,:] = numpy.array([float(name) for name in var_dist_i_file[j]])
    
    # scale distance matrices to have maximum distance of 1
    var_dist_i = var_dist_i/numpy.amax(var_dist_i)
    
    # store in list of distance matrices
    var_dist.append(var_dist_i)

# compute all distances based coordinates for scaling
#####################################################

print "Computing MDS scale factors ..."
full_mds_coords = dac.compute_coords(var_dist, numpy.ones(len(alpha_parms)))
full_mds_coords = full_mds_coords[0][:,0:3]

# compute preliminary coordinate representation
###############################################

# keep only first 3 coordinates
print "Computing MDS coordinates ..."
unscaled_mds_coords = dac.compute_coords(var_dist, numpy.array(alpha_parms))
unscaled_mds_coords = unscaled_mds_coords[0][:,0:3]

# scale using full coordinates
mds_coords = dac.scale_coords(unscaled_mds_coords, full_mds_coords)

# compute cluster button alpha values
#####################################

# form a matrix with each distance matrix as a column (this is U matrix)
all_dist_mat = numpy.zeros((num_time_series * num_time_series, num_vars));
for i in range(num_vars):
    all_dist_mat[:,i] = numpy.squeeze(numpy.reshape(var_dist[i], 
        (num_time_series * num_time_series,1)))

# for each quantitative meta variable, compute distances as columns (V matrices)
prop_dist_mats = []    # store as a list of numpy columns
num_meta_cols = len(meta_column_types)
for i in range(num_meta_cols):
    if meta_column_types[i] == "float64":
                
        # compute pairwise distance matrix for property i
        prop_dist_mat_i = numpy.absolute(
            numpy.transpose(numpy.tile(meta_columns[i],
            (num_time_series,1))) - numpy.tile(meta_columns[i],
            (num_time_series,1)))
        prop_dist_vec_i = numpy.squeeze(numpy.reshape(prop_dist_mat_i,
            (num_time_series * num_time_series,1)))
            
        # make sure we don't divide by 0
        prop_dist_vec_max_i = numpy.amax(prop_dist_vec_i)
        if prop_dist_vec_max_i <= numpy.finfo(float).eps:
            prop_dist_vec_max_i = 1.0
        prop_dist_mats.append(prop_dist_vec_i/prop_dist_vec_max_i)
        
    else:
        prop_dist_mats.append(0)

# compute NNLS cluster button alpha values
alpha_cluster_mat = numpy.zeros((num_meta_cols, num_vars))
print "Computing alpha values for property clusters ..."
for i in range(num_meta_cols):
    if meta_column_types[i] == "float64":
        beta_i = optimize.nnls(all_dist_mat, prop_dist_mats[i])
        alpha_i = numpy.sqrt(beta_i[0])
        
        # again don't divide by zero
        alpha_max_i = numpy.amax(alpha_i)
        if alpha_max_i <= numpy.finfo(float).eps:
            alpha_max_i = 1
        alpha_cluster_mat[i,:] = alpha_i/alpha_max_i

# upload all variables to slycat web server
###########################################

# Setup a connection to the Slycat Web Server.
connection = slycat.web.client.connect(arguments)

# Create a new project to contain our model.
pid = connection.find_or_create_project(arguments.project_name, arguments.project_description)

# Create the new, empty model.
mid = connection.post_project_models(pid, "DAC", arguments.model_name, arguments.marking, 
    arguments.model_description)

# Upload our meta data as "dac-datapoints-meta"
###############################################

connection.put_model_arrayset(mid, "dac-datapoints-meta")

# Start our single "dac-datapoints-meta" array.
dimensions = [dict(name="row", end=len(meta_rows))]
attributes = [dict(name=name, type=type) for name, type in zip(meta_column_names, meta_column_types)]
connection.put_model_arrayset_array(mid, "dac-datapoints-meta", 0, dimensions, attributes)

# Upload data into the array.
for index, data in enumerate(meta_columns):
    slycat.web.client.log.info("Uploading meta data column {} of {} ({})".format(index, len(meta_columns), 
        meta_column_names[index]))
    connection.put_model_arrayset_data(mid, "dac-datapoints-meta", "0/%s/..." % index, [data])

# upload variable meta data as "dac-variables-meta"
###################################################

# (same as uploading datapoints.meta)
connection.put_model_arrayset(mid, "dac-variables-meta")

# Start our single "dac-datapoints-meta" array.
dimensions = [dict(name="row", end=len(meta_vars))]
attributes = [dict(name=name, type="string") for name in meta_var_col_names]
connection.put_model_arrayset_array(mid, "dac-variables-meta", 0, dimensions, attributes)

# Upload data into the array.
for index, data in enumerate(meta_var_cols):
    slycat.web.client.log.info("Uploading variable meta data column {} of {} ({})".format(index, len(meta_var_cols), 
        meta_var_col_names[index]))
    connection.put_model_arrayset_data(mid, "dac-variables-meta", "0/%s/..." % index, [data])

# upload alpha parameters as "dac-alpha-parms"
##############################################

# (same as dac-time-points)

# upload as parameter list
connection.put_model_parameter(mid, "dac-alpha-parms", alpha_parms)
slycat.web.client.log.info("Uploading alpha parameters.")

# upload variable order for alpha parameters as "dac-alpha-order"
#################################################################

# upload as parameter list
connection.put_model_parameter(mid, "dac-alpha-order", alpha_order)
slycat.web.client.log.info("Uploading alpha order parameters.")

# upload variable plot order as "dac-var-plot-order"
####################################################

# upload as list with 3 elements
connection.put_model_parameter(mid, "dac-var-plot-order", var_plot_order)
slycat.web.client.log.info("Uploading variable plot order parameters.")

# upload ui parameters as "dac-ui-parms"
########################################

connection.put_model_parameter(mid, "dac-ui-parms", dac_ui_parms)
slycat.web.client.log.info("Uploading dac ui parameters.")

# upload time as "dac-time-points"
##################################

connection.put_model_arrayset(mid, "dac-time-points")

# upload as a series of 1-d arrays
for i in range(num_vars):
    
    # set up time points array
    time_points = time_steps[i]
    dimensions = [dict(name="row", end=len(time_points))]
    attributes = [dict(name="value", type="float64")]
    
    # upload to slycat at array i
    connection.put_model_arrayset_array(mid, "dac-time-points", i, dimensions, attributes)
    connection.put_model_arrayset_data(mid, "dac-time-points", "%s/0/..." % i, [time_points])
    slycat.web.client.log.info("Uploading time points {}".format(i))

# upload variable_*.var data as "dac-var-data"
##############################################

connection.put_model_arrayset(mid, "dac-var-data")
    
# store each .var file in a seperate array in the arrayset
for i in range(num_vars):
    
    # set up dist matrices
    data_mat = variable[i]
    dimensions = [dict(name="row", end=int(data_mat.shape[0])),
        dict(name="column", end=int(data_mat.shape[1]))]
    attributes = [dict(name="value", type="float64")]
    
    # upload to slycat as seperate arrays
    connection.put_model_arrayset_array(mid, "dac-var-data", i, dimensions, attributes)
    connection.put_model_arrayset_data(mid, "dac-var-data", "%s/0/..." % i, [data_mat])
    slycat.web.client.log.info("Uploading data matrix {}".format(i))

# upload variable_*.dist data as "dac-var-dist"
###############################################

connection.put_model_arrayset(mid, "dac-var-dist")
    
# store each .dist file in a seperate array in the arrayset
for i in range(num_vars):
    
    # set up dist matrices
    dist_mat = var_dist[i]
    dimensions = [dict(name="row", end=int(dist_mat.shape[0])),
        dict(name="column", end=int(dist_mat.shape[1]))]
    attributes = [dict(name="value", type="float64")]
    
    # upload to slycat as seperate arrays
    connection.put_model_arrayset_array(mid, "dac-var-dist", i, dimensions, attributes)
    connection.put_model_arrayset_data(mid, "dac-var-dist", "%s/0/..." % i, [dist_mat])
    slycat.web.client.log.info("Uploading distance matrix {}".format(i))

# upload coordinate representation as "dac-mds-coords"
######################################################

connection.put_model_arrayset(mid, "dac-mds-coords")

# store as matrix
dimensions = [dict(name="row", end=int(mds_coords.shape[0])),
                dict(name="column", end=int(mds_coords.shape[1]))]
attributes = [dict(name="value", type="float64")]

# upload as slycat array
connection.put_model_arrayset_array(mid, "dac-mds-coords", 0, dimensions, attributes)
connection.put_model_arrayset_data(mid, "dac-mds-coords", "0/0/...", [mds_coords])
slycat.web.client.log.info("Uploading initial MDS coordinates.")

# upload full distance coordinate representation as "dac-full-mds-coords"
#########################################################################

connection.put_model_arrayset(mid, "dac-full-mds-coords")

# store as matrix
dimensions = [dict(name="row", end=int(full_mds_coords.shape[0])),
                dict(name="column", end=int(full_mds_coords.shape[1]))]
attributes = [dict(name="value", type="float64")]

# upload as slycat array
connection.put_model_arrayset_array(mid, "dac-full-mds-coords", 0, dimensions, attributes)
connection.put_model_arrayset_data(mid, "dac-full-mds-coords", "0/0/...", [full_mds_coords])
slycat.web.client.log.info("Uploading scaling for MDS coordinates.")

# upload alpha values for property clustering button as "dac-alpha-clusters"
############################################################################

connection.put_model_arrayset(mid, "dac-alpha-clusters")

# store as matrix
dimensions = [dict(name="row", end=int(alpha_cluster_mat.shape[0])),
                dict(name="column", end=int(alpha_cluster_mat.shape[1]))]
attributes = [dict(name="value", type="float64")]

# upload as slycat array
connection.put_model_arrayset_array(mid, "dac-alpha-clusters", 0, dimensions, attributes)
connection.put_model_arrayset_data(mid, "dac-alpha-clusters", "0/0/...", [alpha_cluster_mat])
slycat.web.client.log.info("Uploading alpha values for clustering.")

# finished uploading data
#########################

# Signal that we're done uploading data to the model.  This lets Slycat Web
# Server know that it can start computation.
connection.post_model_finish(mid)

# Wait until the model is ready.
connection.join_model(mid)

# Supply the user with a direct link to the new model.
slycat.web.client.log.info("Your new model is located at %s/models/%s" % (arguments.host, mid))


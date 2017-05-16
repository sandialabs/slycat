# This file contains the python code which registers the dial-a-cluster
# plugin with slycat.  It defines the python modules which are called
# by the web-server in order to compute, for example, the MDS coordinates
# on the server, by request of the client.
#
# S. Martin
# 1/28/2015

def register_slycat_plugin(context):
  
    import datetime
    import json
    import os
    import slycat.web.server
    import numpy
    from scipy import optimize
    from scipy import spatial
    import imp
    import cherrypy

    def finish(database, model):
        slycat.web.server.update_model(database, model,
		    state="finished", result="succeeded",
		    finished=datetime.datetime.utcnow().isoformat(),
		    progress=1.0, message="")

    def page_html(database, model):
        return open(os.path.join(os.path.dirname(__file__), 
                    "dac-ui.html"), "r").read()

    def parse_pts_data (database, model, verb, type, command, **kwargs):
        """
        Reads in the previously uploaded CSV/META data from the server
        and processes it/combines it into data in the DAC generic format,
        finally pushing that data to the server.  Problems are described
        and returned to the calling function.
        """

        # ad-hoc "global" parameters to eliminate likely unusable PTS files

        # minimum number of time points in a CSV file
        CSV_MIN_SIZE = 10

        # minimum number of digitizers in a CSV file
        MIN_NUM_DIG = 3

        # Parsing the CSV/META files
        # --------------------------

        # keep a parsing error log to help user correct input data
        # (each array entry is a string)
        parse_error_log = []

        # get csv file names and meta file names (same) from kwargs
        # meta_file_names = kwargs["0"]

        # upload meta file names
        meta_file_names = slycat.web.server.get_model_parameter(database, model, "dac-wizard-file-names")

        # make sure csv and meta files names are arrays
        # (note csv_file_names and meta_file_names should be same size arrays)
        if not(isinstance(meta_file_names, list)):
            meta_file_names = [meta_file_names]

        # get meta/csv data, store as arrays of dictionaries
        # (skip bad/empty files)
        wave_data = []
        table_data = []
        csv_data = []
        dig_id = []
        test_op_id = []
        file_name = []
        table_keys = []
        for i in range(len(meta_file_names)):

            # get csv data
            csv_data_i = slycat.web.server.get_model_arrayset_data(
                database, model, "dac-pts-csv", "%s/.../..." % i)

            # check for an empty csv file
            if len(csv_data_i[0]) < CSV_MIN_SIZE:
                parse_error_log.append("CSV data file has less than " + str(CSV_MIN_SIZE)
                                       + " entries -- skipping " + meta_file_names[i])
                continue

            # get meta data
            meta_data_i = slycat.web.server.get_model_arrayset_data(
                database, model, "dac-pts-meta", "%s/0/..." % i)
            meta_data_i = meta_data_i[0]

            # make dictionary for wave, table data
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
            file_name.append(meta_file_names[i])

        # look for unique test-op ids (these are the rows in the metadata table)
        uniq_test_op, uniq_test_op_clusts = numpy.unique(test_op_id, return_inverse = True)

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
                parse_error_log.append("Less than " + str(MIN_NUM_DIG) +
                                       " time series -- skipping test-op id #"
                                       + str(uniq_test_op[i]))
                continue

            # store test inds for each row and digitizer ids (sorted)
            test_inds.append(test_i_inds)
            test_dig_ids.append(dig_ids_i)

            # keep track of total number of digitizers
            for j in range(len(dig_ids_i)):
                if not dig_ids_i[j] in dig_id_keys:
                    dig_id_keys.append(dig_ids_i[j])

        # screen for intersecting digitizer ids
        keep_dig_ids = dig_id_keys
        for i in range(len(test_dig_ids)):
            keep_dig_ids = list(set(keep_dig_ids) & set(test_dig_ids[i]))

        # add removed ids to parse error log
        for i in range(len(dig_id_keys)):
            if not dig_id_keys[i] in keep_dig_ids:
                parse_error_log.append("Not found in all test ops --- skipping digitizer #" +
                                       str(dig_id_keys[i]))

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

        # construct meta data table and variable/time dictionaries
        meta_column_names = table_keys
        meta_column_types = ["string" for name in meta_column_names]
        meta_rows = []
        var_data = [[] for key in dig_id_keys]
        time_data = [[] for key in dig_id_keys]
        for i in range(len(test_inds)):

            # get indices for test op
            test_i_inds = test_inds[i]

            # check that table data/wave form data is consistent
            for j in range(len(test_i_inds)):
                if table_data[test_i_inds[j]] != table_data[test_i_inds[0]]:
                    parse_error_log.append("Inconsistent meta data for test-op id #" + str(uniq_test_op[i]))

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
                time_data[j].append(csv_data[test_i_inds[j]][2])
                var_data[j].append(csv_data[test_i_inds[j]][3])


        # convert from row-oriented to column-oriented data, and convert to numeric columns where possible.
        meta_columns = zip(*meta_rows)
        for index in range(len(meta_columns)):
            try:
                meta_columns[index] = numpy.array(meta_columns[index], dtype="float64")
                meta_column_types[index] = "float64"
            except:
                meta_columns[index] = numpy.array(meta_columns[index], dtype="string")

        # construct variables.meta table, variable/distance matrices, and time vectors
        meta_var_col_names = ["Name", "Time Units", "Units", "Plot Type"]
        meta_var_col_types = ["string" for name in meta_var_col_names]
        meta_vars = []
        time_steps = []
        variable = []
        var_dist = []
        for i in range(len(dig_id_keys)):

            # row i for variables.meta table
            name_i = wave_data[test_inds[0][i]].get("WF_DIG_LABEL", "WF_DIG_ID " + str(dig_id_keys[i]))
            units_i = wave_data[test_inds[0][i]].get("WF_Y_UNITS", "Not Given")
            time_units_i = wave_data[test_inds[0][i]].get("WF_X_UNITS", "Not Given")
            plot_type_i = "Curve"

            # time vector for digitizer i
            time_i = time_data[0][i]
            max_time_i_len = len(time_i)

            # look through each set of test indices to see if units are unchanged
            meta_vars = []
            for j in range(len(test_inds)):

                # get units from next set of test indices
                units_j = wave_data[test_inds[j][i]].get("WF_Y_UNITS")
                time_units_j = wave_data[test_inds[j][i]].get("WF_X_UNITS")

                # issue warning if units are not the same
                if units_i != units_j:
                    parse_error_log.append("Units for test op #" + str(test_op_id[test_inds[j][i]])
                                           + " inconsistent with test op #" + str(test_op_id[test_inds[0][i]])
                                           + " for " + name_i + ".")

                # issue warning if time units are not the same
                if time_units_i != time_units_j:
                    parse_error_log.append("Time units for test op #" + str(test_op_id[test_inds[j][i]])
                                           + " inconsistent with test op #" + str(test_op_id[test_inds[0][i]])
                                           + " for " + name_i + ".")

                # populate variables.meta table
                meta_vars.append([name_i, units_i, time_units_i, plot_type_i])

                # intersect time vector
                time_i = list(set(time_i) & set(time_data[i][j]))
                max_time_i_len = max(max_time_i_len, len(time_data[i][j]))

            # check if time vectors were inconsistent
            if len(time_i) < max_time_i_len:
                parse_error_log.append("Inconsistent time points for digitizer #" + str(dig_id_keys[i])
                                       + " -- reduced to " + str(len(time_i)) + " time points.")

            # check if reduction is below minimum threshold
            if len(time_i) < CSV_MIN_SIZE:

                # make time vector generic length CSV_MIN_SIZE, make data vectors 0
                time_steps.append (range(1,CSV_MIN_SIZE+1))
                variable_i = numpy.zeros((len(test_inds),CSV_MIN_SIZE))
                variable.append (variable_i)

                # log as an error
                parse_error_log.append("Common time points for digitizer #" + str(dig_id_keys[i]) +
                                       " are less than " + str(CSV_MIN_SIZE) + " -- setting values to zero.")

            else:

                # push time vector to list of time vectors
                time_steps.append (time_i)

                # intersect variable data
                variable_i = numpy.zeros((len(test_inds),len(time_i)))
                for j in range(0,len(test_inds)):
                    dict_time_j = dict((val, ind) for ind, val in enumerate(time_data[i][j]))
                    time_j_inds = [dict_time_j[val] for val in time_i]
                    variable_i[j:] = var_data[i][j][time_j_inds]
                variable.append (variable_i)

            # create pairwise distance matrix
            dist_i = spatial.distance.pdist(variable_i)
            var_dist.append(spatial.distance.squareform (dist_i))

        # Push DAC variables to slycat server
        # -----------------------------------

        # Remove CSV/META files in slycat server
        # --------------------------------------

        # returns parsing problems for display to user
        return json.dumps(parse_error_log)


    def init_mds_coords(database, model, verb, type, command, **kwargs):
        """
        Computes and stores into the slycat database the variables
        "dac-mds-coords", "dac-full-mds-coords", and "dac-alpha-clusters".

        Assumes everything needed is already stored in the slycat
        database and is called from JS using client.get_model_command with
        no arguments.

        Used to initialize the MDS coordinates from the dac wizard.
        """

        # compute MDS coords
        # ------------------

        # get alpha parameters from slycat server
        alpha_values = slycat.web.server.get_model_parameter(
            database, model, "dac-alpha-parms")

        # get distance matrices as a list of numpy arrays from slycat server
        var_dist = []
        for i in range(len(alpha_values)):
            var_dist_i = next(iter(slycat.web.server.get_model_arrayset_data(
                database, model, "dac-var-dist", "%s/0/..." % i)))
            var_dist_i = var_dist_i/numpy.amax(var_dist_i)
            var_dist.append(var_dist_i)

        # compute MDS coordinates assuming alpha = 1 for scaling
        full_mds_coords = dac.compute_coords(var_dist, numpy.ones(len(alpha_values)))
        full_mds_coords = full_mds_coords[0][:, 0:3]

        # compute preliminary coordinates
        unscaled_mds_coords = dac.compute_coords(var_dist, numpy.array(alpha_values))
        unscaled_mds_coords = unscaled_mds_coords[0][:, 0:3]

        # scale using full coordinates
        mds_coords = dac.scale_coords(unscaled_mds_coords, full_mds_coords)

        # compute alpha cluster parameters
        # --------------------------------

        # number of time series varables
        num_vars = len(alpha_values)

        # get metadata information
        metadata = slycat.web.server.get_model_arrayset_metadata (database, model, "dac-datapoints-meta")

        # number of columns of metadata
        metadata_cols = metadata[0]['attributes']
        num_meta_cols = len(metadata_cols)

        # data type of each column
        meta_column_types = []
        for i in range(num_meta_cols):
            meta_column_types.append (metadata_cols[i]['type'])

        # number of time series (data points)
        num_time_series = metadata[0]["shape"][0]

        # get actual metadata
        meta_columns = slycat.web.server.get_model_arrayset_data (database, model, "dac-datapoints-meta", "0/.../...")

        # form a matrix with each distance matrix as a column (this is U matrix)
        all_dist_mat = numpy.zeros((num_time_series * num_time_series, num_vars))
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

        # upload computations to slycat server
        # ------------------------------------

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

        # returns dummy argument indicating success
        return json.dumps({"success": 1})

    # computes new MDS coordinate representation using alpha values
    def update_mds_coords(database, model, verb, type, command, **kwargs):

        # convert kwargs into alpha values numpy array
        alpha_dict = numpy.array([[int(key), float(value)] for 
            (key,value) in kwargs.items()])
        alpha_values = alpha_dict[numpy.argsort(alpha_dict[:,0]),1]
        
        # get distance matrices as a list of numpy arrays from slycat server
        dist_mats = []
        for i in range(len(alpha_values)):
            dist_mats.append(next(iter(slycat.web.server.get_model_arrayset_data (
            	database, model, "dac-var-dist", "%s/0/..." % i))))
				       
        # get full MDS coordinate representation for scaling
        full_mds_coords = next(iter(slycat.web.server.get_model_arrayset_data (
			database, model, "dac-full-mds-coords", "0/0/...")))
			       
        # compute new MDS coords
        mds_coords = dac.compute_coords(dist_mats, alpha_values)
        mds_coords = mds_coords[0][:,0:3]
                
        # adjust MDS coords using full MDS scaling
        scaled_mds_coords = dac.scale_coords(mds_coords, 
            full_mds_coords)
        
        # return JSON matrix of coordinates to client
        return json.dumps({"mds_coords": scaled_mds_coords.tolist()})

    # computes Fisher's discriminant for selections 1 and 2 by the user
    def compute_fisher(database, model, verb, type, command, **kwargs):
		    
        # convert kwargs into selections in two numpy arrays
        sel_1 = numpy.array([int(value) for value in kwargs["0"] if int(value) >= 0])
        sel_2 = numpy.array([int(value) for value in kwargs["1"] if int(value) >= 0])

        # get number of distance matrices (same as number of alpha values)
    	alpha_values = slycat.web.server.get_model_parameter (
    	   database, model, "dac-alpha-parms")
    	
        # get distance matrices as a list of numpy arrays from slycat server
        dist_mats = []
        for i in range(len(alpha_values)):
            dist_mats.append(next(iter(slycat.web.server.get_model_arrayset_data (
            	database, model, "dac-var-dist", "%s/0/..." % i))))
            	
        # calculate Fisher's discriminant for each variable
        num_sel_1 = len(sel_1)
        num_sel_2 = len(sel_2)
        fisher_disc = numpy.zeros(len(alpha_values))
        for i in range(len(alpha_values)):
            sx2 = numpy.sum(numpy.square(dist_mats[i][sel_1,:][:,sel_1])) / (2 * num_sel_1)
            sy2 = numpy.sum(numpy.square(dist_mats[i][sel_2,:][:,sel_2])) / (2 * num_sel_2)
            uxuy2 = (numpy.sum(numpy.square(dist_mats[i][sel_1,:][:,sel_2])) / 
                (num_sel_1 * num_sel_2) - sx2 / num_sel_1 - sy2 / num_sel_2)
            fisher_disc[i] = (uxuy2 / (sx2 + sy2))

        # scale discriminant values between 0 and 1
    	fisher_min = numpy.amin(fisher_disc)
        fisher_max = numpy.amax(fisher_disc)
        fisher_disc = (fisher_disc - fisher_min) / (fisher_max - fisher_min)
    	
        # return unsorted discriminant values as JSON array
    	return json.dumps({"fisher_disc": fisher_disc.tolist()})


    # import dac_compute_coords module from source by hand
    dac = imp.load_source('dac_compute_coords', 
        os.path.join(os.path.dirname(__file__), 'py/dac_compute_coords.py'))
           
    # register plugin with slycat           
    context.register_model("DAC", finish)
    context.register_page("DAC", page_html)
    context.register_model_command("GET", "DAC", "update_mds_coords", update_mds_coords)
    context.register_model_command("GET", "DAC", "compute_fisher", compute_fisher)
    context.register_model_command("GET", "DAC", "init_mds_coords", init_mds_coords)
    context.register_model_command("GET", "DAC", "parse_pts_data", parse_pts_data)

    # registry css resources with slycat
    context.register_page_bundle("DAC", "text/css", [
        os.path.join(os.path.dirname(__file__), "css/dac-ui.css"),
        os.path.join(os.path.dirname(__file__), "css/slickGrid/slick.grid.css"),
        os.path.join(os.path.dirname(__file__), "css/slickGrid/slick-default-theme.css"),
        os.path.join(os.path.dirname(__file__), "css/slickGrid/slick.headerbuttons.css"),
        os.path.join(os.path.dirname(__file__), "css/slickGrid/slick-slycat-theme.css"),
        ])

    # register js resources with slycat
    context.register_page_bundle("DAC", "text/javascript", [
        os.path.join(os.path.dirname(__file__), "js/jquery-ui-1.10.4.custom.min.js"),
        os.path.join(os.path.dirname(__file__), "js/jquery.layout-latest.min.js"),
        os.path.join(os.path.dirname(__file__), "js/d3.min.js"),
        os.path.join(os.path.dirname(__file__), "js/dac-layout.js"),
        os.path.join(os.path.dirname(__file__), "js/dac-request-data.js"),
        os.path.join(os.path.dirname(__file__), "js/dac-alpha-sliders.js"),
        os.path.join(os.path.dirname(__file__), "js/dac-alpha-buttons.js"),
        os.path.join(os.path.dirname(__file__), "js/dac-manage-selections.js"),
        os.path.join(os.path.dirname(__file__), "js/dac-plots.js"),
        os.path.join(os.path.dirname(__file__), "js/dac-scatter-plot.js"),
        os.path.join(os.path.dirname(__file__), "js/dac-ui.js"),
        os.path.join(os.path.dirname(__file__), "js/dac-table.js"),
        os.path.join(os.path.dirname(__file__), "js/slickGrid/jquery.event.drag-2.2.js"),
        os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.autotooltips.js"),
        os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.dataview.js"),
        os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.core.js"),
        os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.grid.js"),
        os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.headerbuttons.js"),
        os.path.join(os.path.dirname(__file__), "js/slickGrid/slick.rowselectionmodel.js"),
        ])

    # register input wizard with slycat
    context.register_wizard("DAC", "New Dial-A-Cluster Model", require={"action":"create", "context":"project"})
    context.register_wizard_resource("DAC", "ui.js", os.path.join(os.path.dirname(__file__), "js/dac-wizard.js"))
    context.register_wizard_resource("DAC", "ui.html", os.path.join(os.path.dirname(__file__), "dac-wizard.html"))
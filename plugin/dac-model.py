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

        # keep a parsing error log to help user correct input data
        # (each array entry is a string)
        parse_error_log = []

        # get csv file names and meta file names (same) from kwargs
        meta_file_names = kwargs["0"]

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
        for i in range(len(meta_file_names)):

            # get meta data
            meta_data_i = slycat.web.server.get_model_arrayset_data(
                database, model, "dac-pts-meta", "%s/0/..." % i)

            # convert to dictionary
            meta_dict_i = dict(meta_data_i[0])

            # check that keys are uniform throughout dataset
            if i == 0:
                meta_data_keys = set(meta_dict_i)
            if set(meta_dict_i) != meta_data_keys:
                parse_error_log.append("META data keys diverged -- skipping file " + meta_file_names[i])
                continue

            # get csv data
            csv_data_i = slycat.web.server.get_model_arrayset_data(
                database, model, "dac-pts-csv", "%s/.../..." % i)

            # check for an empty csv file
            if len(csv_data_i[0]) == 1:
                parse_error_log.append("CSV data file empty -- skipping " + meta_file_names[i])
                continue

            # split into wave/table data
            wave_data_i = {}
            table_data_i = {}
            for key in meta_dict_i:

                # strip off key prefix to obtain new key
                prefix = key[0:6]
                key_no_prefix = key[6:]

                # ignore [wave] prefix
                if prefix == "[wave]":
                    wave_data_i[key_no_prefix] = meta_dict_i[key]
                else:
                    table_data_i[key_no_prefix] = meta_dict_i[key]

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

        # find unique digitizer ids
        uniq_dig_id, uniq_dig_clusts = numpy.unique (dig_id, return_inverse = True)

        cherrypy.log.error(str(csv_data))
        cherrypy.log.error(str(wave_data))
        cherrypy.log.error(str(table_data))

        cherrypy.log.error(str(test_op_id))
        cherrypy.log.error(str(uniq_test_op))
        cherrypy.log.error(str(uniq_test_op_clusts))

        cherrypy.log.error(str(dig_id))
        cherrypy.log.error(str(uniq_dig_id))
        cherrypy.log.error(str(uniq_dig_clusts))

        # construct meta data table and store variable/time information for further processing
        #meta_column_names = []
        #meta_rows = []
        #var_data = []
        #time_data = []

        # flags to keep track of inconsistent table/wave form meta data
        var_warning = False

        # construct meta data table and variable meta data table
        for i in range(len(uniq_test_op)):

            # get csv data for test op i
            test_i_inds = numpy.where(uniq_test_op_clusts == i)[0]

            # check that table data/wave form data is consistent
            for j in range(len(test_i_inds)):
                if table_data[test_i_inds[j]] != table_data[test_i_inds[0]]:
                    parse_error_log.append("Inconsistent meta data for test-op id #" + str(uniq_test_op[i]))

            # use first row for table entry
            meta_rows.append (table_data[test_i_inds[0]])

                #if (wave_data[j]["WF_X_UNITS"] != wave_data[0]["WF_X_UNITS"]) or \
                #   (wave_data[j]["WF_Y_UNITS"] != wave_data[0]["WF_Y_UNITS"]):
                #    var_warning = True


            cherrypy.log.error(str(test_i_inds))

            # coalesce meta data into row of table
            #meta_dict_i = meta_data[test_i_inds[0]]

   #         cherrypy.log.error(str(meta_dict_i))

    #        cherrypy.log.error(str(meta_dict_i_no_wf))

            #meta_table =

            # look through test op ids for digitizer ids
            #for j in range(len(var_i_inds)):

                # get digitizer j variable and time information
             #   var_data[j].append(csv_data[var_i_inds[j]][2])
              #  time_data[j].append(csv_data[var_i_inds[j]][3])


        cherrypy.log.error(str(var_warning))

        cherrypy.log.error(str(meta_rows))
        
        cherrypy.log.error(str(parse_error_log))

        #cherrypy.log(str(var_data))
        #cherrypy.log(str(time_data))


        #
        # construct an array of lists for each test-op id, where the lists contain

        # returns dummy argument indicating success
        return json.dumps({"success": 1})


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
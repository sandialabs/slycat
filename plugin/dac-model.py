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
    import imp
    import cherrypy


    def finish(database, model):
        slycat.web.server.update_model(database, model,
		    state="finished", result="succeeded",
		    finished=datetime.datetime.utcnow().isoformat(),
		    progress=1.0, message="")


    def page_html(database, model):
        return open(os.path.join(os.path.dirname(__file__), 
                    "html/dac-ui.html"), "r").read()


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

        cherrypy.log.error("DAC: initializing MDS coords.")

        # get number of alpha values using array metadata
        meta_dist = slycat.web.server.get_model_arrayset_metadata(database, model, "dac-var-dist")
        num_vars = len(meta_dist)

        # check to see if the user wants to include a subset of variables
        if "artifact:dac-var-include-columns" in model:

            # load include columns
            var_include_columns = slycat.web.server.get_model_parameter(database, model, "dac-var-include-columns")

        else:

            # if no columns specified, use all variables
            var_include_columns = range(0, num_vars)

        # get distance matrices as a list of numpy arrays from slycat server
        var_dist = []
        for i in var_include_columns:
            var_dist_i = next(iter(slycat.web.server.get_model_arrayset_data(
                database, model, "dac-var-dist", "%s/0/..." % i)))
            var_dist.append(var_dist_i)

        # compute initial MDS coordinates
        mds_coords, full_mds_coords = dac.init_coords(var_dist)

        # compute alpha cluster parameters
        # --------------------------------

        # get metadata information
        metadata = slycat.web.server.get_model_arrayset_metadata (database, model, "dac-datapoints-meta")

        # number of columns of metadata
        metadata_cols = metadata[0]['attributes']
        num_meta_cols = len(metadata_cols)

        # data type of each column
        meta_column_types = []
        for i in range(num_meta_cols):
            meta_column_types.append (metadata_cols[i]['type'])

        # get actual metadata
        meta_columns = slycat.web.server.get_model_arrayset_data (database, model, "dac-datapoints-meta", "0/.../...")

        # compute alpha cluster values for NNLS cluster button
        alpha_cluster_mat_included = dac.compute_alpha_clusters (var_dist, meta_columns, meta_column_types)

        # re-size alpha values to actual number of variables (not just number of included variables)
        alpha_cluster_mat = numpy.zeros((num_meta_cols, num_vars))
        alpha_cluster_mat[:, var_include_columns] = alpha_cluster_mat_included

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

        # upload done indicator for polling routine
        slycat.web.server.put_model_parameter(database, model, "dac-polling-progress", ["Done", 100])
        cherrypy.log.error("DAC: done initializing MDS coords.")

        # returns dummy argument indicating success
        return json.dumps({"success": 1})


    # computes new MDS coordinate representation using alpha values
    def update_mds_coords(database, model, verb, type, command, **kwargs):

        # get alpha values and subset mask
        alpha_values = numpy.array(kwargs["alpha"])
        subset_mask = numpy.array(kwargs["subset"])
        subset_center = numpy.array(kwargs["subset_center"])
        old_coords = numpy.array(kwargs["current_coords"])

        # only use included variables
        include_columns = numpy.array(kwargs["include_columns"])

        # get distance matrices as a list of numpy arrays from slycat server
        dist_mats = []
        for i in include_columns:
            dist_mats.append(next(iter(slycat.web.server.get_model_arrayset_data (
            	database, model, "dac-var-dist", "%s/0/..." % i))))

        # get full MDS coordinate representation for scaling
        full_mds_coords = next(iter(slycat.web.server.get_model_arrayset_data (
			database, model, "dac-full-mds-coords", "0/0/...")))

        # compute new MDS coords (truncate coords for old models)
        mds_coords = dac.compute_coords(dist_mats, alpha_values[include_columns], old_coords[:,0:2], subset_mask)

        # adjust MDS coords using full MDS scaling (truncate coords for old models)
        scaled_mds_coords = dac.scale_coords(mds_coords, 
            full_mds_coords[:,0:2], subset_mask, subset_center)

        # return data using content function
        def content():
            yield json.dumps({"mds_coords": scaled_mds_coords.tolist()})

        return content()


    # computes Fisher's discriminant for selections 1 and 2 by the user
    def compute_fisher(database, model, verb, type, command, **kwargs):

        # convert kwargs into selections in two numpy arrays
        sel_1 = numpy.array(kwargs["selection_1"])
        sel_2 = numpy.array(kwargs["selection_2"])
        include_columns = numpy.array(kwargs["include_columns"])

        cherrypy.log.error(str(include_columns))

        # get number of alpha values using array metadata
        meta_dist = slycat.web.server.get_model_arrayset_metadata(database, model, "dac-var-dist")
        num_vars = len(meta_dist)

        # get distance matrices as a list of numpy arrays from slycat server
        dist_mats = []
        for i in range(num_vars):

            # only get distance matrices for included columns
            if i in include_columns:
                dist_mats.append(next(iter(slycat.web.server.get_model_arrayset_data (
                    database, model, "dac-var-dist", "%s/0/..." % i))))

            else:
                dist_mats.append(0)
            	
        # calculate Fisher's discriminant for each variable
        num_sel_1 = len(sel_1)
        num_sel_2 = len(sel_2)
        fisher_disc = numpy.zeros(num_vars)
        for i in include_columns:
            sx2 = numpy.sum(numpy.square(dist_mats[i][sel_1,:][:,sel_1])) / (2 * num_sel_1)
            sy2 = numpy.sum(numpy.square(dist_mats[i][sel_2,:][:,sel_2])) / (2 * num_sel_2)
            uxuy2 = (numpy.sum(numpy.square(dist_mats[i][sel_1,:][:,sel_2])) / 
                (num_sel_1 * num_sel_2) - sx2 / num_sel_1 - sy2 / num_sel_2)

            # make sure we don't divide by zero
            if (sx2 + sy2) > numpy.finfo(float).eps:
                fisher_disc[i] = (uxuy2 / (sx2 + sy2))
            else:
                fisher_disc[i] = uxuy2

        # scale discriminant values between 0 and 1
    	fisher_min = numpy.amin(fisher_disc)
        fisher_max = numpy.amax(fisher_disc)

        # again don't divide by zero
        if fisher_max > fisher_min:
            fisher_disc = (fisher_disc - fisher_min) / (fisher_max - fisher_min)

        # return unsorted discriminant values as JSON array
    	return json.dumps({"fisher_disc": fisher_disc.tolist()})


    # sub-samples time and variable data from database and pushes to "dac-sub-time-points"
    # and "dac-sub-var-data"
    def subsample_time_var (database, model, verb, type, command, **kwargs):

        # get input parameters

        # first parameter is just passed along then echoed back as a result
        plot_id = int(kwargs["0"])

        # variable number in database
        database_ind = int(kwargs["1"])

        # rows of matrix to subsample
        rows = kwargs["2"]

        # remove first two entries (padding to correctly pass an array to python from js)
        rows.pop(0)
        rows.pop(0)

        # number of samples to return in subsample
        num_subsample = int(kwargs["3"])

        # range of samples (x-value)
        if kwargs["4"] == "-Inf":
            x_min = -float("Inf")
        else:
            x_min = float(kwargs["4"])

        if kwargs["5"] == "Inf":
            x_max = float("Inf")
        else:
            x_max = float(kwargs["5"])

        # load time points and data from database
        time_points = slycat.web.server.get_model_arrayset_data (
            database, model, "dac-time-points", "%s/0/..." % database_ind)[0]

        # get desired rows of variable data from database (one at a time)
        # var_data = []
        # num_rows = len(rows)
        # for i in range(0, num_rows):
        #     if i == 0:
        #         first_slice = slycat.web.server.get_model_arrayset_data (
        #             database, model, "dac-var-data", "%s/0/%s" % (database_ind, rows[0]))[0]
        #         num_cols = len(first_slice)
        #         var_data = numpy.zeros((num_rows, num_cols))
        #         var_data[0,:] = first_slice
        #     else:
        #         var_data[i,:] = slycat.web.server.get_model_arrayset_data (
        #             database, model, "dac-var-data", "%s/0/%s" % (database_ind, rows[i]))[0]

        # get desired rows of variable data from database (all at once)
        num_rows = len(rows)
        var_data = []
        if num_rows > 0:
            str_rows = [str(x) for x in rows]
            hyper_rows = "|".join(str_rows)

            # load desired rows using hyperchunks
            var_data = numpy.array(slycat.web.server.get_model_arrayset_data (
                database, model, "dac-var-data", "%s/0/%s" % (database_ind, hyper_rows)))

        # find indices within user selected range
        range_inds = numpy.where((time_points >= x_min) & (time_points <= x_max))[0]

        # add indices just before and just after user selected range
        if range_inds[0] > 0:
            range_inds = numpy.insert(range_inds, 0, range_inds[0]-1)
        if range_inds[-1] < (len(time_points)-1):
            range_inds = numpy.append(range_inds, range_inds[-1]+1)

        # compute step size for subsample
        num_samples = len(range_inds)
        subsample_stepsize = int(numpy.ceil(float(num_samples) / float(num_subsample)))
        sub_inds = range_inds[0::subsample_stepsize]

        # add in last index, if not already present
        if sub_inds[-1] != range_inds[-1]:
            sub_inds = numpy.append(sub_inds, range_inds[-1])

        # get subsamples
        time_points_subsample = time_points[sub_inds]
        if len(var_data) > 0:
            var_data_subsample = var_data[:,sub_inds].tolist()
        else:
            var_data_subsample = []

        # return data using content function
        def content():
            yield json.dumps({"time_points": time_points_subsample.tolist(),
                              "var_data": var_data_subsample,
                              "resolution": subsample_stepsize,
                              "plot_id": plot_id})

        return content()


    # import dac_compute_coords module from source by hand
    dac = imp.load_source('dac_compute_coords', 
        os.path.join(os.path.dirname(__file__), 'py/dac_compute_coords.py'))
           
    # register plugin with slycat           
    context.register_model("DAC", finish)
    context.register_page("DAC", page_html)
    context.register_model_command("POST", "DAC", "update_mds_coords", update_mds_coords)
    context.register_model_command("POST", "DAC", "compute_fisher", compute_fisher)
    context.register_model_command("GET", "DAC", "init_mds_coords", init_mds_coords)
    context.register_model_command("GET", "DAC", "subsample_time_var", subsample_time_var)

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
    context.register_wizard_resource("DAC", "ui.html", os.path.join(os.path.dirname(__file__), "html/dac-wizard.html"))

    # register parse info menu item
    context.register_wizard("dac-show-parse-log", "Model Parse Log",
                            require={"action": "info", "context": "model", "model-type": ["DAC"]})
    context.register_wizard_resource("dac-show-parse-log", "ui.js", os.path.join(os.path.dirname(__file__), "js/dac-parse-log.js"))
    context.register_wizard_resource("dac-show-parse-log", "ui.html", os.path.join(os.path.dirname(__file__), "html/dac-parse-log.html"))

    # register preferences menu item
    context.register_wizard("dac-preferences-wizard", "Model Preferences",
                            require={"action": "edit", "context": "model", "model-type": ["DAC"]})
    context.register_wizard_resource("dac-preferences-wizard", "ui.js", os.path.join(os.path.dirname(__file__), "js/dac-preferences-wizard.js"))
    context.register_wizard_resource("dac-preferences-wizard", "ui.html", os.path.join(os.path.dirname(__file__), "html/dac-preferences-wizard.html"))
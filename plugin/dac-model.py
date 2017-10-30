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
                    "dac-ui.html"), "r").read()

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

        # get distance matrices as a list of numpy arrays from slycat server
        var_dist = []
        for i in range(num_vars):
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
        alpha_cluster_mat = dac.compute_alpha_clusters (var_dist, meta_columns, meta_column_types)

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

        # get number of alpha values using array metadata
        meta_dist = slycat.web.server.get_model_arrayset_metadata(database, model, "dac-var-dist")
        num_vars = len(meta_dist)

        # get distance matrices as a list of numpy arrays from slycat server
        dist_mats = []
        for i in range(num_vars):
            dist_mats.append(next(iter(slycat.web.server.get_model_arrayset_data (
            	database, model, "dac-var-dist", "%s/0/..." % i))))
            	
        # calculate Fisher's discriminant for each variable
        num_sel_1 = len(sel_1)
        num_sel_2 = len(sel_2)
        fisher_disc = numpy.zeros(num_vars)
        for i in range(num_vars):
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


    # import dac_compute_coords module from source by hand
    dac = imp.load_source('dac_compute_coords', 
        os.path.join(os.path.dirname(__file__), 'py/dac_compute_coords.py'))
           
    # register plugin with slycat           
    context.register_model("DAC", finish)
    context.register_page("DAC", page_html)
    context.register_model_command("GET", "DAC", "update_mds_coords", update_mds_coords)
    context.register_model_command("GET", "DAC", "compute_fisher", compute_fisher)
    context.register_model_command("GET", "DAC", "init_mds_coords", init_mds_coords)

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
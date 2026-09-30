# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

# coding=utf-8


def register_slycat_plugin(context):
    """
    Called during startup when the plugin is loaded.
    :param context:
    """
    import cherrypy
    import datetime
    import json
    import numpy
    import scipy.stats as stats
    import os
    import re
    import slycat.web.server

    def media_columns(database, model, verb, type, command, **kwargs):
        """
        Identify columns in the input data that contain media URIs (image or video).
        Arguments:
          database {Object} -- connection to the database
          current_selected_model {object} -- json meta data for a model
          verb {object} -- not used
          type {object} -- not used
          command {string} -- command name
        Returns:
          [type] -- [description]
        """

        expression = re.compile("smb://|file://|http")
        search = numpy.vectorize(lambda x: bool(expression.search(x)))

        columns = []
        metadata = slycat.web.server.get_model_arrayset_metadata(
            database, model, "data-table", "0"
        )["arrays"][0]
        for index, attribute in enumerate(metadata["attributes"]):
            if isinstance(attribute["type"], bytes):
                if attribute["type"].decode() != "string":
                    continue
            else:
                if str(attribute["type"]) != "string":
                    continue
            column = slycat.web.server.get_model_arrayset_data(
                database, model, "data-table", "0/%s/..." % index
            )
            if not numpy.any(search(column)):
                continue
            columns.append(index)

        cherrypy.response.headers["content-type"] = "application/json"
        return json.dumps(columns).encode()

    def delete_table(database, current_selected_model, verb, type, command, **kwargs):
        """
        deletes project data from a parameter space model as well as any other model
        that is using the data.

        Arguments:
          database {Object} -- connection to the database
          current_selected_model {object} -- json meta data for a model
          verb {object} -- not used
          type {object} -- not used
          command {string} -- command name

        Returns:
          [json] -- {"success": "success", "linked_models": linked_models}
        """
        did = None
        if (
            "project_data" in current_selected_model
            and len(current_selected_model["project_data"]) > 0
        ):
            did = current_selected_model["project_data"][0]
        pid = current_selected_model["project"]
        models = [
            model
            for model in database.scan(
                "slycat/project-models", startkey=pid, endkey=pid
            )
        ]
        linked_models = []
        if did:
            for model in models:
                if (
                    "project_data" in model
                    and model["model-type"] == "parameter-image"
                    and len(model["project_data"]) > 0
                    and model["project_data"][0] == did
                ):
                    with slycat.web.server.get_model_lock(model["_id"]):
                        project_data = database.get("project_data", did)
                        for index, pd_mid in enumerate(project_data["mid"]):
                            if pd_mid == model["_id"]:
                                del project_data["mid"][index]
                                database.save(project_data)
                        model["project_data"] = []
                        database.save(model)
                    if current_selected_model["_id"] != model["_id"]:
                        linked_models.append(model["_id"])
                        if "artifact:data-table" in model:
                            slycat.web.server.delete_model_parameter(
                                database, model, aid="data-table"
                            )
        response = {"success": "success", "linked_models": linked_models}
        return json.dumps(response)

    # database, parser, input, attachment, model, aid
    def update_table(database, model, verb, type, command, **kwargs):
        """
        updates all linked models to use the current project data

        Arguments:
          database {Object} -- connection to the database
          current_selected_model {object} -- json meta data for a model
          verb {object} -- not used
          type {object} -- not used
          command {string} -- command name

        Returns:
          [json] -- {"success": "success changed linked models"}
        """
        linked_models = kwargs["linked_models"]
        if len(linked_models) <= 0:
            response = {"success": "success nothing to change"}
            return json.dumps(response)
        did = model["project_data"][0]
        project_data = database.get("project_data", did)
        attachment = database.get_attachment(project_data, "content")
        file_attachment = attachment.read()
        file_attachment = file_attachment.decode("utf-8")
        models = [
            model
            for model in database.scan(
                "slycat/project-models",
                startkey=model["project"],
                endkey=model["project"],
            )
        ]
        for model in models:
            for linked_model_id in linked_models:
                if model["_id"] == linked_model_id:
                    if "project_data" not in model:
                        model["project_data"] = []
                    with slycat.web.server.get_model_lock(model["_id"]):
                        model["project_data"].append(project_data["_id"])
                        project_data["mid"].append(model["_id"])
                        database.save(project_data)
                        database.save(model)
                    slycat.web.server.parse_existing_file(
                        database,
                        "slycat-csv-parser",
                        True,
                        [file_attachment],
                        model,
                        "data-table",
                    )
        response = {"success": "success changed linked models"}
        return json.dumps(response)

    # compute means and confidence intervals from data table
    def compute_means_ci(database, model, verb, type, command, **kwargs):

        # get output columns/names
        response, output_columns, output_column_names = \
            _get_model_columns(database, model, 'output', 'means/CI')
        
        # check for errors
        if response is not None:
            return json.dumps(response)

        # get the output columns data
        data_table = []
        for column in output_columns:
            data_table.append(slycat.web.server.get_model_arrayset_data(
                database, model, "data-table", "0/%s/..." % column)[0])

        # compute means-ci table
        mean_ci_table = [['Output', 'Mean', 'Lower CI', 'Upper CI']]
        for i in range(len(output_columns)):
            mean, lower_CI, upper_CI = _compute_CI (data_table[i])
            mean_ci_table.append([output_column_names[i], 
                                  mean, lower_CI, upper_CI])
        
        # return table
        return json.dumps({"mean_ci_table": mean_ci_table})

    # helper function to compute confidence intervals for a vector of data
    def _compute_CI (data, confidence=0.95):
        
        # remove NaNs
        cleaned_data = data[~numpy.isnan(data)]

        # get mean
        mean = numpy.mean(cleaned_data)

        # get confidence intervals
        ci_lower, ci_upper = stats.t.interval(
            confidence, 
            df=len(cleaned_data) - 1, 
            loc=mean,
            scale=stats.sem(cleaned_data)
        )

        # for constant columns use no CI
        if numpy.isnan(ci_lower):
            ci_lower = mean
        if numpy.isnan(ci_upper):
            ci_upper = mean

        return mean, ci_lower, ci_upper

    # compute pearson's correlation from data table
    def compute_pearsons(database, model, verb, type, command, **kwargs):

        # get input columns/names
        response, input_columns, input_column_names = \
            _get_model_columns(database, model, 'input', "Pearson's")
        if response is not None:
            return json.dumps(response)
        
        # get output columns/names
        response, output_columns, output_column_names = \
            _get_model_columns(database, model, 'output', "Pearson's")
        if response is not None:
            return json.dumps(response)
        
        # get the input column data
        input_data_table = []
        for column in input_columns:
            input_data_table.append(slycat.web.server.get_model_arrayset_data(
                database, model, "data-table", "0/%s/..." % column)[0])
            
        # get the output column data
        output_data_table = []
        for column in output_columns:
            output_data_table.append(slycat.web.server.get_model_arrayset_data(
                database, model, "data-table", "0/%s/..." % column)[0])

        # compute pairwise Pearson's correlation matrix
        pearsons_mat = pairwise_pearson_corr(numpy.array(input_data_table).T, \
            numpy.array(output_data_table).T)
        
        # put correlations into table
        pearsons_table = [['Output'] + input_column_names]
        for i in range(len(output_columns)):
            pearsons_table.append([output_column_names[i]] + list(pearsons_mat[:,i]))

        # return table
        return json.dumps({"pearsons_table": pearsons_table})

    # helper function to compute pairwise correlation
    # from searching "pairwise pearson correlation between two matrices" in Google
    # modified to ignore NaNs
    def pairwise_pearson_corr(A, B):
        # A: shape (n_samples, n_features_A)
        # B: shape (n_samples, n_features_B)
        
        # remove rows with nans
        nan_rows = numpy.isnan(numpy.hstack((A,B))).any(axis=1)
        cleaned_A = A[~nan_rows]
        cleaned_B = B[~nan_rows]

        # Subtract mean of each column
        A_centered = cleaned_A - cleaned_A.mean(axis=0)
        B_centered = cleaned_B - cleaned_B.mean(axis=0)
        
        # Divide by standard deviation of each column
        A_std = A_centered.std(axis=0, ddof=1)
        B_std = B_centered.std(axis=0, ddof=1)
        
        A_norm = A_centered / A_std
        B_norm = B_centered / B_std
        
        # Compute correlation matrix via dot product
        # Result shape: (n_features_A, n_features_B)
        return numpy.dot(A_norm.T, B_norm) / (A.shape[0] - 1)

    # helper function to get column data/names
    # column_type is "input" or "output"
    def _get_model_columns (database, model, column_type, algorithm_name):

        # assume null response
        response = None
        model_columns = None
        model_column_names = None

        # get model columns
        model_columns = slycat.web.server.get_model_parameter(
            database, model, column_type + "-columns")

        # check if model columns are empty
        if len(model_columns) == 0:
            response = {"error": "No " + column_type + " columns.  Cannot compute " +
                        algorithm_name + " table without " + column_type + " columns.  " +
                        "Use Edit -> Select Columns to select " + column_type + " columns."}

        # get the table meta data (for model column names)
        metadata = slycat.web.server.get_model_arrayset_metadata(
            database, model, "data-table", "0")["arrays"][0]
        model_column_metadata = [metadata["attributes"][i] for i in model_columns]

        # check that output columns are floats
        for column in model_column_metadata:
            if column['type'] != b'float64':
                response = {"error": "Found non-numeric " + column_type + ' column "' + 
                            column['name'].decode() + '".  Cannot compute ' + algorithm_name + 
                            " table using non-numeric data."}

        # get output column names
        model_column_names = [column['name'].decode() for column in model_column_metadata]

        return response, model_columns, model_column_names

    def finish(database, model):
        """
        Called to finish the model.
        This function must return immediately,
        so any real work would be done in a separate thread.
        :param model:
          model ID in the data base
        :param database:
          our connection to couch db
        """

        prefix_x = "[XYpair X]"
        prefix_y = "[XYpair Y]"
        suffix_x = "X"
        suffix_y = "Y"

        # Get metadata for data-table
        metadata = slycat.web.server.get_model_arrayset_metadata(
            database, model, "data-table"
        )
        # Get metadata's attributes, which contain info about each column
        attributes = metadata[0]["attributes"]
        xy_pairs = {}

        # Iterate over columns and pull out any xy pairs
        for index, attribute in enumerate(attributes):
            name = attribute["name"].decode("utf-8")
            X = name.startswith(prefix_x)
            Y = name.startswith(prefix_y)
            validXYpair = X or Y
            if validXYpair:
                # Remove prefix
                label = name[len(prefix_x if X else prefix_y) :]
                # Remove suffix
                label = label[: -len(suffix_x if X else suffix_y)]
                # Remove whitespace
                label = label.strip()
                # Add entry for current label if one doesn't already exist
                if label not in xy_pairs:
                    xy_pairs[label] = {"x": [], "y": []}
                # Add x or y column index
                xy_pairs[label]["x" if X else "y"].append(index)

        xy_pairs_verified = []
        variable_aliases = {}
        # Iterate over xy_pairs and pull out only ones with a single x and single y
        for label, indices in xy_pairs.items():
            if len(indices["x"]) == 1 and len(indices["y"]) == 1:
                xy_pairs_verified.append(
                    {"label": label, "x": indices["x"][0], "y": indices["y"][0]}
                )
                # Create aliases for xy_pairs
                variable_aliases[indices["x"][0]] = f"{label} X"
                variable_aliases[indices["y"][0]] = f"{label} Y"

        # Save xy_pairs as a model parameter, if we have any
        if xy_pairs_verified:
            slycat.web.server.put_model_parameter(
                database, model, "xy-pairs", xy_pairs_verified
            )

            # Get the project data id if we have one for this model
            did = None
            if "project_data" in model and len(model["project_data"]) > 0:
                did = model["project_data"][0]
            # If we have a project data id, write variable-aliases to project data
            if did:
                project_data = database.get("project_data", did)
                slycat.web.server.put_project_data_parameter(
                    database, project_data, "variable_aliases", variable_aliases
                )
            # Otherwise write to the model's artifact:variable_aliases attribute
            else:
                slycat.web.server.put_model_parameter(
                    database, model, "variable_aliases", variable_aliases
                )

        slycat.web.server.update_model(
            database,
            model,
            state="finished",
            result="succeeded",
            finished=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            progress=1.0,
            message="",
        )

    # Register our new model type
    context.register_model("parameter-image", finish)

    # Register custom commands for use by wizards.
    context.register_model_command(
        "GET", "parameter-image", "media-columns", media_columns
    )
    context.register_model_command(
        "GET", "parameter-image", "delete-table", delete_table
    )
    context.register_model_command(
        "POST", "parameter-image", "update-table", update_table
    )

    # Register commands for UQ/SA analysis
    context.register_model_command(
        "POST", "parameter-image", "compute-means-ci", compute_means_ci
    )
    context.register_model_command(
        "POST", "parameter-image", "compute-pearsons", compute_pearsons
    )

    # Register custom wizards for creating PI models.
    context.register_wizard(
        "parameter-image",
        "New Parameter Space Model",
        require={"action": "create", "context": "project"},
    )

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

        expression = re.compile('smb://|file://|http')
        search = numpy.vectorize(lambda x: bool(expression.search(x)))

        columns = []
        metadata = slycat.web.server.get_model_arrayset_metadata(database, model, "data-table", "0")["arrays"][0]
        for index, attribute in enumerate(metadata["attributes"]):
            if isinstance(attribute["type"], bytes):
                if attribute["type"].decode() != "string":
                    continue
            else:
                if str(attribute["type"]) != "string":
                    continue
            column = slycat.web.server.get_model_arrayset_data(database, model, "data-table", "0/%s/..." % index)
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
        if "project_data" in current_selected_model and len(current_selected_model["project_data"]) > 0:
            did = current_selected_model["project_data"][0]
        pid = current_selected_model["project"]
        models = [model for model in
                  database.scan("slycat/project-models", startkey=pid, endkey=pid)]
        linked_models = []
        if did:
            for model in models:
                if "project_data" in model and model["model-type"] == "parameter-image" \
                        and len(model["project_data"]) > 0 and model["project_data"][0] == did:
                    with slycat.web.server.get_model_lock(model["_id"]):
                        project_data = database.get("project_data", did)
                        for index, pd_mid in enumerate(project_data["mid"]):
                            if pd_mid == model['_id']:
                                del project_data["mid"][index]
                                database.save(project_data)
                        model["project_data"] = []
                        database.save(model)
                    if current_selected_model["_id"] != model["_id"]:
                        linked_models.append(model["_id"])
                        if "artifact:data-table" in model:
                            slycat.web.server.delete_model_parameter(database, model, aid="data-table")
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
        file_attachment = file_attachment.decode('utf-8')
        models = [model for model in
                  database.scan("slycat/project-models", startkey=model["project"], endkey=model["project"])]
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
                    slycat.web.server.parse_existing_file(database, "slycat-csv-parser", True, [file_attachment], model, "data-table")
        response = {"success": "success changed linked models"}
        return json.dumps(response)

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

        prefix = '[XYpair]'
        suffix_x = 'X'
        suffix_y = 'Y'

        # Get metadata for data-table
        metadata = slycat.web.server.get_model_arrayset_metadata(database, model, "data-table")
        # Get metadata's attributes, which contain info about each column
        attributes = metadata[0]['attributes']
        xy_pairs = {}

        # Iterate over columns and pull out any xy pairs
        for index, attribute in enumerate(attributes):
            name = attribute['name'].decode("utf-8") 
            XYpair = name.startswith(prefix)
            X = name.endswith(suffix_x)
            Y = name.endswith(suffix_y)
            validXYpair = XYpair and (X or Y)
            if(validXYpair):
                # Remove prefix
                label = name[len(prefix):]
                # Remove suffix
                label = label[:-len(suffix_x)] if X else label[:-len(suffix_y)]
                # Remove whitespace
                label = label.strip()
                # Add entry for current label if one doesn't already exist
                if(label not in xy_pairs):
                    xy_pairs[label] = {'x': [], 'y': []}
                # Add x or y column index
                xy_pairs[label]['x' if X else 'y'].append(index)
        
        xy_pairs_verified = []
        # Iterate over xy_pairs and pull out only ones with a single x and single y
        for label, indices in xy_pairs.items():
            if(len(indices['x']) == 1 and len(indices['y']) == 1):
                xy_pairs_verified.append({'label': label, 'x': indices['x'][0], 'y': indices['y'][0]})
        
        # Save xy_pairs as a model parameter, if we have any
        if xy_pairs_verified:
            slycat.web.server.put_model_parameter(database, model, 'xy-pairs', xy_pairs_verified)

        slycat.web.server.update_model(database, model, state="finished", result="succeeded",
                                       finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

    # Register our new model type
    context.register_model("parameter-image", finish)

    # Register custom commands for use by wizards.
    context.register_model_command("GET", "parameter-image", "media-columns", media_columns)
    context.register_model_command("GET", "parameter-image", "delete-table", delete_table)
    context.register_model_command("POST", "parameter-image", "update-table", update_table)

    # Register custom wizards for creating PI models.
    context.register_wizard("parameter-image", "New Parameter Space Model",
                            require={"action": "create", "context": "project"})

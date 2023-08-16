# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import csv
import time
import numpy

import slycat.web.server
import cherrypy
import h5py
import io

def parse_file(file, model, database):
    error_message = '' # Implement error handling later
    attributes = []
    input_size = 0
    output_size = 0
    input_columns = []
    output_columns = []
    f = io.BytesIO(file)
    f.seek(0)
    with h5py.File(f, 'r') as h5_file:
        unformatted_responses = list(h5_file['models']['simulation']['model1']['responses']['functions']) # Inputs
        unformatted_variables = list(h5_file['models']['simulation']['model1']['variables']['continuous']) # Outputs
        input_size = len(unformatted_responses[0]) # Each entry is a row, so the length of the row will give us the number of columns
        output_size = len(unformatted_responses[0].shape)
        input_columns = [i for i in range(input_size)]
        output_columns = [i for i in range(output_size)]

        combined_dataset = numpy.concatenate((unformatted_responses, unformatted_variables), axis=1)
        converted_dataset = []
        separated_dataset = [] # This will get sent to create_project_data for saving the inputs and output separately
        inputs = []
        outputs = []
        # for entry in unformatted_responses:
        #     converted = numpy.array(entry)
        #     converted_strings = ["%.2f" % number for number in converted]
        #     inputs.append(converted_strings)
        # for entry in unformatted_variables:
        #     converted = numpy.array(entry)
        #     converted_strings = ["%.2f" % number for number in converted]
        #     outputs.append(converted_strings)

        # separated_dataset.append(inputs)
        # separated_dataset.append(outputs)
        
        # Converts data to strings 
        for entry in combined_dataset:
            converted = numpy.array(entry)
            converted_strings = ["%.2f" % number for number in converted]
            converted_dataset.append(converted_strings)

        # Once we have column headers, this is how we can get/store them. 
        # for column in zip(*combined_dataset):
        #     attributes.append({"name": str(column[0]), "type": "string"})
        
        attributes.append({"name": 'one', "type": "string"})
        attributes.append({"name": 'two', "type": "string"})
        attributes.append({"name": 'three', "type": "string"})

        dimensions = [{"name": "row", "type": "int64", "begin": 0, "end": len(converted_dataset[0])}]

        if error_message is not "":
            slycat.web.server.put_model_parameter(database, model, "error-messages", error_message)
        else:
            slycat.web.server.put_model_parameter(database, model, "error-messages", "")

        return attributes, dimensions, converted_dataset, separated_dataset

def parse(database, model, input, files, aids, **kwargs):
    # Read HDF5 file
    start = time.time()
    parsed = [parse_file(file, model, database) for file in files]
    array_index = int(kwargs.get("array", "0"))
    for (attributes, dimensions, combined_data, separate_data), aid in zip(parsed, aids):
        slycat.web.server.put_model_arrayset(database, model, aid, input)
        slycat.web.server.put_model_array(database, model, aid, 0, attributes, dimensions)
        slycat.web.server.put_model_arrayset_data(database, model, aid, "%s/.../..." % array_index, combined_data)
        # Create project data
        # slycat.web.server.handlers.create_project_data(model, aid, combined_data)
    end = time.time()

    model = database.get("model", model['_id'])
    model["db_creation_time"] = (end - start)
    database.save(model)

def register_slycat_plugin(context):
    context.register_parser("slycat-hdf5-parser", "HDF5", ["table"], parse)
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

def read_file(h5_file, attributes, error_message, database, model):
    # unformatted_responses = list(h5_file['models']['simulation']['model1']['responses']['functions']) # Inputs
    # unformatted_variables = list(h5_file['models']['simulation']['model1']['variables']['continuous']) # Outputs
    unformatted_responses = list(h5_file["/interfaces/NO_ID/NO_MODEL_ID/responses/functions"])
    unformatted_variables = list(h5_file["/interfaces/NO_ID/NO_MODEL_ID/variables/continuous"])
    # input_size = len(unformatted_responses[0]) # Each entry is a row, so the length of the row will give us the number of columns
    # output_size = len(unformatted_responses[0].shape)
    # input_columns = [i for i in range(input_size)]
    # output_columns = [i for i in range(output_size)]

    combined_dataset = []
    separated_dataset = [] # This will get sent to create_project_data for saving the inputs and output separately
    response_headers = []
    variable_headers = []

    # inputs = []
    # outputs = []
    # for entry in unformatted_responses:
    #     converted = numpy.array(entry)
    #     inputs.append(converted_strings)
    # for entry in unformatted_variables:
    #     converted = numpy.array(entry)
    #     outputs.append(converted_strings)

    # separated_dataset.append(inputs)
    # separated_dataset.append(outputs)

    column_headers_variables = list(h5_file["/interfaces/NO_ID/NO_MODEL_ID/variables/continuous"].dims[1][0])
    column_headers_responses = list(h5_file["/interfaces/NO_ID/NO_MODEL_ID/responses/functions"].dims[1][0])

    # Once we have column headers, this is how we can get/store them. 
    for i, column in enumerate(column_headers_variables):
        variable_headers.append(str(column.decode('utf-8')))
        attributes.append({"name": str(column.decode('utf-8')), "type": str(type(unformatted_variables[0][i])).split('numpy.')[1].split("'>")[0]})
    for j, column in enumerate(column_headers_responses):
        response_headers.append(str(column.decode('utf-8')))
        attributes.append({"name": str(column.decode('utf-8')), "type": str(type(unformatted_responses[0][j])).split('numpy.')[1].split("'>")[0]})

    combined_headers = numpy.concatenate((response_headers, variable_headers), axis=0)
    combined_headers = combined_headers.tolist()
    combined_data = numpy.concatenate((unformatted_responses, unformatted_variables), axis=1)
    combined_data = numpy.transpose(combined_data)

    combined_data = combined_data.tolist()

    for row in combined_data:
        combined_dataset.append(numpy.asarray(row))

    dimensions = [{"name": "row", "type": "int64", "begin": 0, "end": len(combined_dataset[0])}]

    if error_message != "":
        slycat.web.server.put_model_parameter(database, model, "error-messages", error_message)
    else:
        slycat.web.server.put_model_parameter(database, model, "error-messages", "")

    return attributes, dimensions, combined_dataset, separated_dataset

def parse_file(file, model, database):
    error_message = '' # Implement error handling later
    attributes = []
    f = io.BytesIO(file)
    f.seek(0)
    with h5py.File(f, 'r') as h5_file:
        return read_file(h5_file, attributes, error_message, database, model)
        
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
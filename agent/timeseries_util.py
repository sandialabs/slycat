#!/bin/env python

# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

"""
Stage data to hdf5 format for Slycat computation.
"""
import argparse
import concurrent.futures
import h5py
import logging
import multiprocessing
import numpy
import os
import os.path
import shutil
import slycat.hdf5
import threading
import csv
from urllib.parse import urlparse
import traceback
import paramiko
import functools

# set up the logger
log_lock = threading.Lock()
log = logging.getLogger()
log.setLevel(logging.INFO)
log.addHandler(logging.StreamHandler())
log.handlers[0].setFormatter(logging.Formatter("%(levelname)s - %(message)s"))


def _isNumeric(j):
    """
    Check if the input object is a numerical value, i.e. a float
    :param j: object
    :return: boolean
    """
    try:
        x = float(j)
    except ValueError:
        return False
    return True


def process_timeseries(timeseries_path, timeseries_name, output_directory, timeseries_index, eval_id):
    """
    Read in the input file from a timeseries run and process the data into a HDF5
    file for the given timeseries name and index. The generated file structure is
    as follows:

    array
    |_ 0
       |_ attribute
          |_ 0, dataset
          ...
          |_ number_of_columns, dataset
       |_ metadata
          |_ attribute-names, dataset: column names
          |_ attribute-types, dataset: data types for each of the columns
          |_ dimension-begin, dataset
          |_ dimension-end, dataset
          |_ dimension-names, dataset
          |_ dimension-types, dataset
       |_ unique
          |_ 0, dataset

    :param timeseries_path:
    :param timeseries_name:
    :param timeseries_index:
    :param eval_id:
    """
    t_add_index_column = None
    t_column_names = None
    t_column_types = None
    t_delimiter = None
    url = urlparse(timeseries_path)
    path = url.path  # strips scheme and network location from timeseries_path

    try:
        with log_lock:
            log.info("Reading %s", path)
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(hostname="", username="", password="")
        sftp_client = ssh.open_sftp()
        # with open("%s" % path, "r") as stream:
        with sftp_client.open(path) as stream:
            line = stream.readline()
            # detect delimiter
            sniffer = csv.Sniffer()
            dialect = sniffer.sniff(line)
            t_delimiter = dialect.delimiter
            t_column_names = [name.strip() for name in line.split(t_delimiter)]
            t_first_row = [val.strip() for val in stream.readline().split(t_delimiter)]

            # check if an index column is present or flag it otherwise
            if isinstance(t_first_row[0], int):
                t_add_index_column = True
                t_column_names = ["Index"] + t_column_names
            else:
                t_column_names[0] = "Index"
            t_column_types = ["float64" for name in t_column_names]
            t_column_names[1] = "TIME"

        # pull data from file and add an index column if flagged earlier...
        data = numpy.loadtxt("%s" % path, comments="End", skiprows=1, delimiter=t_delimiter)
        if t_add_index_column is True:
            data = numpy.insert(data, 0, range(len(data)), axis=1)
        # TODO: make sure we still need to create this dir with the next path settup
        timeseries_dir = os.path.join(output_directory, timeseries_name)
        if not os.path.exists(timeseries_dir):
            os.makedirs(timeseries_dir)
        hdf5_path = os.path.join(timeseries_dir, "timeseries-%s.hdf5" % timeseries_index)

        with log_lock:
            log.info("Writing %s", hdf5_path)

        with h5py.File(hdf5_path, "w") as file:
            arrayset = slycat.hdf5.start_arrayset(file)
            dimensions = [dict(name="row", end=data.shape[0])]
            attributes = [dict(name=name, type=type) for name, type in
                          zip(t_column_names, t_column_types)[1:]]  # leaves out the index column
            array = arrayset.start_array(0, dimensions, attributes)
            for attribute, column in enumerate(data.T[1:]):
                array.set_data(attribute, slice(0, column.shape[0]), column)
    except IOError, err:
        log.error("Failed reading %s: %s", path, err)
    except:
        log.error("Unexpected error reading %s", path)


def convert_timeseries(results, timeseries_index, eval_id, row):  # range(row_count), columns[0], rows)
    """
    Iterate over the data for the input row and checks for file paths. If file
    extension is valid, run process_timeseries method.

    :param timeseries_index: 0-based index
    :param eval_id: ID from ID column
    :param row: row data
    """
    for i, val in enumerate(row):
        if results['column_types'][i] == "string":
            val = val.strip()
            file_ext = val[len(val) - 3:]
            if file_ext == "csv" or file_ext == "dat" or file_ext == "txt":
                print "processing"
                process_timeseries(val, results['column_names'][i], results['output_directory'], timeseries_index,
                                   eval_id)


def check_and_build_input_and_output_directories(output_directory, inputs_file):
    """
    builds input and output directories if they do not already exist
    :param output_directory:
    :param inputs_file:
    :param force:
    :return:
    """
    if not os.path.exists(output_directory):
        os.makedirs(output_directory)
    if inputs_file is None:
        raise Exception("Inputs file is a required")
    if not os.path.isfile(inputs_file):
        raise Exception("Inputs file could not be found. Check its path and verify permissions.")


def convert_inputs_file_to_dictionary(inputs_file, inputs_file_delimiter, id_column):
    """
    Ingest the input file and reorganizes the data into objects:

          - rows is a 2-dimensional array representation of the input file. The header
          (column names) is eventually removed from the array.
          - column_names is an array with the column names.
          - column_types is an array with the type of data for each of the columns.
          - row_count is self-explanatory
          - columns is a list of tuples for each of the columns (minus the header row).
          Each tuple is the data for each of the columns.

        Then repack each of the data columns as numpy arrays.
    :param inputs_file: path to inputs file
    :param inputs_file_delimiter:
    :param id_column:
    :return: a dictionary
    """
    log.info("Converting %s", inputs_file)
    results = {}
    with open(inputs_file, "r") as stream:
        results['rows'] = [row.split(inputs_file_delimiter) for row in stream]
    results['column_names'] = [name.strip() for name in results['rows'][0]]
    results['column_types'] = ["string" for name in results['column_names']]
    results['rows'] = results['rows'][1:]  # removes first row (header)
    results['row_count'] = len(results['rows'])
    results['columns'] = zip(
        *results[
            'rows'])  # this is the data only - no headers, now a list of tuples:  [(index1, index2, ...), (voltage1, voltage2, ...) ...]

    if id_column is not None:
        if results['column_names'][0] != id_column:
            raise Exception("The first column in %s must be %s, got %s instead." % (
                inputs_file, id_column, results['column_names'][0]))
        results['columns'][0] = numpy.array(results['columns'][0], dtype="int64")  # repack the index col as numpy array
    else:
        # if the ID column isn't specified, creates one and prepend it to the columns
        results['column_names'] = ["%eval_id"] + results['column_names']
        results['columns'] = [numpy.array(range(0, results['row_count']), dtype="int64")] + results['columns']
    results['column_types'][0] = "int64"

    for index in range(1, len(results['columns'])):  # repack data cols as numpy arrays
        try:
            if _isNumeric(results['columns'][index][0]):
                results['columns'][index] = numpy.array(results['columns'][index], dtype="float64")
                results['column_types'][index] = "float64"
            else:
                string_type = "S" + str(
                    len(results['columns'][index][0]))  # using length of first string for whole column
                results['columns'][index] = numpy.array(results['columns'][index], dtype=string_type)
                results['column_types'][index] = "string"
        except: # TODO: build exception logic
            pass
    log.info("Converted %s", results['columns'])
    return results


def write_out_hdf5_files(results, cpu_count=1):
    """
    Write the inputs files data out to "inputs.hdf5" file. The generated HDF5 file
    has the following hierarchy:

      array
      |_ 0
         |_ attribute
            |_ 0, dataset
            |_ 1, dataset
            ...
            |_ number_of_columns, dataset
         |_ metadata
            |_ attribute-names, dataset: column names
            |_ attribute-types, dataset: data types for each of the columns
            |_ dimension-begin, dataset
            |_ dimension-end, dataset
            |_ dimension-names, dataset
            |_ dimension-types, dataset

    Note: the datasets are 1 dimensional arrays (lenght of the dataset size) and
    represent the data for each of the columns.
    :param results: dictionary of metadata
    :param cpu_count: number of cpu's for parallel jobs
    :return: status msg
    """
    # dimensions: is a list with one dictionary with the following keys/value pair: name="row"
    # and end=the numberof rows from the input file.
    dimensions = [dict(name="row", end=results['row_count'])]
    # attributes: is a list of dictionaries representing the column names and their
    # types. Each dictionary has the following format: { name: column name, type: column type }.
    attributes = [dict(name=name, type=type) for name, type in zip(results['column_names'], results['column_types'])]

    with h5py.File(os.path.join(results['output_directory'], "inputs.hdf5"), "w") as file:
        arrayset = slycat.hdf5.start_arrayset(file)
        array = arrayset.start_array(0, dimensions, attributes)
        for attribute, column in enumerate(results['columns']):
            array.set_data(attribute, slice(0, column.shape[0]), column)
    with concurrent.futures.ProcessPoolExecutor(cpu_count) as pool:
        output = list(
            pool.map(functools.partial(convert_timeseries, results), range(results['row_count']), results['columns'][0],
                     results['rows']))
    return output


def timeseries_csv_to_hdf5(output_directory, inputs_file, id_column, inputs_file_delimiter=","):
    """
    converts a csv based timeseries to hdf5 files for faster computation later on
    :param output_directory:
    :param inputs_file:
    :param id_column:
    :param inputs_file_delimiter:
    :return:
    """
    dir_error_msg = None
    # output_dir = s
    # output_dir = output_dir +"/slycat-temp+"-"+input_file_name +"-"+ timestamp/"
    # should we wrtie to scratch drive without username b4 it
    try:
        check_and_build_input_and_output_directories(output_directory, inputs_file)
    except Exception as e:
        dir_error_msg = e.message
    if dir_error_msg is not None:
        log.info("error with input output directories error msg: %s", dir_error_msg)
        return False
    # create an object list of the inputs file
    results = convert_inputs_file_to_dictionary(inputs_file, inputs_file_delimiter, id_column)
    results['output_directory'] = output_directory
    print write_out_hdf5_files(results, cpu_count=multiprocessing.cpu_count())


if __name__ == "__main__":
    timeseries_csv_to_hdf5("out", "master.csv", "%eval_id", inputs_file_delimiter=",")

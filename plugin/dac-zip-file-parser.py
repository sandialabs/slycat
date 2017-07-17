# This script imports PTS zip files for DAC.  It is modified from
# the slycat-csv-parser.  This parser uploads a PTS CSV/META zip
# file then pushes the stored files to the previous CSV/META parsers.
#
# S. Martin
# 7/14/2017

import csv
import numpy
import slycat.web.server
import slycat.email
import cherrypy

# zip file manipulation
import io
import zipfile
import os

# CSV file parser
def parse_csv(file):

    """
    parses out a csv file into numpy array by column (data), the dimension meta data(dimensions),
    and sets attributes (attributes)
    :param file: csv file to be parsed
    :returns: attributes, dimensions, data
    """

    def isfloat(value):
        try:
            float(value)
            return True
        except ValueError:
            return False

    rows = [row for row in csv.reader(file.splitlines(), delimiter=",", doublequote=True,
            escapechar=None, quotechar='"', quoting=csv.QUOTE_MINIMAL, skipinitialspace=True)]

    if len(rows) < 2:

        # use a row of zeros for an empty file
        attributes = []
        data = []
        for column in zip(*rows):
            attributes.append({"name":column[0], "type":"float64"})
            data.append([0])
        dimensions = [{"name":"row", "type":"int64", "begin":0, "end":1}]

        # old code:
        # slycat.email.send_error("slycat-csv-parser.py parse_file", "File must contain at least two rows.")
        # raise Exception("File must contain at least two rows.")

    else:

        attributes = []
        dimensions = [{"name":"row", "type":"int64", "begin":0, "end":len(rows[1:])}]
        data = []

        # go through the csv by column
        for column in zip(*rows):
            column_has_floats = False

            # start from 1 to avoid the column name
            for value in column[1:]:
                if isfloat(value):
                    column_has_floats = True
                try:# note NaN's are floats
                    output_list = map(lambda x: 'NaN' if x=='' else x, column[1:])
                    data.append(numpy.array(output_list).astype("float64"))
                    attributes.append({"name":column[0], "type":"float64"})

                # could not convert something to a float defaulting to string
                except Exception as e:
                    column_has_floats = False
                    cherrypy.log.error("found floats but failed to convert, switching to string types Trace: %s" % e)
                break

            if not column_has_floats:
                data.append(numpy.array(column[1:]))
                attributes.append({"name":column[0], "type":"string"})

        if len(attributes) < 1:
            slycat.email.send_error("slycat-csv-parser.py parse_file", "File must contain at least one column.")
            raise Exception("File must contain at least one column.")

    return attributes, dimensions, data


# this is the parser for the very specific format of the .ini files in the META directory
def parse_meta(file):

    """
    parses out a csv file into numpy array by column (data), the dimension meta data(dimensions),
    and sets attributes (attributes)
    :param file: csv file to be parsed
    :returns: attributes, dimensions, data
    """

    # parse file one row at a time
    rows = file.splitlines()
    data = []
    for i in range(0,len(rows)):

        # keep prefixes
        if "[" in rows[i]:
            prefix = rows[i][0:5] + "]"

        # check line for one equal sign
        row_data = rows[i].split("=")
        if (len(row_data) == 2):
            row_data[0] = row_data[0].translate(None, '"')
            row_data[1] = row_data[1].translate(None, '"')
            data.append((prefix + row_data[0], row_data[1]))

        # discard waveform_conversion information
        if rows[i] == "[waveform_conversion]":
            break

    # however many rows by 2 columns
    dimensions = [dict(name="row", end=len(data)),
        dict(name="column", end=2)]

    # attributes are the same for matrices and vectors
    attributes = [dict(name="value", type="string")]

    return attributes, dimensions, data


def parse_zip(database, model, input, files, aids, **kwargs):

    """
    uploads a PTS CSV/META zip file and passes the CSV/META files
    to the previous CSV/META parsers to be uploaded to the database
    :param database: slycat.web.server.database.couchdb.connect()
    :param model: database.get("model", self._mid)
    :param input: boolean
    :param files: files to be parsed
    :param aids: artifact ID
    :param kwargs:
    """
    cherrypy.log.error("DAC PTS Zip parser started.")

    # treat uploaded file as bitstream
    file_like_object = io.BytesIO(files[0])
    zip_ref = zipfile.ZipFile(file_like_object)
    zip_files = zip_ref.namelist()

    # loop through zip files and make a list of CSV/META files

    csv_files = []
    csv_no_ext = []

    meta_files = []
    meta_no_ext = []

    for zip_file in zip_files:

        # parse files in list
        head, tail = os.path.split(zip_file)

        # check for CSV or META file
        if head == "CSV":

            # check for .csv extension
            if tail != "":

                ext = tail.split(".")[-1]
                if ext == "csv":
                    csv_files.append(zip_file)
                    csv_no_ext.append(tail.split(".")[0])
                else:
                    raise Exception("CSV files must have .csv extension.")

        elif head == "META":

            # check for .ini extension
            if tail != "":

                ext = tail.split(".")[-1]
                if ext == "ini":
                    meta_files.append(zip_file)
                    meta_no_ext.append(tail.split(".")[0])
                else:
                    raise Exception("META files must have .ini extension.")

        else:

            # not CSV or META file
            raise Exception("Unexpected file (not CSV/META) found in .zip file.")

    # check that CSV and META files have a one-to-one correspondence
    meta_order = []
    if len(csv_no_ext) == len(meta_no_ext):

        # go through CSV files and look for corresponding META file
        for csv_file in csv_no_ext:

            # get META file index of CSV file
            if csv_file in meta_no_ext:
                meta_order.append(meta_no_ext.index(csv_file))

            else:
                raise Exception("CSV and META files do not match.")

    else:

        # different number of CSV and META files
        raise Exception("PTS .zip file must have same number of CSV and META files.")

    # re-order meta files to match csv files
    meta_files = [meta_files[i] for i in meta_order]

    # extract and push CSV files to database
    for i in range(0, len(csv_files)):

        cherrypy.log.error("Parsing CSV file: %s" % csv_files[i])

        # extract csv file from archive and parse
        attributes, dimensions, data = parse_csv(zip_ref.read(csv_files[i]))

        # push to database
        if i == 0:
            slycat.web.server.put_model_arrayset(database, model, "dac-pts-csv", input)
        slycat.web.server.put_model_array(database, model, "dac-pts-csv", i, attributes, dimensions)
        slycat.web.server.put_model_arrayset_data(database, model, "dac-pts-csv", "%s/.../..." % i, data)

    # extract and push META files to database
    for i in range(0, len(meta_files)):

        cherrypy.log.error("Parsing META file: %s" % meta_files[i])

        # extract csv file from archive and parse
        attributes, dimensions, data = parse_meta(zip_ref.read(meta_files[i]))

        # push to database
        if i == 0:
            slycat.web.server.put_model_arrayset(database, model, "dac-pts-meta", input)
        slycat.web.server.put_model_array(database, model, "dac-pts-meta", i, attributes, dimensions)
        slycat.web.server.put_model_arrayset_data(database, model, "dac-pts-meta", "%s/0/..." % i, [data])

    # close archive
    zip_ref.close()

    # push file names to database
    slycat.web.server.put_model_parameter(database, model, "dac-wizard-file-names", csv_no_ext)


def register_slycat_plugin(context):
    context.register_parser("dac-zip-file-parser", "PTS CSV/META .zip file", ["dac-zip-file"], parse_zip)


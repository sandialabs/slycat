# This script imports PTS log files for DAC.  It is modified from
# the slycat-csv-parser.  The log file is not actually input,
# but it is a directory pointer to the directory that has the
# CSV and META folders available.  The meta data is read from
# multiple files in the META directory.
#
# S. Martin
# 4/4/2017

import csv
import numpy
import slycat.web.server
import slycat.email
import StringIO
import time

def parse_file(file):
  """
  parses out a csv file into numpy array by column (data), the dimension meta data(dimensions),
  and sets attributes (attributes)
  :param file: csv file to be parsed
  :returns: attributes, dimensions, data
  """
  import cherrypy
  def isfloat(value):
    try:
      float(value)
      return True
    except ValueError:
      return False

  cherrypy.log.error("dac pts parsing:::::::")
  rows = [row for row in csv.reader(file.splitlines(), delimiter=",", doublequote=True, escapechar=None, quotechar='"', quoting=csv.QUOTE_MINIMAL, skipinitialspace=True)]
  if len(rows) < 2:
    slycat.email.send_error("slycat-csv-parser.py parse_file", "File must contain at least two rows.")
    raise Exception("File must contain at least two rows.")

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

def parse(database, model, input, files, aids, **kwargs):
  """
  parses a file as a csv and then uploads the parsed data to associated storage for a
  model
  :param database: slycat.web.server.database.couchdb.connect()
  :param model: database.get("model", self._mid)
  :param input: boolean
  :param files: files to be parsed
  :param aids: artifact ID
  :param kwargs:
  """
  start = time.time()
  if len(files) != len(aids):
    slycat.email.send_error("slycat-csv-parser.py parse", "Number of files and artifact IDs must match.")
    raise Exception("Number of files and artifact ids must match.")

  parsed = [parse_file(file) for file in files]

  array_index = int(kwargs.get("array", "0"))
  for (attributes, dimensions, data), aid in zip(parsed, aids):
    slycat.web.server.put_model_arrayset(database, model, aid, input)
    slycat.web.server.put_model_array(database, model, aid, 0, attributes, dimensions)
    slycat.web.server.put_model_arrayset_data(database, model, aid, "%s/.../..." % array_index, data)
  end = time.time()
  model["db_creation_time"] = (end - start)
  database.save(model)

def register_slycat_plugin(context):
  context.register_parser("dac-pref-files-parser", "DAC .pref files", ["dac-pref-files"], parse)


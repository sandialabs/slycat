import numpy
import slycat.web.server

def parse(database, model, name, input, file, **kwargs):
  rows = [row.split(",") for row in file]
  columns = zip(*rows)

  dimensions = [{"name":"row", "type":"int64", "begin":0, "end":len(rows[1:])}]
  attributes = []
  data = []
  for column in columns:
    try:
      data.append(numpy.array(column[1:]).astype("float64"))
      attributes.append({"name":column[0], "type":"float64"})
    except:
      data.append(numpy.array(column[1:]))
      attributes.append({"name":column[0], "type":"string"})

  slycat.web.server.put_model_arrayset(database, model, name, input)
  slycat.web.server.put_model_array(database, model, name, 0, attributes, dimensions)
  for index, column in enumerate(data):
    slycat.web.server.put_model_arrayset_data(database, model, name, "0/%s/..." % index, [column])

def register_slycat_plugin(context):
  context.register_parser("slycat-csv-parser", "Comma separated values (CSV)", ["csv"], "table", parse)


import numpy
import slycat.web.server

def parse(database, model, input, files, names, **kwargs):
  if len(files) != len(names):
    raise Exception("Number of files and artifact names must match.")

  content_type = kwargs.get("content-type", "application/octet-stream")

  for file, name in zip(files, names):
    slycat.web.server.put_model_file(database, model, name, file, content_type, input)

def register_slycat_plugin(context):
  context.register_parser("slycat-blob-parser", "Binary Files", [], parse)


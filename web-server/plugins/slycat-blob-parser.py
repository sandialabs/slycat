import numpy
import slycat.web.server
import slycat.email

def parse(database, model, input, files, aids, **kwargs):
  if len(files) != len(aids):
    slycat.email.send_error("slycat-blob-parser.py parse", "Number of files and artifact ids must match.")
    raise Exception("Number of files and artifact ids must match.")

  content_type = kwargs.get("content-type", "application/octet-stream")

  for file, aid in zip(files, aids):
    slycat.web.server.put_model_file(database, model, aid, file, content_type, input)

def register_slycat_plugin(context):
  context.register_parser("slycat-blob-parser", "Binary Files", [], parse)


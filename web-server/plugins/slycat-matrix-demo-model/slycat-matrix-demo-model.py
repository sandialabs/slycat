def register_slycat_plugin(context):
  import cherrypy
  import datetime
  import json
  import numpy
  import os
  import slycat.web.server

  def finish(database, model):
    slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def html(database, model):
    return open(os.path.join(os.path.dirname(__file__), "ui.html"), "r").read()

  def matrix_result(matrix):
    cherrypy.response.headers["content-type"] = "application/json"

    return json.dumps({
      "metadata":
      {
        "dimensions":
        [
          {"name":"row", "type":"int64", "begin":0, "end":matrix.shape[0]},
          {"name":"column", "type":"int64", "begin":0, "end":matrix.shape[1]},
        ],
        "attributes":
        [
          {"name":"values", "type":"float64"},
        ]
      },
      "data": matrix.tolist(),
    })

  def product(database, model, command, **kwargs):
    A = slycat.web.server.get_model_array_attribute_chunk(database, model, "A", 0, 0, numpy.index_exp[...])
    B = slycat.web.server.get_model_array_attribute_chunk(database, model, "B", 0, 0, numpy.index_exp[...])
    return matrix_result(numpy.dot(A, B))

  def hadamard_product(database, model, command, **kwargs):
    A = slycat.web.server.get_model_array_attribute_chunk(database, model, "A", 0, 0, numpy.index_exp[...])
    B = slycat.web.server.get_model_array_attribute_chunk(database, model, "B", 0, 0, numpy.index_exp[...])
    return matrix_result(A * B)

  def kronecker_product(database, model, command, **kwargs):
    A = slycat.web.server.get_model_array_attribute_chunk(database, model, "A", 0, 0, numpy.index_exp[...])
    B = slycat.web.server.get_model_array_attribute_chunk(database, model, "B", 0, 0, numpy.index_exp[...])
    return matrix_result(numpy.kron(A, B))

  context.register_model("matrix-demo", finish, html)
  context.register_model_command("matrix-demo", "product", product)
  context.register_model_command("matrix-demo", "hadamard-product", hadamard_product)
  context.register_model_command("matrix-demo", "kronecker-product", kronecker_product)

  context.register_model_bundle("matrix-demo", "text/css", [
    os.path.join(os.path.dirname(__file__), "ui.css"),
    ])

  context.register_model_bundle("matrix-demo", "text/javascript", [
    os.path.join(os.path.dirname(__file__), "jquery-ui-1.10.4.custom.min.js"),
    os.path.join(os.path.dirname(__file__), "jquery.layout-latest.min.js"),
    os.path.join(os.path.dirname(__file__), "ui.js"),
    ])


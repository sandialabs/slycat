# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
  import cherrypy
  import datetime
  import json
  import numpy
  import os
  import slycat.web.server

  def finish(database, model):
    slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")

  def page_html(database, model):
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

  def product(database, model, verb, type, command, **kwargs):
    if "product-type" not in kwargs:
      raise cherrypy.HTTPError("400 Missing product-type parameter.")
    product_type = kwargs["product-type"]
    if product_type not in ["dot-product", "hadamard-product", "kronecker-product"]:
      raise cherrypy.HTTPError("400 Unknown product-type: %s." % product_type)

    A = next(slycat.web.server.get_model_arrayset_data(database, model, "A", "0/0/..."))
    B = next(slycat.web.server.get_model_arrayset_data(database, model, "B", "0/0/..."))
    if product_type == "dot-product":
      return matrix_result(numpy.dot(A, B))
    if product_type == "hadamard-product":
      return matrix_result(A * B)
    if product_type == "kronecker-product":
      return matrix_result(numpy.kron(A, B))

  context.register_model("matrix-demo", finish)

  context.register_model_command("GET", "matrix-demo", "product", product)

  context.register_page("matrix-demo", page_html)

  context.register_page_bundle("matrix-demo", "text/css", [
    os.path.join(os.path.dirname(__file__), "ui.css"),
    ])

  context.register_page_bundle("matrix-demo", "text/javascript", [
    os.path.join(os.path.dirname(__file__), "jquery-ui-1.10.4.custom.min.js"),
    os.path.join(os.path.dirname(__file__), "jquery.layout-latest.min.js"),
    os.path.join(os.path.dirname(__file__), "ui.js"),
    ])


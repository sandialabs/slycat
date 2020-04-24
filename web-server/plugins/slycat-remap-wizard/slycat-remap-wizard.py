# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
  import cherrypy
  import json
  import numpy
  import os
  import re
  import slycat.web.server
  
  from urllib.parse import urlparse

  def set_tree_node(node, column):
    """Sets up a tree node"""
    node["columns"] = set([str(column)])
    node["children"] = dict()

  def update_tree(node, column, paths):
    """Updates trees within the forest with paths"""
    if len(paths) < 1:
      return

    n = paths.pop(0)
    if n not in node["children"]:
      n_obj = dict()
      set_tree_node(n_obj, column)
      node["children"][n] = n_obj
      update_tree(n_obj, column, paths)
    else:
      n_obj = node["children"][n]
      n_obj["columns"].add(str(column))
      update_tree(n_obj, column, paths)

  def update_forest(forest, uris, column):
    """Updates forest with new list of URIs"""
    for uri in uris:
      parsed = urlparse(uri)
      host = parsed.hostname

      if not host:
        host = ""

      if host not in forest:
        forest[host] = {}

      path_arr = parsed.path.split('/')
      path_arr.pop() # removes filename + extension
      if len(path_arr) > 0 and path_arr[0] == "":
        path_arr.pop(0) # removes first item if empty string

      if len(path_arr) > 0:
        root = path_arr.pop(0)
      else:
        root = ""

      if root not in forest[host]:
        root_obj = dict()
        set_tree_node(root_obj, column)
        forest[host][root] = root_obj
        update_tree(root_obj, column, path_arr)
      else:
        root_obj = forest[host][root]
        root_obj["columns"].add(str(column))
        update_tree(root_obj, column, path_arr)

  def process_tree(path_arr, node):
    """Determines the longest common path for a given path"""
    if len(node["children"]) == 1:
      for n in node["children"]:
        path_arr.append(n)
        return process_tree(path_arr, node["children"][n])
    else:
      obj = dict()
      obj["path"] = "/".join(path_arr)
      obj["column"] = ",".join(reversed(list(node["columns"])))
      return obj

  def format_forest(forest):
    formatted = {}
    for host in forest:
      formatted[host] = {}
      for root in forest[host]:
        obj = process_tree([root], forest[host][root])

        if obj["column"] not in formatted[host]:
          formatted[host][obj["column"]] = set()

        formatted[host][obj["column"]].add(obj["path"])
    return formatted

  def list_uris(database, model, verb, type, command, **kwargs):
    """Parses out all unique root URIs from the db table"""
    cherrypy.log.error("list_uris: %s" % kwargs)

    try:
      columns = [int(column) for column in kwargs["columns"]]
    except:
      cherrypy.log.error("slycat-remap-wizard.py list_uris", "cherrypy.HTTPError 400 missing / invalid columns parameter.")
      raise cherrypy.HTTPError("400 Missing / invalid columns parameter.")

    forest = {}
    for column in columns:
      tmp_uris = next(iter(slycat.web.server.get_model_arrayset_data(database, model, "data-table", "0/%s/..." % column)))
      update_forest(forest, tmp_uris, column)

    formatted_forest = format_forest(forest)

    # sets have to be turned into arrays to be JSON serializable
    for host in formatted_forest:
      for column in formatted_forest[host]:
        formatted_forest[host][column] = list(formatted_forest[host][column])

    return json.dumps({"uris": formatted_forest})


  def search_and_replace(database, model, verb, type, command, **kwargs):
    """Perform a regular-expression search-and-replace on columns in the input data."""
    cherrypy.log.error("search_and_replace: %s" % kwargs)

    try:
      columns = [int(column) for column in kwargs["columns"]]
    except:
      cherrypy.log.error("slycat-remap-wizard.py search_and_replace", "cherrypy.HTTPError 400 missing / invalid columns parameter.")
      raise cherrypy.HTTPError("400 Missing / invalid columns parameter.")

    try:
      replace = kwargs["replace"]
    except:
      cherrypy.log.error("slycat-remap-wizard.py search_and_replace", "cherrypy.HTTPError 400 missing / invalid replace parameter.")
      raise cherrypy.HTTPError("400 Missing / invalid replace parameter.")

    try:
      search = re.compile(kwargs["search"])
    except:
      cherrypy.log.error("slycat-remap-wizard.py search_and_replace", "cherrypy.HTTPError 400 missing / invalid search parameter.")
      raise cherrypy.HTTPError("400 Missing / invalid search parameter.")

    for attribute in columns:
      before = next(iter(slycat.web.server.get_model_arrayset_data(database, model, "data-table", "0/%s/..." % attribute)))
      #cherrypy.log.error("before: %s %s" % (type(before), before))
      after = numpy.array([search.sub(replace, value) for value in before])
      #cherrypy.log.error("after: %s" % after)
      slycat.web.server.put_model_arrayset_data(database, model, "data-table", "0/%s/..." % attribute, [after])

    return json.dumps({"ok":True})


  context.register_model_command("POST", "remap-wizard", "search-and-replace", search_and_replace)
  context.register_model_command("GET", "remap-wizard", "list-uris", list_uris)

  context.register_wizard("remap-wizard", "Remap Wizard", require={"action":"create", "context":"model", "model-type":["parameter-image", "parameter-image-plus"]})
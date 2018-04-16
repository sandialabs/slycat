# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
  """Called during startup when the plugin is loaded."""
  import cherrypy
  import datetime
  import time
  import collections
  import json
  import numpy
  import os
  import re
  import scipy.cluster.hierarchy
  import scipy.spatial.distance
  import slycat.web.server.database.couchdb
  import slycat.web.server
  import slycat.email
  import threading
  import traceback
  import urlparse

  def csv_distance(left_index, left_path, right_index, right_path):
    return csv_distance.matrix[left_index][right_index]
  csv_distance.matrix = None

  # Map measure names to functions
  measures = {
    # "identity" : identity_distance,
    # "jaccard" : jaccard_distance,
    # "euclidean-rgb" : euclidean_rgb_distance,
    "csv" : csv_distance,
    }

  # Maps the slycat-agent functions to their respective distance matrix type
  distance_matrix_types = {
    "jaccard-distance": "jaccard",
    "jaccard2-distance": "jaccard2",
    "one-norm-distance": "one-norm",
    "correlation-distance": "correlation",
    "cosine-distance": "cosine",
    "hamming-distance": "hamming"
  }

  def generate_filename(column, uid, type):
    return "slycat_%s_%s_%s_distance_matrix.csv" % (column, uid, type)

  def compute_distance(left, right, storage, cluster_name, measure_name, measure, columns):
    distance = numpy.empty(len(left))
    for index in range(len(left)):
      i = left[index]
      j = right[index]
      row_i, column_i = storage[i]
      uri_i = columns[column_i][1][row_i]
      path_i = urlparse.urlparse(uri_i).path
      row_j, column_j = storage[j]
      uri_j = columns[column_j][1][row_j]
      path_j = urlparse.urlparse(uri_j).path
      distance[index] = measure(i, path_i, j, path_j)
      print "Computed %s distance for %s, %s -> %s: %s." % (measure_name, cluster_name, i, j, distance[index])
    return distance


  def media_columns(database, model, verb, type, command, **kwargs):
    """Identify columns in the input data that contain media URIs (image or video)."""
    expression = re.compile("file://")
    search = numpy.vectorize(lambda x:bool(expression.search(x)))

    media_cols = []
    metadata = slycat.web.server.get_model_arrayset_metadata(database, model, "data-table", "0")["arrays"][0]
    for index, attribute in enumerate(metadata["attributes"]):
      if attribute["type"] != "string":
        continue
      column = slycat.web.server.get_model_arrayset_data(database, model, "data-table", "0/%s/..." % index)
      if not numpy.any(search(column)):
        continue
      media_cols.append(index)

    cherrypy.response.headers["content-type"] = "application/json"
    return json.dumps(media_cols)

  def compute_uploaded_distance(mid):
    """Computes for a single uploaded distance matrix. Called in a thread to
    perform work on the model.

    Parameters:
    -----------
    mid : string
      Model unique identifier
    """
    try:
      database = slycat.web.server.database.couchdb.connect()
      model = database.get("model", mid)

      # Do useful work here
      try:
        clusters_model_file = slycat.web.server.get_model_file(database, model, "clusters")
      except:
        cluster_columns = slycat.web.server.get_model_parameter(database, model, "cluster-columns")
        cluster_measure = slycat.web.server.get_model_parameter(database, model, "cluster-measure")
        cluster_linkage = slycat.web.server.get_model_parameter(database, model, "cluster-linkage")
        metadata = slycat.web.server.get_model_arrayset_metadata(database, model, "data-table")
        column_infos = metadata[0]['attributes']
        column_data = list(slycat.web.server.get_model_arrayset_data(database, model, "data-table", ".../.../..."))
        columns = []
        for column_index, column_info in enumerate(column_infos):
          columns.append((column_info['name'], column_data[column_index]))

        csv_distance.matrix = list(slycat.web.server.get_model_arrayset_data(database, model, "distance-matrix", ".../.../..."))

        # Create a mapping from unique cluster names to column rows.
        clusters = collections.defaultdict(list)
        for column_index, (name, column) in enumerate(columns):
          if name not in [cluster_columns]:
            continue
          for row_index, row in enumerate(column):
            if row:
              clusters[name].append((row_index, column_index))

        # Compute a hierarchical clustering for each cluster column.
        cluster_linkages = {}
        cluster_exemplars = {}

        for index, (name, storage) in enumerate(sorted(clusters.items())):
          progress_begin = float(index) / float(len(clusters))
          progress_end = float(index + 1) / float(len(clusters))

          # Compute a distance matrix comparing every image to every other ...
          observation_count = len(storage)
          left, right = numpy.triu_indices(observation_count, k=1)
          distance = compute_distance(left, right, storage, name, cluster_measure, measures[cluster_measure], columns)

          # Use the distance matrix to cluster observations ...
          print "Clustering %s" % name
          #distance = scipy.spatial.distance.squareform(distance_matrix)
          linkage = scipy.cluster.hierarchy.linkage(distance, method=str(cluster_linkage))
          cluster_linkages[name] = linkage

          # Identify exemplar waveforms for each cluster ...
          distance_matrix = scipy.spatial.distance.squareform(distance)

          summed_distances = numpy.zeros(shape=(observation_count))
          exemplars = dict()
          cluster_membership = []

          for i in range(observation_count):
            exemplars[i] = i
            cluster_membership.append(set([i]))

          print "Identifying examplars for %s" % (name)
          for i in range(len(linkage)):
            cluster_id = i + observation_count
            (f_cluster1, f_cluster2, height, total_observations) = linkage[i]
            cluster1 = int(f_cluster1)
            cluster2 = int(f_cluster2)
            # Housekeeping: assemble the membership of the new cluster
            cluster_membership.append(cluster_membership[cluster1].union(cluster_membership[cluster2]))
            # We need to update the distance from each member of the new
            # cluster to all the other members of the cluster.  That means
            # that for all the members of cluster1, we need to add in the
            # distances to members of cluster2, and for all members of
            # cluster2, we need to add in the distances to members of
            # cluster1.
            for cluster1_member in cluster_membership[cluster1]:
              for cluster2_member in cluster_membership[cluster2]:
                summed_distances[cluster1_member] += distance_matrix[cluster1_member][cluster2_member]

            for cluster2_member in cluster_membership[int(cluster2)]:
              for cluster1_member in cluster_membership[cluster1]:
                summed_distances[cluster2_member] += distance_matrix[cluster2_member][cluster1_member]

            min_summed_distance = None
            max_summed_distance = None

            exemplar_id = 0
            for member in cluster_membership[cluster_id]:
              if min_summed_distance is None or summed_distances[member] < min_summed_distance:
                min_summed_distance = summed_distances[member]
                exemplar_id = member

              if max_summed_distance is None or summed_distances[member] > min_summed_distance:
                max_summed_distance = summed_distances[member]

            exemplars[cluster_id] = exemplar_id
          cluster_exemplars[name] = exemplars

        # Ingest the raw data into Slycat.
        # Store an alphabetized collection of cluster names.
        slycat.web.server.put_model_file(database, model, "clusters", value=json.dumps(sorted(clusters.keys())), content_type="application/json", input=True)

        model = database.get("model", mid)

        # Store each cluster.
        for key in clusters.keys():
          slycat.web.server.put_model_file(
            database,
            model,
            "cluster-%s" % key,
            value=json.dumps({"linkage" : cluster_linkages[key].tolist(), "exemplars" : cluster_exemplars[key], "input-indices" : [row_index for row_index, column_index in clusters[key]],}),
            content_type="application/json",
            input=True)

      model = database.get("model", mid)
      slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")
      print "Finished computing new model."

    except:
      cherrypy.log.error("%s" % traceback.format_exc())

      database = slycat.web.server.database.couchdb.connect()
      model = database.get("model", mid)
      slycat.web.server.update_model(database, model, state="finished", result="failed", finished=datetime.datetime.utcnow().isoformat(), message=traceback.format_exc())


  def compute(mid, image_columns_names):
    """Called in a thread to perform work on the model."""
    try:
      database = slycat.web.server.database.couchdb.connect()
      model = database.get("model", mid)

      # Do useful work here
      try:
        clusters_model_file = slycat.web.server.get_model_file(database, model, "clusters")
      except:
        cluster_columns = slycat.web.server.get_model_parameter(database, model, "cluster-columns")
        cluster_measure = slycat.web.server.get_model_parameter(database, model, "cluster-measure")
        cluster_linkage = slycat.web.server.get_model_parameter(database, model, "cluster-linkage")
        metadata = slycat.web.server.get_model_arrayset_metadata(database, model, "data-table")
        column_infos = metadata[0]['attributes']
        column_data = list(slycat.web.server.get_model_arrayset_data(database, model, "data-table", ".../.../..."))
        columns = []

        for column_index, column_info in enumerate(column_infos):
          columns.append((column_info['name'], column_data[column_index]))

        # Create a mapping from unique cluster names to column rows.
        clusters = collections.defaultdict(list)
        for column_index, (name, column) in enumerate(columns):
          if name not in image_columns_names:
            continue
          for row_index, row in enumerate(column):
            if row:
              clusters[name].append((row_index, column_index))

        # Compute a hierarchical clustering for each cluster column.
        cluster_linkages = {}
        cluster_exemplars = {}

        for index, (name, storage) in enumerate(sorted(clusters.items())):
          csv_distance.matrix = list(slycat.web.server.get_model_arrayset_data(database, model, "distance-matrix-%s" % name, ".../.../..."))

          progress_begin = float(index) / float(len(clusters))
          progress_end = float(index + 1) / float(len(clusters))

          # Compute a distance matrix comparing every image to every other ...
          observation_count = len(storage)
          left, right = numpy.triu_indices(observation_count, k=1)
          distance = compute_distance(left, right, storage, name, cluster_measure, measures[cluster_measure], columns)

          # Use the distance matrix to cluster observations ...
          print "Clustering %s" % name
          #distance = scipy.spatial.distance.squareform(distance_matrix)
          linkage = scipy.cluster.hierarchy.linkage(distance, method=str(cluster_linkage))
          cluster_linkages[name] = linkage

          # Identify exemplar waveforms for each cluster ...
          distance_matrix = scipy.spatial.distance.squareform(distance)

          summed_distances = numpy.zeros(shape=(observation_count))
          exemplars = dict()
          cluster_membership = []

          for i in range(observation_count):
            exemplars[i] = i
            cluster_membership.append(set([i]))

          print "Identifying examplars for %s" % (name)
          for i in range(len(linkage)):
            cluster_id = i + observation_count
            (f_cluster1, f_cluster2, height, total_observations) = linkage[i]
            cluster1 = int(f_cluster1)
            cluster2 = int(f_cluster2)
            # Housekeeping: assemble the membership of the new cluster
            cluster_membership.append(cluster_membership[cluster1].union(cluster_membership[cluster2]))
            # We need to update the distance from each member of the new
            # cluster to all the other members of the cluster.  That means
            # that for all the members of cluster1, we need to add in the
            # distances to members of cluster2, and for all members of
            # cluster2, we need to add in the distances to members of
            # cluster1.
            for cluster1_member in cluster_membership[cluster1]:
              for cluster2_member in cluster_membership[cluster2]:
                summed_distances[cluster1_member] += distance_matrix[cluster1_member][cluster2_member]

            for cluster2_member in cluster_membership[int(cluster2)]:
              for cluster1_member in cluster_membership[cluster1]:
                summed_distances[cluster2_member] += distance_matrix[cluster2_member][cluster1_member]

            min_summed_distance = None
            max_summed_distance = None

            exemplar_id = 0
            for member in cluster_membership[cluster_id]:
              if min_summed_distance is None or summed_distances[member] < min_summed_distance:
                min_summed_distance = summed_distances[member]
                exemplar_id = member

              if max_summed_distance is None or summed_distances[member] > min_summed_distance:
                max_summed_distance = summed_distances[member]

            exemplars[cluster_id] = exemplar_id
          cluster_exemplars[name] = exemplars

        # Ingest the raw data into Slycat.
        # Store an alphabetized collection of cluster names.
        slycat.web.server.put_model_file(database, model, "clusters", value=json.dumps(sorted(clusters.keys())), content_type="application/json", input=True)

        model = database.get("model", mid)

        # Store each cluster.
        for key in clusters.keys():
          database = slycat.web.server.database.couchdb.connect()
          model = database.get("model", mid)

          slycat.web.server.put_model_file(
            database,
            model,
            "cluster-%s" % key,
            value=json.dumps({"linkage" : cluster_linkages[key].tolist(), "exemplars" : cluster_exemplars[key], "input-indices" : [row_index for row_index, column_index in clusters[key]],}),
            content_type="application/json",
            input=True)

      model = database.get("model", mid)
      slycat.web.server.update_model(database, model, state="finished", result="succeeded", finished=datetime.datetime.utcnow().isoformat(), progress=1.0, message="")
      print "Finished computing new model."

    except:
      cherrypy.log.error("%s" % traceback.format_exc())

      database = slycat.web.server.database.couchdb.connect()
      model = database.get("model", mid)
      slycat.web.server.update_model(database, model, state="finished", result="failed", finished=datetime.datetime.utcnow().isoformat(), message=traceback.format_exc())

  def fail_model(mid, message):
    database = slycat.web.server.database.couchdb.connect()
    model = database.get("model", mid)
    slycat.web.server.update_model(database, model, state="finished", result="failed", finished=datetime.datetime.utcnow().isoformat(), message=message)

  def checkjob_thread(mid, sid, jid, request_from, stop_event, callback):
    cherrypy.request.headers["x-forwarded-for"] = request_from

    while True:
      try:
        response = slycat.web.server.checkjob(sid, jid)
      except Exception as e:
        fail_model(mid, "Something went wrong while checking on job %s status: check for the slurm-%s.out file when the job completes." % (jid, jid))
        slycat.email.send_error("slycat-parameter-image-plus-model.py checkjob_thread", "An error occurred while checking on a remote job: %s" % e.message)
        raise Exception("An error occurred while checking on a remote job: %s" % e.message)
        stop_event.set()

      state = response["status"]["state"]
      cherrypy.log.error("checkjob %s returned with status %s" % (jid, state))

      if state == "CANCELLED" or state == "REMOVED":
        fail_model(mid, "Job %s was cancelled." % jid)
        stop_event.set()
        break

      if state == "FAILED":
        fail_model(mid, "Job %s has failed." % jid)
        stop_event.set()
        break

      if state == "COMPLETED":
        callback()
        stop_event.set()
        break

      time.sleep(5)


  # TODO this function needs to be migrated to the implementation of the computation interface
  def checkjob(database, model, verb, type, command, **kwargs):
    sid = slycat.web.server.create_session(kwargs["hostname"], kwargs["username"], kwargs["password"])
    jid = kwargs["jid"]
    fn = kwargs["fn"]
    uid = kwargs["uid"]
    image_columns_names = kwargs["fn_params"]["image_columns_names"]
    output_path = "/".join(kwargs["fn_params"]["input"].split("/")[:-1])

    def callback():
      for name in image_columns_names:
        slycat.web.server.post_model_file(model["_id"], True, sid, "%s" % generate_filename(name, uid, distance_matrix_types[fn]), "distance-matrix-%s" % name, "slycat-csv-parser")
      finish_with_image_columns_names(database, model, image_columns_names)

    stop_event = threading.Event()
    t = threading.Thread(target=checkjob_thread, args=(model["_id"], sid, jid, cherrypy.request.headers.get("x-forwarded-for"), stop_event, callback))
    t.start()

    return json.dumps({"ok":True})

  def finish_with_image_columns_names(database, model, image_columns_names):
    """Called to finish the model.  This function must return immediately, so the actual work is done in a separate thread."""
    thread = threading.Thread(name="Compute Generic Model", target=compute, kwargs={ "mid" : model["_id"], "image_columns_names": image_columns_names })
    thread.start()

  def finish(database, model):
    """Called to finish the model. This function must return immediately, so the actual work is done in a separate thread."""
    thread = threading.Thread(name="Compute Generic Model", target=compute_uploaded_distance, kwargs={"mid" : model["_id"]})
    thread.start()

  def page_html(database, model):
    """Add the HTML representation of the model to the context object."""
    import json
    import pystache

    context = dict()
    context["formatted-model"] = json.dumps(model, indent=2, sort_keys=True)
    context["_id"] = model["_id"];
    context["name"] = model["name"];
    context["full-project"] = database.get("project", model["project"]);
    return pystache.render(open(os.path.join(os.path.dirname(__file__), "ui.html"), "r").read(), context)

  # Register our new model type
  context.register_model("parameter-image-plus", finish)

  context.register_page("parameter-image-plus", page_html)

  # Register JS
  javascripts = [
    "jquery-ui-1.10.4.custom.min.js",
    "jquery.layout-latest.min.js",
    "d3.min.js",
    "jquery.scrollintoview.min.js",
    "jquery.event.drag-2.2.js",
    "slick.core.js",
    "slick.grid.js",
    "slick.rowselectionmodel.js",
    "slick.headerbuttons.js",
    "slick.autotooltips.js",
    "slick.slycateditors.js",
    "chunker.js",
    "login.js",
    "color-switcher.js",
    "parameter-controls.js",
    "parameter-image-table.js",
    "parameter-image-dendrogram.js",
    "parameter-image-scatterplot.js",
    "ui.js",
    #For development and debugging, comment out js here and load it dynamically inside model.
  ]
  context.register_page_bundle("parameter-image-plus", "text/javascript", [
    os.path.join(os.path.join(os.path.dirname(__file__), "js"), js) for js in javascripts
    ])

  # Register CSS
  stylesheets = [
    "jquery-ui-1.10.4.custom.min.css",
    "slick.grid.css",
    "slick-default-theme.css",
    "slick.headerbuttons.css",
    "slick-slycat-theme.css",
    "ui.css"
  ]
  context.register_page_bundle("parameter-image-plus", "text/css", [
    os.path.join(os.path.join(os.path.dirname(__file__), "css"), css) for css in stylesheets
    ])

  # Register images and other resources
  images = [
    "x-gray.png",
    "x-light.png",
    "y-gray.png",
    "y-light.png",
    "sort-asc-light.png",
    "sort-asc-gray.png",
    "sort-desc-light.png",
    "sort-desc-gray.png",
    "image-gray.png",
    "image-light.png",
    "stripe1.png",
    "stripe2.png",
    "pin.png",
    "sort-dendrogram-selected.png",
    "sort-dendrogram.png",
  ]
  for image in images:
    context.register_page_resource("parameter-image-plus", image, os.path.join(os.path.join(os.path.dirname(__file__), "img"), image))

  # Register jquery ui images, which are expected in images folder
  jqimages = [
    "ui-bg_glass_75_e6e6e6_1x400.png",
    "ui-icons_222222_256x240.png",
    "ui-bg_highlight-soft_75_cccccc_1x100.png",
    "ui-bg_flat_75_ffffff_40x100.png",
    "ui-bg_flat_0_aaaaaa_40x100.png",
  ]
  for jqimage in jqimages:
    context.register_page_resource("parameter-image-plus", "images/" + jqimage, os.path.join(os.path.join(os.path.dirname(__file__), "img"), jqimage))

  devs = [
    # "js/parameter-image-dendrogram.js",
    # "js/parameter-image-scatterplot.js",
    # "js/ui.js",
  ]
  for dev in devs:
    context.register_page_resource("parameter-image-plus", dev, os.path.join(os.path.dirname(__file__), dev))

  # Register custom commands for use by wizards.
  context.register_model_command("GET", "parameter-image-plus", "media-columns", media_columns)
  context.register_model_command("POST", "parameter-image-plus", "checkjob", checkjob)
  context.register_model_command("POST", "parameter-image-plus", "finish-with-image-columns-names", finish_with_image_columns_names)

  # Register custom wizards for creating PI models.
  context.register_wizard("parameter-image-plus", "New Parameter Image Model", require={"action":"create", "context":"project"})
  context.register_wizard_resource("parameter-image-plus", "ui.js", os.path.join(os.path.dirname(__file__), "js/wizard-ui.js"))
  context.register_wizard_resource("parameter-image-plus", "ui.html", os.path.join(os.path.dirname(__file__), "wizard-ui.html"))

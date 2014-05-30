import datetime
import numpy
import pickle
import scipy.sparse
import slycat.web.client
import toyplot, toyplot.browser, toyplot.pdf

parser = slycat.web.client.option_parser()
arguments = parser.parse_args()
connection = slycat.web.client.connect(arguments)

project = connection.find_project("cca-performance")
models = connection.get_project_models(project["_id"])

times = []
for model in models:
    try:
        metadata = connection.get_model_array_metadata(model["_id"], "data-table", 0)
        columns = len(metadata["attributes"])
        rows = metadata["dimensions"][0]["end"]
        created = datetime.datetime.strptime(model["created"], "%Y-%m-%dT%H:%M:%S.%f")
        started = datetime.datetime.strptime(model["started"], "%Y-%m-%dT%H:%M:%S.%f")
        finished = datetime.datetime.strptime(model["finished"], "%Y-%m-%dT%H:%M:%S.%f")
        times.append((rows, columns, (started - created).total_seconds(), (finished - started).total_seconds()))
    except:
        pass

times = numpy.array(times, dtype={"names":["rows", "columns", "ingestion", "compute"], "formats":["int64", "int64", "float64", "float64"]})
pickle.dump(times, open("cca-performance.pickle", "w"))


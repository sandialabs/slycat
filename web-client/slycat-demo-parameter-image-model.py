# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy
import slycat.web.client

parser = slycat.web.client.option_parser()
parser.add_argument("--image-count", type=int, default=3, help="Image column count.  Default: %(default)s")
parser.add_argument("--input-count", type=int, default=3, help="Input column count.  Default: %(default)s")
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument("--metadata-count", type=int, default=3, help="Metadata column count.  Default: %(default)s")
parser.add_argument("--model-name", default="Demo Parameter Image Model", help="New model name.  Default: %(default)s")
parser.add_argument("--output-count", type=int, default=3, help="Output column count.  Default: %(default)s")
parser.add_argument("--project-name", default="Demo Parameter Image Project", help="New project name.  Default: %(default)s")
parser.add_argument("--row-count", type=int, default=100, help="Row count.  Default: %(default)s")
parser.add_argument("--seed", type=int, default=12345, help="Random seed.  Default: %(default)s")
parser.add_argument("--unused-count", type=int, default=3, help="Unused column count.  Default: %(default)s")
arguments = parser.parse_args()

# Create some random data ...
numpy.random.seed(arguments.seed)
numeric_data = numpy.random.random((arguments.row_count, arguments.input_count + arguments.output_count + arguments.unused_count))
string_data = numpy.column_stack((numpy.tile("metadata", (arguments.row_count, arguments.metadata_count)), numpy.tile("file://localhost/home/slycat/artwork/logo.jpg", (arguments.row_count, arguments.image_count))))

# Setup a connection to the Slycat Web Server.
connection = slycat.web.client.connect(arguments)

# Create a new project to contain our model.
pid = connection.find_or_create_project(arguments.project_name)

# Create the new, empty model.
mid = connection.create_model(pid, "parameter-image", arguments.model_name, arguments.marking)

# Upload our observations as "data-table".
connection.start_array_set(mid, "data-table")

# Start our single "data-table" array.
attributes = [("n%s" % column, "float64") for column in range(numeric_data.shape[1])] + [("s%s" % column, "string") for column in range(string_data.shape[1])]
dimensions = [("row", "int64", 0, arguments.row_count)]
connection.start_array(mid, "data-table", 0, attributes, dimensions)

# Upload data into the array.
index = 0
for column in numeric_data.T:
  connection.store_array_set_data(mid, "data-table", 0, index, data=column)
  index += 1
for column in string_data.T:
  connection.store_array_set_data(mid, "data-table", 0, index, data=column)
  index += 1

# Store the remaining parameters.
connection.store_parameter(mid, "input-columns", range(arguments.input_count))
connection.store_parameter(mid, "output-columns", range(arguments.input_count, arguments.input_count + arguments.output_count))
connection.store_parameter(mid, "image-columns", range(numeric_data.shape[1] + arguments.metadata_count, numeric_data.shape[1] + arguments.metadata_count + arguments.image_count))

# Signal that we're done uploading data to the model.  This lets Slycat Web
# Server know that it can start computation.
connection.finish_model(mid)
# Wait until the model is ready.
connection.join_model(mid)

# Supply the user with a direct link to the new model.
slycat.web.client.log.info("Your new model is located at %s/models/%s" % (arguments.host, mid))

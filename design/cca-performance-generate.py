import numpy
import slycat.web.client

def create_model(rows, columns, repetition):
  print "Creating model with %s rows, %s columns ..." % (rows, columns)
  numpy.random.seed(1234)

  pid = connection.find_or_create_project("cca-performance-final")
  mid = connection.create_model(pid, "cca", "%s x %s %s" % (rows, columns, repetition + 1), arguments.marking)

  connection.start_array_set(mid, "data-table")
  attributes = [("%s" % column, "float64") for column in numpy.arange(columns)]
  dimensions = [("row", "int64", 0, rows)]
  connection.start_array(mid, "data-table", 0, attributes, dimensions)

  for i in numpy.arange(columns):
    connection.store_array_set_data(mid, "data-table", 0, i, data=numpy.random.normal(size=rows))

  connection.store_parameter(mid, "input-columns", range(0, columns // 2))
  connection.store_parameter(mid, "output-columns", range(columns // 2, columns))
  connection.store_parameter(mid, "scale-inputs", True)

  connection.finish_model(mid)
  connection.join_model(mid)

parser = slycat.web.client.option_parser()
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
arguments = parser.parse_args()
connection = slycat.web.client.connect(arguments)

for columns in [4, 8, 16, 32, 64, 128, 256, 512, 1024]:
  for rows in [10, 100, 1000, 10000, 100000, 1000000]:
    if rows <= columns:
      continue
    if columns == 512 and rows > 100000:
      continue
    if columns == 1024 and rows > 10000:
      continue
    for repetition in range(3):
      create_model(rows, columns, repetition)


import numpy
import slycat.web.client

def create_model(rows, columns, repetition):
  print "Creating model with %s rows, %s columns ..." % (rows, columns)
  numpy.random.seed(1234)

  pid = connection.find_or_create_project("cca-performance-final")
  mid = connection.post_project_models(pid, "cca", "%s x %s %s" % (rows, columns, repetition + 1), arguments.marking)

  connection.put_model_arrayset(mid, "data-table")
  dimensions = [dict(name="row", end=rows)]
  attributes = [dict(name=column, type="float64") for column in numpy.arange(columns)]
  connection.put_model_arrayset_array(mid, "data-table", 0, dimensions, attributes)

  for i in numpy.arange(columns):
    connection.put_model_arrayset_data(mid, "data-table", (0, i, numpy.index_exp[...], numpy.random.normal(size=rows)))

  connection.put_model_parameter(mid, "input-columns", range(0, columns // 2))
  connection.put_model_parameter(mid, "output-columns", range(columns // 2, columns))
  connection.put_model_parameter(mid, "scale-inputs", True)

  connection.post_model_finish(mid)
  connection.join_model(mid)

parser = slycat.web.client.option_parser()
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument("--start-columns", type=int, default=4, help="Start index.  Default: %(default)s")
parser.add_argument("--start-rows", type=int, default=10, help="Start index.  Default: %(default)s")
arguments = parser.parse_args()
connection = slycat.web.client.connect(arguments)

for columns in [4, 8, 16, 32, 64, 128, 256, 512, 1024]:
  for rows in [10, 100, 1000, 10000, 100000, 1000000]:
    if columns < arguments.start_columns or (columns == arguments.start_columns and rows < arguments.start_rows):
      continue
    if rows <= columns:
      continue
    if columns == 512 and rows > 100000:
      continue
    if columns == 1024 and rows > 10000:
      continue
    for repetition in range(3):
      create_model(rows, columns, repetition)


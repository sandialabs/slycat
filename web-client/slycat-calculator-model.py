import slycat.web.client

parser = slycat.web.client.option_parser()
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument("--model-name", default="Calculator Model", help="New model name.  Default: %(default)s")
parser.add_argument("--project-name", default="Calculator Project", help="New project name.  Default: %(default)s")
parser.add_argument("operands", nargs=2, type=float, help="Numeric operands.")
arguments = parser.parse_args()

connection = slycat.web.client.connect(arguments)

pid = connection.find_or_create_project(arguments.project_name)

mid = connection.post_project_models(pid, "calculator", arguments.model_name, arguments.marking)
connection.put_model_parameter(mid, "a", arguments.operands[0])
connection.put_model_parameter(mid, "b", arguments.operands[1])

connection.post_model_finish(mid)
connection.join_model(mid)

slycat.web.client.log.info("Your new model is located at %s/models/%s" % (arguments.host, mid))

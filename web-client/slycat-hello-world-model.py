import slycat.web.client

parser = slycat.web.client.option_parser()
parser.add_argument("--marking", default="", help="Marking type.  Default: %(default)s")
parser.add_argument("--model-name", default="Hello World Model", help="New model name.  Default: %(default)s")
parser.add_argument("--project-name", default="Hello World Project", help="New project name.  Default: %(default)s")
arguments = parser.parse_args()

connection = slycat.web.client.connect(arguments)

pid = connection.find_or_create_project(arguments.project_name)

mid = connection.post_project_models(pid, "hello-world", arguments.model_name, arguments.marking)

connection.post_model_finish(mid)
connection.join_model(mid)

slycat.web.client.log.info("Your new model is located at %s/models/%s" % (arguments.host, mid))

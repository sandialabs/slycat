def bar(connection):
  """Prints bar."""
  print "bar"

def register_client_plugin(context):
  context.add_operator("bar", bar)

def foo(connection):
  """Prints foo."""
  print "foo"

def register_client_plugin(context):
  context.add_operator("foo", foo)

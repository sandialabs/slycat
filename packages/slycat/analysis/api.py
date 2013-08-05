class InvalidArgument(Exception):
  """Exception thrown when the public API is called with invalid arguments."""
  def __init__(self, message):
    Exception.__init__(self, message)

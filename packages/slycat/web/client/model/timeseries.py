from slycat.web.client import log

class serial(object):
  """Computes a timeseries model in serial using template method design pattern."""
  def run(self):
    self.log_info("foo")
    self.log_info("bar")

  def log_info(self, message):
    """Log an informational message using the client library logger.

    Reimplement this method in derived classes to substitute a different
    logging mechanism.
    """
    log.info(message)


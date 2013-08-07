def register_client_plugin(context):
  import slycat.analysis.client
  def test(connection, message="test"):
    slycat.analysis.client.log.info(message)
    connection.proxy.call_plugin_function("test", message)
  context.register_plugin_function("test", test)

def register_coordinator_plugin(context):
  import slycat.analysis.coordinator
  def test(factory, message):
    slycat.analysis.coordinator.log.info(message)
    for worker in factory.workers():
      worker.call_plugin_function("test", message)
  context.register_plugin_function("test", test)

def register_worker_plugin(context):
  import slycat.analysis.worker
  def test(factory, message):
    slycat.analysis.worker.log.info(message)
  context.register_plugin_function("test", test)

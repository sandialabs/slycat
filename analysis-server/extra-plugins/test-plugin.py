def register_client_plugin(context):
  import slycat.analysis.client
  def test(connection, message="test"):
    slycat.analysis.client.log.debug(message)
    connection.proxy.call_operator("test", message)
  context.add_operator("test", test)

def register_coordinator_plugin(context):
  import slycat.analysis.coordinator
  def test(factory, message):
    slycat.analysis.coordinator.log.debug(message)
    for worker in factory.workers():
      worker.call_operator("test", message)
  context.add_operator("test", test)

def register_worker_plugin(context):
  import slycat.analysis.worker
  def test(factory, message):
    slycat.analysis.worker.log.debug(message)
  context.add_operator("test", test)

def register_slycat_plugin(context):
  def finalize(mid):
    print "finalizing generic model %s!" % mid
  context.register_model("generic", finalize)

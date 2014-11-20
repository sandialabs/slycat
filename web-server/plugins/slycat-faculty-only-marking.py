def register_slycat_plugin(context):
  badge = """<div style="background:white; border-radius:2px; border:1px solid black; color:red; font-weight:bold; padding:5px; text-align:center;">FACULTY ONLY</div>"""
  page = """<div style="display:-webkit-flex;display:flex;-webkit-flex-direction:column;flex-direction:column;background:white; border-top:2px solid black; border-bottom:2px solid black; color:red; font-weight:bold; padding:5px; text-align:center;">FACULTY ONLY</div>"""

  context.register_marking("faculty", "Faculty Only", badge, page, page)


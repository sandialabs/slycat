# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
  page = """<div style="display:-webkit-flex;display:flex;-webkit-flex-direction:column;flex-direction:column;background:white; border-top:2px solid black; border-bottom:2px solid black; color:black; font-weight:bold; padding:5px; text-align:center;">Markings Not Applied</div>"""
  badge = """<div style="background:white; border:1px solid black; color:black; font-weight:bold; padding:5px; text-align:center;">Markings Not Applied</div>"""

  context.register_marking("mna", "Markings Not Applied", badge, page, page)


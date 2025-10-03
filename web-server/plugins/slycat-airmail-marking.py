# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

def register_slycat_plugin(context):
  badge = """
    <div style="
      border: 1px solid black; 
      border-radius: 2px; 
      background: repeating-linear-gradient(135deg, blue, blue 12.5%, white 12.5%, white 25%, red 25%, red 37.5%, white 37.5%, white 50%) top left fixed; 
      background-size: 30px 30px; 
      padding:3px;
    ">
      <div style="
        padding: 3px; 
        border-radius: 2px; 
        background: ivory; 
        color: #1234ff; 
        font-size: 9px; 
        font-weight: bold; 
        text-align: center;
      ">
        <span>AIR MAIL</span>
        <br>
        <span style="font-weight:normal;">PAR AVION</span>
      </div>
    </div>
  """

  page_begin = """
    <div style="
      flex:1;
      display:flex;
      flex-direction:column;
      background: repeating-linear-gradient(135deg, blue, blue 12.5%, white 12.5%, white 25%, red 25%, red 37.5%, white 37.5%, white 50%) top left fixed; 
      background-size: 80px 80px; padding:5px;
    ">
      <div style="
        flex:1;
        display:flex;
        flex-direction:column;
        background: #f2f2f2
      ">
  """

  page_end = """</div></div>"""

  context.register_marking("airmail", "Airmail", badge, page_begin, page_end)


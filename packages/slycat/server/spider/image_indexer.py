# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import sys

def index(**keywords):
  path = keywords["path"]
  content = keywords["content"]
  progress = keywords["progress"]

  try:
    import base64

    try:
      import Image
    except:
      from PIL import Image

    progress.write("Indexing image data.")

    try:
      import cStringIO as StringIO
    except:
      import StringIO

    if path is not None:
      image = Image.open(path)
    elif content is not None:
      image = Image.open(StringIO.StringIO(content))

    perspective = {}
    perspective["type"] = "image"
    perspective["width"] = image.size[0]
    perspective["height"] = image.size[1]

    buffer = StringIO.StringIO()
    preview = image.copy()
    preview.thumbnail((1280, 1024), Image.ANTIALIAS)
    preview.save(buffer, "jpeg")

    perspective["preview:jpeg"] = {
      "width" : preview.size[0],
      "height" : preview.size[1],
      "content" : base64.b64encode(buffer.getvalue())
      }

    yield perspective

  except Exception:
    import traceback
    progress.write(traceback.format_exc(), 1)

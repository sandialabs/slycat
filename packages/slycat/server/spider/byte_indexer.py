# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import os
import sys

from . import blocks

def index(**keywords):
  """Perspective generator that creates "byte" (lowest-common-denominator blob)
  perspectives."""

  path = keywords["path"]
  content = keywords["content"]
  progress = keywords["progress"]

  progress.write("Indexing byte data.")

  perspective = {}
  perspective["type"] = "bytes"

  if path is not None:
    perspective["content-length"] = os.stat(path).st_size

  if content is not None:
    perspective["content-length"] = len(content)

  try:
    import hashlib

    if path is not None:
      md5 = hashlib.md5()
      sha1 = hashlib.sha1()
      for block in blocks.read(open(path, "rb")):
        md5.update(block)
        sha1.update(block)
      perspective["md5-hash"] = md5.hexdigest()
      perspective["sha1-hash"] = sha1.hexdigest()

    if content is not None:
      perspective["md5-hash"] = hashlib.md5(content).hexdigest()
      perspective["sha1-hash"] = hashlib.sha1(content).hexdigest()

  except Exception, e:
    import traceback
    progress.write(traceback.format_exc(), 1)

  yield perspective


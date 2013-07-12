# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import datetime
import os
import sys

def index(**keywords):
  path = keywords["path"]
  content = keywords["content"]
  progress = keywords["progress"]

  progress.write("Indexing file data.")

  if path is not None:
    host = keywords["host"]
    if host is None:
      import platform
      host = platform.node()
    stat = os.stat(path)

    perspective = {}
    perspective["type"] = "file"
    perspective["uri"] = "file://%s%s" % (host, path)
    perspective["ctime"] = datetime.datetime.utcfromtimestamp(stat.st_ctime).isoformat() + "Z"
    perspective["mtime"] = datetime.datetime.utcfromtimestamp(stat.st_mtime).isoformat() + "Z"

    yield perspective

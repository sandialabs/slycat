# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import os
import sys
import uuid

def index(**keywords):
  content = keywords["content"]
  filename = keywords["filename"]
  path = keywords["path"]
  progress = keywords["progress"]

  progress.write("Indexing names.")

  if path is not None:
    perspective = {}
    perspective["type"] = "name"
    perspective["name"] = os.path.basename(path)
    yield perspective

  elif filename is not None:
    perspective = {}
    perspective["type"] = "name"
    perspective["name"] = filename
    yield perspective
